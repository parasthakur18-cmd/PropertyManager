/**
 * Dynamic Pricing Engine — ADD-ON LAYER
 *
 * Hard rules:
 *  - Reads from existing tables (rooms, bookings, properties); does NOT modify them.
 *  - Every cron tick re-reads pricing_config, so toggles + emergency stop apply IMMEDIATELY.
 *  - Wraps every push to Aiosell behind otaPushEnabled. Uses existing pushRates() — no new sync logic.
 *  - All errors caught; never crashes the cron loop.
 */

import { db } from "./db";
import {
  pricingConfig,
  pricingHistory,
  roomPricingSettings,
  rooms,
  bookings,
  properties,
  aiosellConfigurations,
  aiosellRoomMappings,
  aiosellRatePlans,
  type PricingConfig,
} from "@shared/schema";
import { eq, and, sql, gte, lte, desc, ne } from "drizzle-orm";
import { pushRates } from "./aiosell";

// ──────────────────────────────────────────────────────────────────────────
// Presets
// ──────────────────────────────────────────────────────────────────────────

export type PresetName = "conservative" | "balanced" | "aggressive";

export const PRESETS: Record<PresetName, Partial<PricingConfig>> = {
  conservative: {
    occupancyEnabled: true,
    demandEnabled: false,
    dayEnabled: true,
    festivalEnabled: true,
    otaPushEnabled: false,
    directBookingEnabled: false,
    enforceMinMax: true,
    thresholdEnabled: true,
    thresholdPercent: "8.00",
    updateFrequencyMinutes: 60,
  },
  balanced: {
    occupancyEnabled: true,
    demandEnabled: true,
    dayEnabled: true,
    festivalEnabled: true,
    otaPushEnabled: true,
    directBookingEnabled: false,
    enforceMinMax: true,
    thresholdEnabled: true,
    thresholdPercent: "5.00",
    updateFrequencyMinutes: 30,
  },
  aggressive: {
    occupancyEnabled: true,
    demandEnabled: true,
    dayEnabled: true,
    festivalEnabled: true,
    otaPushEnabled: true,
    directBookingEnabled: true,
    enforceMinMax: true,
    thresholdEnabled: true,
    thresholdPercent: "3.00",
    updateFrequencyMinutes: 15,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Config helpers
// ──────────────────────────────────────────────────────────────────────────

export async function getOrCreateConfig(propertyId: number): Promise<PricingConfig> {
  const existing = await db.select().from(pricingConfig).where(eq(pricingConfig.propertyId, propertyId)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(pricingConfig).values({ propertyId }).returning();
  return created;
}

export async function applyPreset(propertyId: number, preset: PresetName): Promise<PricingConfig> {
  const patch = PRESETS[preset];
  await getOrCreateConfig(propertyId); // ensure row exists
  const [updated] = await db
    .update(pricingConfig)
    .set({ ...patch, preset, updatedAt: new Date() })
    .where(eq(pricingConfig.propertyId, propertyId))
    .returning();
  return updated;
}

// ──────────────────────────────────────────────────────────────────────────
// Pricing computation (PURE — no side effects, no toggle reads)
// Caller must respect config toggles before passing factors as enabled.
// ──────────────────────────────────────────────────────────────────────────

export interface PriceComputation {
  basePrice: number;
  finalPrice: number;
  occupancyFactor: number;
  demandFactor: number;
  dayFactor: number;
  festivalFactor: number;
  reasons: string[];
}

interface ComputeInput {
  basePrice: number;
  minPrice: number | null;
  maxPrice: number | null;
  occupancyPct: number | null; // 0..1, null = not enabled
  recentBookings24h: number | null; // null = not enabled
  isWeekend: boolean | null; // null = not enabled
  festivalUplift: number | null; // null = not enabled, otherwise e.g. 0.30
  enforceMinMax: boolean;
}

export function computePrice(input: ComputeInput): PriceComputation {
  const reasons: string[] = [];

  // Occupancy bands
  let occupancyFactor = 1.0;
  if (input.occupancyPct !== null) {
    const occ = input.occupancyPct;
    if (occ < 0.30) {
      occupancyFactor = 0.80;
      reasons.push(`Low occupancy (${Math.round(occ * 100)}%) → -20%`);
    } else if (occ < 0.60) {
      occupancyFactor = 1.00;
    } else if (occ < 0.80) {
      occupancyFactor = 1.20;
      reasons.push(`Healthy occupancy (${Math.round(occ * 100)}%) → +20%`);
    } else {
      occupancyFactor = 1.40;
      reasons.push(`High occupancy (${Math.round(occ * 100)}%) → +40%`);
    }
  }

  // Demand
  let demandFactor = 1.0;
  if (input.recentBookings24h !== null) {
    const n = input.recentBookings24h;
    if (n === 0) {
      demandFactor = 0.90;
      reasons.push("No recent bookings → -10%");
    } else if (n >= 10) {
      demandFactor = 1.25;
      reasons.push(`Very fast bookings (${n} in 24h) → +25%`);
    } else if (n >= 5) {
      demandFactor = 1.15;
      reasons.push(`Fast bookings (${n} in 24h) → +15%`);
    }
  }

  // Day of week
  let dayFactor = 1.0;
  if (input.isWeekend === true) {
    dayFactor = 1.20;
    reasons.push("Weekend → +20%");
  }

  // Festival
  let festivalFactor = 1.0;
  if (input.festivalUplift !== null && input.festivalUplift > 0) {
    festivalFactor = 1.0 + input.festivalUplift;
    reasons.push(`Festival → +${Math.round(input.festivalUplift * 100)}%`);
  }

  let finalPrice = input.basePrice * occupancyFactor * demandFactor * dayFactor * festivalFactor;

  if (input.enforceMinMax) {
    if (input.minPrice !== null && finalPrice < input.minPrice) {
      finalPrice = input.minPrice;
      reasons.push(`Clamped to min ₹${input.minPrice}`);
    }
    if (input.maxPrice !== null && finalPrice > input.maxPrice) {
      finalPrice = input.maxPrice;
      reasons.push(`Clamped to max ₹${input.maxPrice}`);
    }
  }

  return {
    basePrice: input.basePrice,
    finalPrice: Math.round(finalPrice),
    occupancyFactor,
    demandFactor,
    dayFactor,
    festivalFactor,
    reasons,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cycle runner
// ──────────────────────────────────────────────────────────────────────────

const HORIZON_DAYS = 7; // Compute for next 7 days

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RunCycleResult {
  ran: boolean;
  reason?: string;
  changesApplied: number;
  errors: number;
}

export async function runPricingCycle(propertyId: number, opts: { force?: boolean; source?: string } = {}): Promise<RunCycleResult> {
  const config = await getOrCreateConfig(propertyId);

  // ── KILL SWITCH GATES (in order) ──────────────────────────────────────
  if (config.emergencyStop) {
    return { ran: false, reason: "Emergency stop is active", changesApplied: 0, errors: 0 };
  }
  if (!config.autoPricingEnabled && !opts.force) {
    return { ran: false, reason: "Auto pricing is OFF", changesApplied: 0, errors: 0 };
  }

  const propertyRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.propertyId, propertyId));

  if (propertyRooms.length === 0) {
    await db.update(pricingConfig).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pricingConfig.propertyId, propertyId));
    return { ran: true, changesApplied: 0, errors: 0 };
  }

  const totalRooms = propertyRooms.length;

  // Pre-fetch room pricing settings for property
  const settingsRows = await db
    .select()
    .from(roomPricingSettings)
    .where(eq(roomPricingSettings.propertyId, propertyId));
  type RPS = typeof settingsRows[number];
  const settingsByRoom = new Map<number, RPS>(settingsRows.map((s: RPS) => [s.roomId, s] as const));

  // Pre-compute demand: bookings created in last 24h for this property
  let recentBookings24h: number | null = null;
  if (config.demandEnabled) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const r = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(eq(bookings.propertyId, propertyId), gte(bookings.createdAt, since)));
    recentBookings24h = Number(r[0]?.c ?? 0);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let changesApplied = 0;
  let errors = 0;
  const aiosellUpdatesByDate = new Map<string, Array<{ roomCode: string; rate: number; rateplanCode: string }>>();

  for (let dayOffset = 0; dayOffset < HORIZON_DAYS; dayOffset++) {
    const target = new Date(today);
    target.setDate(today.getDate() + dayOffset);
    const targetStr = fmtDate(target);
    const dow = target.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dow === 0 || dow === 6;

    // Festival lookup
    let festivalUplift: number | null = null;
    if (config.festivalEnabled && Array.isArray(config.festivalDates)) {
      const f = config.festivalDates.find((x) => x.date === targetStr);
      if (f) festivalUplift = Number(f.uplift) || 0;
    }

    // Occupancy: count rooms occupied on this date
    let occupancyPct: number | null = null;
    if (config.occupancyEnabled) {
      const occRes = await db
        .select({ c: sql<number>`count(distinct ${bookings.id})::int` })
        .from(bookings)
        .where(
          and(
            eq(bookings.propertyId, propertyId),
            lte(bookings.checkInDate, sql`${targetStr}::date`),
            sql`${bookings.checkOutDate} > ${targetStr}::date`,
            ne(bookings.status, "cancelled"),
            ne(bookings.status, "no_show"),
          ),
        );
      const occupiedCount = Number(occRes[0]?.c ?? 0);
      occupancyPct = totalRooms > 0 ? Math.min(occupiedCount / totalRooms, 1) : 0;
    }

    for (const room of propertyRooms) {
      try {
        const settings = settingsByRoom.get(room.id);
        const basePrice = parseFloat(room.pricePerNight);
        if (!basePrice || basePrice <= 0) continue;

        // ── Manual override path ─────────────────────────────────────────
        // If override is on, the manual price wins outright. We still compare
        // against last logged price (threshold) and push to OTA when enabled,
        // so manual changes propagate the same way auto changes do.
        if (settings?.manualOverride && settings.manualPrice) {
          const manualPrice = Math.round(parseFloat(settings.manualPrice));
          if (!manualPrice || manualPrice <= 0) continue;

          const lastRowM = await db
            .select()
            .from(pricingHistory)
            .where(and(eq(pricingHistory.roomId, room.id), eq(pricingHistory.forDate, targetStr)))
            .orderBy(desc(pricingHistory.createdAt))
            .limit(1);
          const lastPriceM = lastRowM[0] ? parseFloat(lastRowM[0].newPrice) : basePrice;
          if (manualPrice === lastPriceM) continue;

          // Threshold check (same as auto path): skip if delta below configured %
          if (config.thresholdEnabled && lastPriceM > 0) {
            const deltaPctM = Math.abs(manualPrice - lastPriceM) / lastPriceM * 100;
            const threshM = parseFloat(config.thresholdPercent || "5");
            if (deltaPctM < threshM) continue;
          }

          let mOtaPushed = false;
          let mOtaPushError: string | null = null;
          if (config.otaPushEnabled) {
            const r = await pushRateForRoomDate(propertyId, room.id, targetStr, manualPrice);
            mOtaPushed = r.success;
            mOtaPushError = r.error;
          }

          await db.insert(pricingHistory).values({
            propertyId,
            roomId: room.id,
            forDate: targetStr,
            basePrice: String(basePrice),
            oldPrice: String(lastPriceM),
            newPrice: String(manualPrice),
            occupancyFactor: "1.000",
            demandFactor: "1.000",
            dayFactor: "1.000",
            festivalFactor: "1.000",
            reasons: ["Manual override price applied"],
            source: "manual",
            otaPushed: mOtaPushed,
            otaPushError: mOtaPushError,
          });

          changesApplied++;
          continue;
        }

        const minPrice = settings?.minPrice ? parseFloat(settings.minPrice) : null;
        const maxPrice = settings?.maxPrice ? parseFloat(settings.maxPrice) : null;

        const result = computePrice({
          basePrice,
          minPrice,
          maxPrice,
          occupancyPct,
          recentBookings24h,
          isWeekend: config.dayEnabled ? isWeekend : null,
          festivalUplift,
          enforceMinMax: config.enforceMinMax,
        });

        // Get last recorded price for this room+date
        const lastRow = await db
          .select()
          .from(pricingHistory)
          .where(and(eq(pricingHistory.roomId, room.id), eq(pricingHistory.forDate, targetStr)))
          .orderBy(desc(pricingHistory.createdAt))
          .limit(1);

        const lastPrice = lastRow[0] ? parseFloat(lastRow[0].newPrice) : basePrice;

        // Threshold check
        if (config.thresholdEnabled && lastPrice > 0) {
          const deltaPct = Math.abs(result.finalPrice - lastPrice) / lastPrice * 100;
          const threshold = parseFloat(config.thresholdPercent);
          if (deltaPct < threshold) {
            continue; // change too small
          }
        }

        if (result.finalPrice === lastPrice) continue;

        // Try OTA push first (so we record success/failure accurately)
        let otaPushed = false;
        let otaPushError: string | null = null;

        if (config.otaPushEnabled) {
          const pushResult = await pushRateForRoomDate(propertyId, room.id, targetStr, result.finalPrice);
          otaPushed = pushResult.success;
          otaPushError = pushResult.error;
        }

        // Insert history row
        await db.insert(pricingHistory).values({
          propertyId,
          roomId: room.id,
          forDate: targetStr,
          basePrice: String(basePrice),
          oldPrice: String(lastPrice),
          newPrice: String(result.finalPrice),
          occupancyFactor: String(result.occupancyFactor.toFixed(3)),
          demandFactor: String(result.demandFactor.toFixed(3)),
          dayFactor: String(result.dayFactor.toFixed(3)),
          festivalFactor: String(result.festivalFactor.toFixed(3)),
          reasons: result.reasons,
          source: opts.source || "auto",
          otaPushed,
          otaPushError,
        });

        changesApplied++;
      } catch (err: any) {
        errors++;
        console.error(`[DynamicPricing] room ${room.id} date ${targetStr} failed:`, err?.message);
      }
    }
  }

  // Update status
  const now = new Date();
  await db
    .update(pricingConfig)
    .set({
      lastRunAt: now,
      ...(changesApplied > 0
        ? { lastChangeAt: now, lastChangeReason: `${changesApplied} price change(s) applied` }
        : {}),
      updatedAt: now,
    })
    .where(eq(pricingConfig.propertyId, propertyId));

  return { ran: true, changesApplied, errors };
}

