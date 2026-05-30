/**
 * AioSell Verification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for "is this property/mapping healthy?".
 *
 * Designed to power:
 *   • Channel Manager → Room Mapping tab (inline status badges)
 *   • /api/aiosell/verify endpoint
 *   • Future: Verify Property button, AI Auditor, Inventory Doctor, Mapping Doctor
 *
 * A room mapping is Connected (GREEN) only when ALL 5 checks pass:
 *   1. Mapping row exists in aiosell_room_mappings
 *   2. AioSell room code is non-empty / non-whitespace
 *   3. At least one inventory push has ever been sent (property level)
 *   4. The most recent inventory push succeeded (status="success")
 *   5. That successful push happened within the last 24 hours
 *
 * Status rules:
 *   DISCONNECTED (RED)   — check 1 or 2 fails (structural gap, can't even push)
 *   PARTIAL      (YELLOW)— checks 1+2 pass but any of 3/4/5 fail
 *   CONNECTED    (GREEN) — all 5 pass
 *
 * Note on push granularity: AioSell inventory pushes are property-wide batches.
 * aiosell_sync_logs has one row per push attempt keyed to configId (= property).
 * We therefore evaluate checks 3–5 at the property level and apply them uniformly
 * to all mappings under that config. Per-room-code push verification is a future
 * enhancement (requires parsing request_payload JSON).
 */

import { db } from "./db";
import {
  properties,
  rooms,
  aiosellConfigurations,
  aiosellRoomMappings,
  aiosellRatePlans,
  aiosellSyncLogs,
  aiosellAuditReports,
} from "@shared/schema";
import { and, eq, inArray, desc, gte } from "drizzle-orm";
import { testConnection } from "./aiosell";

// ─── Public types ──────────────────────────────────────────────────────────────

export type ConnectionStatus = "connected" | "partial" | "disconnected";
export type CheckStatus = "pass" | "fail";

export interface Check {
  name: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface MappingVerification {
  mappingId: number;
  hostezeeRoomType: string;
  aiosellRoomCode: string;
  aiosellRoomId: string | null;
  ratePlanCount: number;

  checks: {
    mappingExists:    Check;
    roomCodeValid:    Check;
    everPushed:       Check;
    lastPushSucceeded: Check;
    pushedWithin24h:  Check;
  };

  lastInventoryPush: {
    at: string;
    status: string;
    errorMessage: string | null;
    hoursSince: number;
  } | null;

  connectionStatus: ConnectionStatus;
  statusLabel: "Connected" | "Partially Connected" | "Not Connected";
  failedChecks: string[];
}

export interface PropertyVerification {
  propertyId: number;
  propertyName: string;
  hotelCode: string | null;
  aiosellConfigured: boolean;
  configId: number | null;

  mappings: MappingVerification[];

  summary: {
    totalMappings: number;
    connected: number;
    partial: number;
    disconnected: number;
    lastSuccessfulPushAt: string | null;
    hoursSinceLastPush: number | null;
  };

