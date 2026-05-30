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
  aiosellConfigurations,
  aiosellRoomMappings,
  aiosellRatePlans,
  aiosellSyncLogs,
} from "@shared/schema";
import { and, eq, inArray, desc } from "drizzle-orm";

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