// ──────────────────────────────────────────────────────────────────────────
// OTA push (single room+date) — uses existing aiosell.pushRates
// ──────────────────────────────────────────────────────────────────────────

async function pushRateForRoomDate(
  propertyId: number,
  roomId: number,
  date: string,
  rate: number,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cfgRows = await db
      .select()
      .from(aiosellConfigurations)
      .where(and(eq(aiosellConfigurations.propertyId, propertyId), eq(aiosellConfigurations.isActive, true)))
      .limit(1);
    const cfg = cfgRows[0];
    if (!cfg) return { success: false, error: "No active Aiosell config for this property" };

    const mappingRows = await db
      .select()
      .from(aiosellRoomMappings)
      .where(and(eq(aiosellRoomMappings.configId, cfg.id), eq(aiosellRoomMappings.hostezeeRoomId, roomId)))
      .limit(1);
    const mapping = mappingRows[0];
    if (!mapping) return { success: false, error: "Room not mapped to Aiosell" };

    const rateplanRows = await db
      .select()
      .from(aiosellRatePlans)
      .where(eq(aiosellRatePlans.roomMappingId, mapping.id))
      .limit(1);
    const rateplan = rateplanRows[0];
    if (!rateplan) return { success: false, error: "No rate plan mapped" };

    const resp = await pushRates(cfg, [
      {
        startDate: date,
        endDate: date,
        rates: [{ roomCode: mapping.aiosellRoomCode, rate, rateplanCode: rateplan.ratePlanCode }],
      },
    ]);

    if (resp.success) return { success: true, error: null };
    return { success: false, error: resp.message || "Aiosell push failed" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown OTA push error" };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Cron heartbeat — runs every minute, decides per-property whether to run
// based on each property's updateFrequencyMinutes and lastRunAt.
// ──────────────────────────────────────────────────────────────────────────

let cronStarted = false;

export function startDynamicPricingCron(): void {
  if (cronStarted) return;
  cronStarted = true;

  const HEARTBEAT_MS = 60_000; // 1 minute

  const tick = async () => {
    try {
      const allProperties = await db.select({ id: properties.id }).from(properties);
      for (const p of allProperties) {
        try {
          const cfg = await db
            .select()
            .from(pricingConfig)
            .where(eq(pricingConfig.propertyId, p.id))
            .limit(1);
          const c = cfg[0];
          if (!c) continue;
          if (c.emergencyStop) continue;
          if (!c.autoPricingEnabled) continue;

          const now = Date.now();
          const last = c.lastRunAt ? new Date(c.lastRunAt).getTime() : 0;
          const intervalMs = Math.max(5, c.updateFrequencyMinutes) * 60_000;
          if (now - last < intervalMs) continue;

          const result = await runPricingCycle(p.id);
          if (result.changesApplied > 0 || result.errors > 0) {
            console.log(`[DynamicPricing] property=${p.id} changes=${result.changesApplied} errors=${result.errors}`);
          }
        } catch (err: any) {
          console.error(`[DynamicPricing] cycle failed for property ${p.id}:`, err?.message);
        }
      }
    } catch (err: any) {
      console.error("[DynamicPricing] heartbeat failed:", err?.message);
    }
  };

  setInterval(tick, HEARTBEAT_MS);
  console.log("[DynamicPricing] Cron heartbeat started (1 min)");
}