  overallStatus: ConnectionStatus;
  generatedAt: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const HOURS_24_MS = 24 * 60 * 60 * 1000;

function roundHours(ms: number): number {
  return Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
}

function statusLabel(s: ConnectionStatus): MappingVerification["statusLabel"] {
  if (s === "connected")    return "Connected";
  if (s === "partial")      return "Partially Connected";
  return "Not Connected";
}

function deriveStatus(checks: MappingVerification["checks"]): ConnectionStatus {
  if (checks.mappingExists.status === "fail" || checks.roomCodeValid.status === "fail") {
    return "disconnected";
  }
  if (
    checks.everPushed.status       === "pass" &&
    checks.lastPushSucceeded.status === "pass" &&
    checks.pushedWithin24h.status  === "pass"
  ) {
    return "connected";
  }
  return "partial";
}

// ─── Core engine ─────────────────────────────────────────────────────────────

export async function verifyProperties(propIds: number[]): Promise<PropertyVerification[]> {
  if (propIds.length === 0) return [];

  const now = new Date();

  const [allProps, allConfigs, allMappings, allRatePlans, invLogs] = await Promise.all([
    db.select().from(properties).where(inArray(properties.id, propIds)),
    db.select().from(aiosellConfigurations).where(
      and(
        inArray(aiosellConfigurations.propertyId, propIds),
        eq(aiosellConfigurations.isActive, true),
      ),
    ),
    db.select().from(aiosellRoomMappings).where(
      inArray(aiosellRoomMappings.propertyId, propIds),
    ),
    db.select().from(aiosellRatePlans).where(
      inArray(aiosellRatePlans.propertyId, propIds),
    ),
    db.select().from(aiosellSyncLogs).where(
      and(
        inArray(aiosellSyncLogs.propertyId, propIds),
        eq(aiosellSyncLogs.syncType, "inventory_push"),
      ),
    ).orderBy(desc(aiosellSyncLogs.createdAt)).limit(600),
  ]);

  const propMap    = new Map(allProps.map(p => [p.id, p]));
  const configByProp = new Map(allConfigs.map(c => [c.propertyId, c]));

  return propIds.map(propId => {
    const prop        = propMap.get(propId);
    const config      = configByProp.get(propId) || null;
    const propMappings = allMappings.filter(m => m.propertyId === propId);
    const propLogs    = invLogs.filter(l => l.propertyId === propId);

    // Property-level push health (shared across all mappings — pushes are batched)
    const lastSuccessLog = propLogs.find(l => l.status === "success") || null;
    const lastAnyLog     = propLogs[0] || null; // desc order → most recent

    const lastSuccessAt = lastSuccessLog?.createdAt ? new Date(lastSuccessLog.createdAt) : null;
    const hoursSinceLastSuccess = lastSuccessAt
      ? roundHours(now.getTime() - lastSuccessAt.getTime())
      : null;
    const within24h = lastSuccessAt !== null &&
      (now.getTime() - lastSuccessAt.getTime()) < HOURS_24_MS;

    // Build per-mapping verifications
    const mappingVerifications: MappingVerification[] = propMappings.map(mapping => {
      const ratePlansForMapping = allRatePlans.filter(rp => rp.roomMappingId === mapping.id);
      const codeValue = mapping.aiosellRoomCode?.trim() || "";

      // ── Check 1: Mapping exists ─────────────────────────────────────────────
      const check1: Check = {
        name: "mappingExists",
        label: "Mapping Exists",
        status: "pass",
        detail: `Mapping for "${mapping.hostezeeRoomType}" found in database`,
      };

      // ── Check 2: Room code valid ────────────────────────────────────────────
      const check2: Check = {
        name: "roomCodeValid",
        label: "Room Code Valid",
        status: codeValue.length > 0 ? "pass" : "fail",
        detail: codeValue.length > 0
          ? `AioSell room code is "${codeValue}"`
          : `Room code is empty — inventory push will fail silently`,
      };

      // ── Check 3: Ever pushed ────────────────────────────────────────────────
      const check3: Check = {
        name: "everPushed",
        label: "Ever Pushed",
        status: propLogs.length > 0 ? "pass" : "fail",
        detail: propLogs.length > 0
          ? `${propLogs.length} push attempt(s) recorded for this property`
          : `No inventory push has ever been sent to AioSell for this property`,
      };

      // ── Check 4: Last push succeeded ───────────────────────────────────────
      const check4: Check = {
        name: "lastPushSucceeded",
        label: "Last Push Succeeded",
        status: lastSuccessLog !== null ? "pass" : "fail",
        detail: lastSuccessLog?.createdAt
          ? `Last successful push: ${new Date(lastSuccessLog.createdAt).toLocaleString()}`
          : lastAnyLog?.errorMessage
            ? `Last push failed: ${lastAnyLog.errorMessage}`
            : lastAnyLog
              ? `Last push status: ${lastAnyLog.status}`
              : `No push logs found`,
      };

      // ── Check 5: Pushed within 24h ──────────────────────────────────────────
      const check5: Check = {
        name: "pushedWithin24h",
        label: "Pushed Within 24h",
        status: within24h ? "pass" : "fail",
        detail: within24h
          ? `Last successful push was ${hoursSinceLastSuccess}h ago`
          : lastSuccessAt
            ? `Last successful push was ${hoursSinceLastSuccess}h ago (must be < 24h)`
            : `No successful push on record`,
      };

      const checks: MappingVerification["checks"] = {
        mappingExists:     check1,
        roomCodeValid:     check2,
        everPushed:        check3,
        lastPushSucceeded: check4,
        pushedWithin24h:   check5,
      };

      const connStatus = deriveStatus(checks);
      const failedChecks = Object.values(checks)
        .filter(c => c.status === "fail")
        .map(c => c.label);

      // Last push entry for display (prefer last success, fall back to last any)
      const displayLog = lastAnyLog;
      const displayLogAt = displayLog?.createdAt ? new Date(displayLog.createdAt) : null;

      return {
        mappingId:       mapping.id,
        hostezeeRoomType: mapping.hostezeeRoomType,
        aiosellRoomCode:  mapping.aiosellRoomCode,
        aiosellRoomId:    mapping.aiosellRoomId || null,
        ratePlanCount:    ratePlansForMapping.length,
        checks,
        lastInventoryPush: displayLogAt ? {
          at:           displayLogAt.toISOString(),
          status:       displayLog!.status,
          errorMessage: displayLog!.errorMessage || null,
          hoursSince:   roundHours(now.getTime() - displayLogAt.getTime()),
        } : null,
        connectionStatus: connStatus,
        statusLabel:      statusLabel(connStatus),
        failedChecks,
      };
    });

    // Summary
    const connected    = mappingVerifications.filter(m => m.connectionStatus === "connected").length;
    const partial      = mappingVerifications.filter(m => m.connectionStatus === "partial").length;
    const disconnected = mappingVerifications.filter(m => m.connectionStatus === "disconnected").length;

    // Overall: worst-case across all mappings (no mappings = disconnected)
    let overallStatus: ConnectionStatus;
    if (!config || mappingVerifications.length === 0) {
      overallStatus = "disconnected";
    } else if (disconnected > 0) {
      overallStatus = "disconnected";
    } else if (partial > 0) {
      overallStatus = "partial";
    } else {
      overallStatus = "connected";
    }

    return {
      propertyId:       propId,
      propertyName:     prop?.name || "Unknown",
      hotelCode:        config?.hotelCode || null,
      aiosellConfigured: !!config,
      configId:          config?.id || null,
      mappings:          mappingVerifications,
      summary: {
        totalMappings:        mappingVerifications.length,
        connected,
        partial,
        disconnected,
        lastSuccessfulPushAt: lastSuccessAt?.toISOString() || null,
        hoursSinceLastPush:   hoursSinceLastSuccess,
      },
      overallStatus,
      generatedAt: now.toISOString(),
    };
  });
}

export async function verifyProperty(propertyId: number): Promise<PropertyVerification> {
  const results = await verifyProperties([propertyId]);
  return results[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Audit Engine ─────────────────────────────────────────────────────────────
// Powers: Verify Property button, AI Auditor, Inventory Doctor, Mapping Doctor
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditCheck {
  label: string;
  value: string | number | boolean | null;
  status: "pass" | "warn" | "fail" | "info";
  detail: string;
}

export interface AuditSection {
  name: string;
  key: string;
  status: "healthy" | "attention" | "critical";
  score: number;
  maxScore: number;
  checks: AuditCheck[];
}

export type AuditOverallStatus = "healthy" | "attention" | "critical";

export interface AuditReport {
  id?: number;
  propertyId: number;
  propertyName: string;
  hotelCode: string | null;
  generatedAt: string;
  durationMs: number;
  healthScore: number;
  overallStatus: AuditOverallStatus;
  sections: AuditSection[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

export async function auditProperty(
  propertyId: number,
  opts: { runLiveTest?: boolean } = { runLiveTest: true },
): Promise<AuditReport> {
  const startTime = Date.now();
  const now = new Date();
  const HOURS_24_MS = 24 * 60 * 60 * 1000;
  const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - DAYS_7_MS);

  // ── Fetch everything in parallel ────────────────────────────────────────────
  const [propRows, configRows, allRooms, allMappings, allRatePlans, allLogs7d, allLogsAny] =
    await Promise.all([
      db.select().from(properties).where(eq(properties.id, propertyId)),
      db.select().from(aiosellConfigurations).where(
        and(eq(aiosellConfigurations.propertyId, propertyId), eq(aiosellConfigurations.isActive, true)),
      ),
      db.select().from(rooms).where(eq(rooms.propertyId, propertyId)),
      db.select().from(aiosellRoomMappings).where(eq(aiosellRoomMappings.propertyId, propertyId)),
      db.select().from(aiosellRatePlans).where(eq(aiosellRatePlans.propertyId, propertyId)),
      db.select().from(aiosellSyncLogs).where(
        and(eq(aiosellSyncLogs.propertyId, propertyId), gte(aiosellSyncLogs.createdAt, sevenDaysAgo)),
      ).orderBy(desc(aiosellSyncLogs.createdAt)),
      db.select().from(aiosellSyncLogs).where(
        eq(aiosellSyncLogs.propertyId, propertyId),
      ).orderBy(desc(aiosellSyncLogs.createdAt)).limit(100),
    ]);

  const prop   = propRows[0]   || null;
  const config = configRows[0] || null;

  const invLogsAny   = allLogsAny.filter(l => l.syncType === "inventory_push");
  const invLogs7d    = allLogs7d.filter(l => l.syncType === "inventory_push");
  const inboundLogs7d = allLogs7d.filter(l => l.direction === "inbound");

  const lastSuccessInv = invLogsAny.find(l => l.status === "success") || null;
  const lastSuccessAt  = lastSuccessInv?.createdAt ? new Date(lastSuccessInv.createdAt) : null;
  const within24h      = lastSuccessAt !== null && (now.getTime() - lastSuccessAt.getTime()) < HOURS_24_MS;
  const hoursSince     = lastSuccessAt ? roundHours(now.getTime() - lastSuccessAt.getTime()) : null;
  const everPushed     = invLogsAny.length > 0;

  const dormRooms        = allRooms.filter(r => r.roomCategory === "dormitory");
  const dormMissingBeds  = dormRooms.filter(r => !r.totalBeds || r.totalBeds <= 0);
  const invalidCodeMappings = allMappings.filter(m => !m.aiosellRoomCode?.trim());
  const mappingsWithRates   = allMappings.filter(m => allRatePlans.some(rp => rp.roomMappingId === m.id));
  const mappingsWithoutRates = allMappings.filter(m => !allRatePlans.some(rp => rp.roomMappingId === m.id));
  const lastRateLog  = allLogsAny.find(l => l.syncType === "rate_push") || null;
  const lastRateOkLog = allLogsAny.find(l => l.syncType === "rate_push" && l.status === "success") || null;

  // ── Section 1: Configuration (20 pts) ───────────────────────────────────────
  let s1Score = 0;
  const s1Checks: AuditCheck[] = [];

  if (!config) {
    s1Checks.push({ label: "AioSell Configuration", value: null, status: "fail",
      detail: "No active AioSell configuration — property not connected to any OTA" });
  } else {
    const hotelOk = !!config.hotelCode?.trim();
    s1Checks.push({ label: "Hotel Code", value: config.hotelCode || null,
      status: hotelOk ? "pass" : "fail",
      detail: hotelOk ? `Hotel code "${config.hotelCode}"` : "Hotel code is empty — cannot identify property in AioSell" });
    if (hotelOk) s1Score += 6;

    const pmsOk = !!config.pmsName?.trim();
    s1Checks.push({ label: "PMS Name", value: config.pmsName || null,
      status: pmsOk ? "pass" : "fail",
      detail: pmsOk ? `PMS name "${config.pmsName}"` : "PMS name is missing" });
    if (pmsOk) s1Score += 4;

    const passOk = !!config.pmsPassword;
    s1Checks.push({ label: "PMS Password", value: passOk ? "●●●●●●●●" : null,
      status: passOk ? "pass" : "fail",
      detail: passOk ? "Password is set" : "PMS password not set — authentication will fail on all API calls" });
    if (passOk) s1Score += 5;

    const urlOk = !!config.apiBaseUrl?.startsWith("https://");
    s1Checks.push({ label: "API Base URL", value: config.apiBaseUrl || null,
      status: urlOk ? "pass" : "fail",
      detail: urlOk ? `Using ${config.apiBaseUrl}` : "API URL is missing or not HTTPS" });
    if (urlOk) s1Score += 5;
  }

  const section1: AuditSection = {
    name: "Property Configuration", key: "configuration",
    status: s1Score >= 16 ? "healthy" : s1Score >= 8 ? "attention" : "critical",
    score: s1Score, maxScore: 20, checks: s1Checks,
  };

  // ── Section 2: Room Mapping (20 pts) ────────────────────────────────────────
  let s2Score = 0;
  const s2Checks: AuditCheck[] = [
    { label: "Total Rooms", value: allRooms.length, status: "info",
      detail: `Property has ${allRooms.length} room${allRooms.length !== 1 ? "s" : ""}` },
    { label: "Mapped Rooms", value: `${allMappings.length} mapping${allMappings.length !== 1 ? "s" : ""}`,
      status: allMappings.length > 0 ? "pass" : "fail",
      detail: allMappings.length > 0
        ? `${allMappings.length} room type${allMappings.length !== 1 ? "s" : ""} mapped to AioSell codes`
        : "No room mappings — inventory cannot be pushed" },
    { label: "Invalid Room Codes", value: invalidCodeMappings.length,
      status: invalidCodeMappings.length === 0 ? "pass" : "fail",
      detail: invalidCodeMappings.length === 0
        ? "All room codes are set"
        : `Empty codes: ${invalidCodeMappings.map(m => m.hostezeeRoomType).join(", ")}` },
    { label: "Dormitory Rooms", value: dormRooms.length > 0 ? `${dormRooms.length} rooms` : "None",
      status: dormRooms.length === 0 ? "info" : dormMissingBeds.length === 0 ? "pass" : "warn",
      detail: dormRooms.length === 0 ? "No dormitory rooms"
        : dormMissingBeds.length === 0 ? `All ${dormRooms.length} dorm rooms have totalBeds set`
          : `${dormMissingBeds.length} dorm room${dormMissingBeds.length !== 1 ? "s" : ""} missing totalBeds: ${dormMissingBeds.map(r => r.roomNumber).join(", ")}` },
  ];
  if (allMappings.length > 0) s2Score += 12;
  if (invalidCodeMappings.length === 0 && allMappings.length > 0) s2Score += 8;

  const section2: AuditSection = {
    name: "Room Mapping", key: "roomMapping",
    status: s2Score >= 16 ? "healthy" : s2Score >= 8 ? "attention" : "critical",
    score: s2Score, maxScore: 20, checks: s2Checks,
  };

  // ── Section 3: Inventory Sync (20 pts) ──────────────────────────────────────
  let s3Score = 0;
  const failedInv7d = invLogs7d.filter(l => l.status !== "success");
  const lastAnyInv  = invLogsAny[0] || null;

  const s3Checks: AuditCheck[] = [
    { label: "Last Inventory Push",
      value: lastAnyInv?.createdAt ? new Date(lastAnyInv.createdAt).toLocaleString() : "Never",
      status: lastAnyInv ? (lastAnyInv.status === "success" ? "pass" : "warn") : "fail",
      detail: lastAnyInv
        ? `Status: ${lastAnyInv.status}${lastAnyInv.errorMessage ? ` — ${lastAnyInv.errorMessage}` : ""}`
        : "No inventory push has ever been sent" },
    { label: "Last Successful Push", value: lastSuccessAt ? `${hoursSince}h ago` : "Never",
      status: lastSuccessInv ? (within24h ? "pass" : "warn") : "fail",
      detail: lastSuccessAt ? `${new Date(lastSuccessAt).toLocaleString()} (${hoursSince}h ago)`
        : "No successful inventory push on record" },
    { label: "Push Frequency", value: within24h ? "Recent" : lastSuccessAt ? "Stale" : "Never",
      status: within24h ? "pass" : lastSuccessAt ? "warn" : "fail",
      detail: within24h ? `Last push ${hoursSince}h ago — within 24h threshold`
        : lastSuccessAt ? `Last push was ${hoursSince}h ago — stale (threshold: 24h)`
          : "Inventory has never been pushed" },
    { label: "Failed Pushes (7 days)", value: failedInv7d.length,
      status: failedInv7d.length === 0 ? "pass" : failedInv7d.length <= 3 ? "warn" : "fail",
      detail: failedInv7d.length === 0 ? "No failed inventory pushes in last 7 days"
        : `${failedInv7d.length} failed push${failedInv7d.length !== 1 ? "es" : ""} in last 7 days` },
  ];
  if (dormRooms.length > 0) {
    s3Checks.push({ label: "Dormitory Inventory Logic",
      value: dormMissingBeds.length === 0 ? "Valid" : "Issues",
      status: dormMissingBeds.length === 0 ? "pass" : "warn",
      detail: dormMissingBeds.length === 0
        ? "Dorm availability calculates correctly from totalBeds per room"
        : `${dormMissingBeds.length} dorm room${dormMissingBeds.length !== 1 ? "s" : ""} missing totalBeds — availability calculation incorrect` });
  }

  if (everPushed) s3Score += 4;
  if (lastSuccessInv) s3Score += 6;
  if (within24h) s3Score += 6;
  if (dormRooms.length === 0 || dormMissingBeds.length === 0) s3Score += 4;

  const section3: AuditSection = {
    name: "Inventory Sync", key: "inventorySync",
    status: s3Score >= 16 ? "healthy" : s3Score >= 8 ? "attention" : "critical",
    score: s3Score, maxScore: 20, checks: s3Checks,
  };

  // ── Section 4: Rate Plans (15 pts) ──────────────────────────────────────────
  let s4Score = 0;
  const s4Checks: AuditCheck[] = [
    { label: "Rate Plans Configured", value: allRatePlans.length,
      status: allRatePlans.length > 0 ? "pass" : "fail",
      detail: allRatePlans.length > 0
        ? `${allRatePlans.length} rate plan${allRatePlans.length !== 1 ? "s" : ""} across ${mappingsWithRates.length} room type${mappingsWithRates.length !== 1 ? "s" : ""}`
        : "No rate plans — OTA rates will never be updated" },
    { label: "Missing Rate Plans", value: mappingsWithoutRates.length,
      status: mappingsWithoutRates.length === 0 && allMappings.length > 0 ? "pass"
        : mappingsWithRates.length > 0 ? "warn" : "fail",
      detail: mappingsWithoutRates.length === 0
        ? allMappings.length > 0 ? "All room types have at least one rate plan" : "No room mappings yet"
        : `No rate plans for: ${mappingsWithoutRates.map(m => m.hostezeeRoomType).join(", ")}` },
    { label: "Last Rate Push",
      value: lastRateLog?.createdAt ? new Date(lastRateLog.createdAt).toLocaleString() : "Never",
      status: lastRateOkLog ? "pass" : lastRateLog ? "warn" : "fail",
      detail: lastRateOkLog ? `Last successful: ${new Date((lastRateOkLog as any).createdAt!).toLocaleString()}`
        : lastRateLog ? `Last push failed: ${lastRateLog.errorMessage || "unknown"}`
          : "Rates have never been pushed to AioSell" },
  ];
  if (allRatePlans.length > 0) s4Score += 5;
  if (mappingsWithoutRates.length === 0 && allMappings.length > 0) s4Score += 10;
  else if (mappingsWithRates.length > 0) s4Score += 5;

  const section4: AuditSection = {
    name: "Rate Plans", key: "ratePlans",
    status: s4Score >= 12 ? "healthy" : s4Score >= 5 ? "attention" : "critical",
    score: s4Score, maxScore: 15, checks: s4Checks,
  };

  // ── Section 5: Sync Logs (15 pts) ───────────────────────────────────────────
  let s5Score = 0;
  const totalLogs7d  = allLogs7d.length;
  const failedLogs7d = allLogs7d.filter(l => l.status !== "success");
  const errorRate    = totalLogs7d > 0 ? failedLogs7d.length / totalLogs7d : 0;
  const recentFails  = allLogs7d.filter(l =>
    l.status !== "success" && l.createdAt && (now.getTime() - new Date(l.createdAt).getTime()) < HOURS_24_MS,
  );
  const lastSuccessAny = allLogsAny.find(l => l.status === "success") || null;
  const recentErrors   = failedLogs7d.slice(0, 20);

  const s5Checks: AuditCheck[] = [
    { label: "Total Syncs (7 days)", value: totalLogs7d, status: "info",
      detail: `${totalLogs7d} sync attempt${totalLogs7d !== 1 ? "s" : ""} in last 7 days` },
    { label: "Error Rate (7 days)", value: `${Math.round(errorRate * 100)}%`,
      status: errorRate < 0.1 ? "pass" : errorRate < 0.25 ? "warn" : "fail",
      detail: totalLogs7d === 0 ? "No sync activity in last 7 days"
        : `${failedLogs7d.length} of ${totalLogs7d} syncs failed` },
    { label: "Recent Failures (24h)", value: recentFails.length,
      status: recentFails.length === 0 ? "pass" : recentFails.length <= 2 ? "warn" : "fail",
      detail: recentFails.length === 0 ? "No failures in last 24 hours"
        : `${recentFails.length} failure${recentFails.length !== 1 ? "s" : ""} in last 24h` },
    { label: "Last Successful Sync",
      value: lastSuccessAny?.createdAt ? new Date(lastSuccessAny.createdAt).toLocaleString() : "Never",
      status: lastSuccessAny ? "pass" : "fail",
      detail: lastSuccessAny?.createdAt
        ? `${new Date(lastSuccessAny.createdAt).toLocaleString()} (${lastSuccessAny.syncType})`
        : "No successful syncs on record" },
  ];
  if (recentErrors.length > 0) {
    s5Checks.push({ label: `Last ${recentErrors.length} Error${recentErrors.length !== 1 ? "s" : ""}`,
      value: recentErrors.length, status: "info",
      detail: recentErrors.map(l =>
        `[${new Date(l.createdAt!).toLocaleString()}] ${l.syncType}: ${l.errorMessage || l.status}`
      ).join(" | ") });
  }
  if (errorRate < 0.1) s5Score += 8;
  else if (errorRate < 0.25) s5Score += 4;
  if (recentFails.length === 0) s5Score += 7;
  else if (recentFails.length <= 2) s5Score += 3;

  const section5: AuditSection = {
    name: "Sync Logs", key: "syncLogs",
    status: s5Score >= 12 ? "healthy" : s5Score >= 6 ? "attention" : "critical",
    score: s5Score, maxScore: 15, checks: s5Checks,
  };

  // ── Section 6: OTA Status (10 pts) ──────────────────────────────────────────
  let s6Score = 0;
  let liveTestResult: { success: boolean; message?: string } | null = null;

  if (config && opts.runLiveTest !== false) {
    try {
      liveTestResult = await Promise.race([
        testConnection(config as any).then(r => ({ success: r.success, message: r.message })),
        new Promise<{ success: false; message: string }>(resolve =>
          setTimeout(() => resolve({ success: false, message: "Connection test timed out (10s)" }), 10000),
        ),
      ]);
    } catch (e: any) {
      liveTestResult = { success: false, message: e.message };
    }
  }

  const recentWebhooks = inboundLogs7d.filter(l => l.syncType?.startsWith("reservation_"));
  const s6Checks: AuditCheck[] = [
    { label: "AioSell Connectivity",
      value: liveTestResult === null ? "Skipped" : liveTestResult.success ? "Live" : "Failed",
      status: liveTestResult === null ? "info" : liveTestResult.success ? "pass" : "fail",
      detail: liveTestResult === null ? "Live connection test skipped (no config)"
        : liveTestResult.success ? "AioSell API reachable — credentials valid"
          : `Connection failed: ${liveTestResult.message || "unknown error"}` },
    { label: "Booking Import Status",
      value: recentWebhooks.length > 0 ? `${recentWebhooks.length} in 7d` : "No activity",
      status: recentWebhooks.length > 0 ? "pass" : "info",
      detail: recentWebhooks.length > 0
        ? `${recentWebhooks.length} OTA reservation webhook${recentWebhooks.length !== 1 ? "s" : ""} received in last 7 days`
        : "No OTA webhooks in last 7 days — normal if no bookings arrived" },
  ];
  if (liveTestResult?.success) s6Score += 7;
  if (recentWebhooks.length > 0) s6Score += 3;

  const section6: AuditSection = {
    name: "OTA Status", key: "otaStatus",
    status: s6Score >= 8 ? "healthy" : s6Score >= 4 ? "attention" : "critical",
    score: s6Score, maxScore: 10, checks: s6Checks,
  };

  // ── Score + Issues ──────────────────────────────────────────────────────────
  const sections   = [section1, section2, section3, section4, section5, section6];
  const totalScore = sections.reduce((s, sec) => s + sec.score, 0);
  const maxTotal   = sections.reduce((s, sec) => s + sec.maxScore, 0);
  const healthScore  = Math.round((totalScore / maxTotal) * 100);
  const overallStatus: AuditOverallStatus = healthScore >= 80 ? "healthy" : healthScore >= 50 ? "attention" : "critical";

  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!config)                              criticalIssues.push("No AioSell configuration — property not connected to any OTA");
  if (!config?.pmsPassword)                 criticalIssues.push("PMS password not set — authentication will fail on all API calls");
  if (allMappings.length === 0)             criticalIssues.push("No room mappings — inventory cannot be pushed");
  if (invalidCodeMappings.length > 0)       criticalIssues.push(`${invalidCodeMappings.length} mapping${invalidCodeMappings.length !== 1 ? "s" : ""} have empty AioSell room codes`);
  if (!everPushed)                          criticalIssues.push("Inventory has never been pushed — OTAs are showing default availability");
  if (allRatePlans.length === 0 && allMappings.length > 0) criticalIssues.push("No rate plans configured — OTA rates will never be updated");
  if (liveTestResult !== null && !liveTestResult.success)  criticalIssues.push(`AioSell live connection failed: ${liveTestResult.message}`);

  if (mappingsWithoutRates.length > 0 && allRatePlans.length > 0)
    warnings.push(`${mappingsWithoutRates.length} room type${mappingsWithoutRates.length !== 1 ? "s" : ""} missing rate plans: ${mappingsWithoutRates.map(m => m.hostezeeRoomType).join(", ")}`);
  if (!within24h && lastSuccessAt)          warnings.push(`Last inventory push was ${hoursSince}h ago — consider a fresh push`);
  if (!lastRateOkLog && allRatePlans.length > 0) warnings.push("Rate push has never succeeded — OTAs are using default rates");
  if (dormMissingBeds.length > 0)           warnings.push(`${dormMissingBeds.length} dorm room${dormMissingBeds.length !== 1 ? "s" : ""} missing totalBeds — bed availability incorrect`);
  if (errorRate >= 0.1 && errorRate < 0.25) warnings.push(`Sync error rate ${Math.round(errorRate * 100)}% in last 7 days — monitor for persistent failures`);
  if (recentFails.length > 0 && recentFails.length <= 2) warnings.push(`${recentFails.length} sync failure${recentFails.length !== 1 ? "s" : ""} in last 24 hours`);

  if (allRatePlans.length === 0)            recommendations.push("Configure rate plans in Rate Plans tab before enabling OTA rate sync");
  if (!within24h && allMappings.length > 0) recommendations.push("Run a manual inventory push from Push Inventory tab to update OTA availability");
  if (!lastRateOkLog && allRatePlans.length > 0) recommendations.push("Push rates from Push Rates tab to update pricing on all OTAs");
  if (dormMissingBeds.length > 0)           recommendations.push("Set totalBeds on dormitory rooms in Rooms management");
  if (!config?.pmsPassword)                 recommendations.push("Add PMS password in Settings tab to enable API authentication");
  if (recentWebhooks.length === 0 && config) recommendations.push("Verify webhook URL is configured in AioSell dashboard for automatic booking import");

  return {
    propertyId,
    propertyName:  prop?.name || "Unknown",
    hotelCode:     config?.hotelCode || null,
    generatedAt:   now.toISOString(),
    durationMs:    Date.now() - startTime,
    healthScore,
    overallStatus,
    sections,
    criticalIssues,
    warnings,
    recommendations,
  };
}

export async function storeAuditReport(report: AuditReport, configId: number | null): Promise<number> {
  const [row] = await db.insert(aiosellAuditReports).values({
    propertyId:    report.propertyId,
    configId:      configId ?? null,
    hotelCode:     report.hotelCode,
    healthScore:   report.healthScore,
    overallStatus: report.overallStatus,
    reportData:    report as any,
  }).returning({ id: aiosellAuditReports.id });
  return row.id;
}
