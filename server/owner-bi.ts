/**
 * Owner BI Module — server/owner-bi.ts
 * All calculations for the Owner Business Intelligence dashboards.
 * This module is completely separate from existing reports.
 * Accessible only to super-admin / owner role.
 */

import { db } from "./db";
import {
  bookings,
  bills,
  orders,
  rooms,
  properties,
  propertyExpenses,
  staffSalaries,
  guests,
  propertyTargets,
  otaCommissionRules,
  propertyInventoryCertifications,
} from "@shared/schema";
import { eq, and, gte, lte, sql, inArray, isNull, isNotNull, ne, or, desc } from "drizzle-orm";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OwnerBIFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  propertyIds?: number[]; // empty = all
}

// ─────────────────────────────────────────────
// OTA source classification
// ─────────────────────────────────────────────

const OTA_SOURCES = [
  "booking.com", "bookingcom", "booking_com",
  "airbnb",
  "makemytrip", "mmt", "make_my_trip",
  "goibibo",
  "agoda",
  "expedia",
  "yatra",
  "via",
  "cleartrip",
  "oyo",
  "easemytrip", "ease_my_trip",
  "tripadvisor", "trip_advisor",
  "hostelworld",
  "aiosell", "ota",
];

const WALKIN_SOURCES = ["walk_in", "walk-in", "walkin", "walk in"];
const WEBSITE_SOURCES = ["website", "direct_website", "web"];
const CORPORATE_SOURCES = ["corporate", "company", "business"];

export function classifySource(source: string | null): string {
  if (!source) return "direct";
  const s = source.toLowerCase().trim();
  if (OTA_SOURCES.some((o) => s.includes(o))) return "ota";
  if (WALKIN_SOURCES.some((w) => s === w || s.includes(w))) return "walk_in";
  if (WEBSITE_SOURCES.some((w) => s.includes(w))) return "website";
  if (CORPORATE_SOURCES.some((c) => s.includes(c))) return "corporate";
  return "direct";
}

// ─────────────────────────────────────────────
// Helper: build property filter
// ─────────────────────────────────────────────

function propFilter(ids?: number[]) {
  if (!ids || ids.length === 0) return undefined;
  return inArray(bookings.propertyId, ids);
}

function propFilterRooms(ids?: number[]) {
  if (!ids || ids.length === 0) return undefined;
  return inArray(rooms.propertyId, ids);
}

function propFilterOrders(ids?: number[]) {
  if (!ids || ids.length === 0) return undefined;
  return inArray(orders.propertyId, ids);
}

function propFilterExpenses(ids?: number[]) {
  if (!ids || ids.length === 0) return undefined;
  return inArray(propertyExpenses.propertyId, ids);
}

// ─────────────────────────────────────────────
// Core: bills joined to bookings in date range
// Revenue is recognized by bills.createdAt + paymentStatus='paid'
// This matches the Monthly P&L report methodology exactly.
// ─────────────────────────────────────────────

async function getBillsInRange(filters: OwnerBIFilters) {
  const start = new Date(filters.startDate + "T00:00:00.000Z");
  const end = new Date(filters.endDate + "T23:59:59.999Z");

  const conditions = [
    gte(bills.createdAt, start),
    lte(bills.createdAt, end),
    eq(bills.paymentStatus, "paid"),
  ];
  if (filters.propertyIds?.length) {
    conditions.push(inArray(bookings.propertyId, filters.propertyIds));
  }

  return await db
    .select({
      bookingId: bookings.id,
      propertyId: bookings.propertyId,
      source: bookings.source,
      status: bookings.status,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
      totalAmount: bookings.totalAmount,
      customPrice: bookings.customPrice,
      roomIds: bookings.roomIds,
      roomId: bookings.roomId,
      billId: bills.id,
      roomCharges: bills.roomCharges,
      foodCharges: bills.foodCharges,
      extraCharges: bills.extraCharges,
      billTotal: bills.totalAmount,
      paymentStatus: bills.paymentStatus,
      balanceAmount: bills.balanceAmount,
    })
    .from(bills)
    .innerJoin(bookings, eq(bills.bookingId, bookings.id))
    .where(and(...conditions));
}

// ─────────────────────────────────────────────
// Core: outstanding (unpaid) bills — ALL time, property-scoped
// Used for leakage reporting; not date-range filtered since outstanding
// means "still unpaid today", regardless of when bill was created.
// ─────────────────────────────────────────────

async function getOutstandingBills(propertyIds?: number[]) {
  const conditions: any[] = [
    ne(bills.paymentStatus, "paid"),
    isNotNull(bills.bookingId),
  ];
  if (propertyIds?.length) {
    conditions.push(inArray(bookings.propertyId, propertyIds));
  }
  return await db
    .select({
      bookingId: bookings.id,
      propertyId: bookings.propertyId,
      status: bookings.status,
      checkOutDate: bookings.checkOutDate,
      billId: bills.id,
      billTotal: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      paymentStatus: bills.paymentStatus,
    })
    .from(bills)
    .innerJoin(bookings, eq(bills.bookingId, bookings.id))
    .where(and(...conditions));
}

// ─────────────────────────────────────────────
// Core: food orders in date range (standalone)
// ─────────────────────────────────────────────

async function getFoodOrdersInRange(filters: OwnerBIFilters) {
  const start = new Date(filters.startDate + "T00:00:00.000Z");
  const end = new Date(filters.endDate + "T23:59:59.999Z");

  const conditions = [
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    inArray(orders.status, ["delivered", "completed"]),
    eq(orders.isTest, false),
  ];
  if (filters.propertyIds?.length) {
    conditions.push(inArray(orders.propertyId, filters.propertyIds));
  }

  return await db
    .select({
      propertyId: orders.propertyId,
      totalAmount: orders.totalAmount,
      orderMode: orders.orderMode,
      orderType: orders.orderType,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(...conditions));
}

// ─────────────────────────────────────────────
// Core: cancelled bookings in range
// ─────────────────────────────────────────────

async function getCancelledInRange(filters: OwnerBIFilters) {
  const start = new Date(filters.startDate + "T00:00:00.000Z");
  const end = new Date(filters.endDate + "T23:59:59.999Z");

  const conditions = [
    eq(bookings.status, "cancelled"),
    gte(bookings.cancellationDate, start),
    lte(bookings.cancellationDate, end),
  ];
  if (filters.propertyIds?.length) {
    conditions.push(inArray(bookings.propertyId, filters.propertyIds));
  }

  return await db
    .select({
      id: bookings.id,
      propertyId: bookings.propertyId,
      totalAmount: bookings.totalAmount,
      cancellationDate: bookings.cancellationDate,
      refundAmount: bookings.refundAmount,
      cancellationCharges: bookings.cancellationCharges,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
    })
    .from(bookings)
    .where(and(...conditions));
}

// ─────────────────────────────────────────────
// Core: no-show bookings in range
// ─────────────────────────────────────────────

async function getNoShowsInRange(filters: OwnerBIFilters) {
  const start = new Date(filters.startDate + "T00:00:00.000Z");
  const end = new Date(filters.endDate + "T23:59:59.999Z");

  const conditions = [
    eq(bookings.status, "no_show"),
    gte(bookings.noShowDate, start),
    lte(bookings.noShowDate, end),
  ];
  if (filters.propertyIds?.length) {
    conditions.push(inArray(bookings.propertyId, filters.propertyIds));
  }

  return await db
    .select({
      id: bookings.id,
      propertyId: bookings.propertyId,
      totalAmount: bookings.totalAmount,
      noShowDate: bookings.noShowDate,
      noShowCharges: bookings.noShowCharges,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
    })
    .from(bookings)
    .where(and(...conditions));
}

// ─────────────────────────────────────────────
// Core: all properties with room counts
// ─────────────────────────────────────────────

async function getPropertiesWithRooms(propertyIds?: number[]) {
  const propConditions = propertyIds?.length
    ? [inArray(properties.id, propertyIds)]
    : [];

  const propRows = await db
    .select()
    .from(properties)
    .where(propConditions.length ? and(...propConditions) : undefined);

  const roomRows = await db
    .select({
      propertyId: rooms.propertyId,
      count: sql<number>`COUNT(*)`,
    })
    .from(rooms)
    .where(
      propertyIds?.length
        ? inArray(rooms.propertyId, propertyIds)
        : undefined
    )
    .groupBy(rooms.propertyId);

  const roomMap = new Map(roomRows.map((r) => [r.propertyId, Number(r.count)]));

  return propRows.map((p) => ({
    ...p,
    roomCount: roomMap.get(p.id) || p.totalRooms || 0,
  }));
}

// ─────────────────────────────────────────────
// Helper: days in date range
// ─────────────────────────────────────────────

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

// ─────────────────────────────────────────────
// Helper: compute occupied room nights for a booking overlapping [start,end]
// ─────────────────────────────────────────────

function occupiedNightsForBooking(
  checkIn: string,
  checkOut: string,
  rangeStart: string,
  rangeEnd: string
): number {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const rs = new Date(rangeStart);
  const re = new Date(rangeEnd);
  re.setDate(re.getDate() + 1); // end is inclusive

  const effectiveStart = ci > rs ? ci : rs;
  const effectiveEnd = co < re ? co : re;

  const nights = Math.ceil(
    (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, nights);
}

// ─────────────────────────────────────────────
// Helper: safe number
// ─────────────────────────────────────────────

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v)) || 0;
}

// ─────────────────────────────────────────────
// API 1: Executive Owner Dashboard
// ─────────────────────────────────────────────

export async function getOwnerDashboard(filters: OwnerBIFilters) {
  const [billRows, foodRows, cancelledRows, noShowRows, propsWithRooms, outstandingBillRows] =
    await Promise.all([
      getBillsInRange(filters),
      getFoodOrdersInRange(filters),
      getCancelledInRange(filters),
      getNoShowsInRange(filters),
      getPropertiesWithRooms(filters.propertyIds),
      getOutstandingBills(filters.propertyIds),
    ]);

  // Outstanding from dedicated query (unpaid bills, all time)
  const outstanding = outstandingBillRows.reduce(
    (sum, r) => sum + (num(r.balanceAmount) || num(r.billTotal)),
    0
  );

  // Compute room revenue, food, extra, totals
  let roomRevenue = 0;
  let foodFromBills = 0;
  let otherRevenue = 0;
  let occupiedRoomNights = 0;

  const bookingIds = new Set<number>();
  const checkedInCount = { checked_in: 0, checked_out: 0 };

  for (const row of billRows) {
    if (bookingIds.has(row.bookingId)) continue;
    bookingIds.add(row.bookingId);

    roomRevenue += num(row.roomCharges);
    foodFromBills += num(row.foodCharges);
    otherRevenue += num(row.extraCharges);

    const nights = occupiedNightsForBooking(
      row.checkInDate,
      row.checkOutDate,
      filters.startDate,
      filters.endDate
    );
    occupiedRoomNights += nights;

    if (row.status === "checked_in") checkedInCount.checked_in++;
    if (row.status === "checked_out") checkedInCount.checked_out++;
  }

  // Standalone food revenue
  const standaloneFoodRevenue = foodRows.reduce(
    (sum, o) => sum + num(o.totalAmount),
    0
  );
  const totalFoodRevenue = foodFromBills + standaloneFoodRevenue;
  const totalRevenue = roomRevenue + totalFoodRevenue + otherRevenue;

  // Cancelled revenue lost
  const cancelledRevenue = cancelledRows.reduce(
    (sum, c) => sum + num(c.totalAmount),
    0
  );
  const noShowRevenue = noShowRows.reduce(
    (sum, n) => sum + num(n.totalAmount),
    0
  );

  // Room inventory
  const totalRooms = propsWithRooms.reduce((s, p) => s + p.roomCount, 0);
  const days = daysBetween(filters.startDate, filters.endDate);
  const totalAvailableRoomNights = totalRooms * days;
  const unsoldRoomNights = Math.max(0, totalAvailableRoomNights - occupiedRoomNights);

  // Performance
  const arr = occupiedRoomNights > 0 ? roomRevenue / occupiedRoomNights : 0;
  const revpar = totalAvailableRoomNights > 0 ? roomRevenue / totalAvailableRoomNights : 0;
  const occupancyPct =
    totalAvailableRoomNights > 0
      ? (occupiedRoomNights / totalAvailableRoomNights) * 100
      : 0;

  // Source breakdown
  const sourceBreakdown: Record<string, { revenue: number; bookings: number }> =
    {};
  for (const row of billRows) {
    const cat = classifySource(row.source);
    if (!sourceBreakdown[cat]) sourceBreakdown[cat] = { revenue: 0, bookings: 0 };
    sourceBreakdown[cat].revenue +=
      num(row.roomCharges) + num(row.foodCharges) + num(row.extraCharges);
    sourceBreakdown[cat].bookings += 1;
  }

  // Booking status counts
  const totalBookings = bookingIds.size;
  const checkedIn = billRows.filter(
    (r, i, a) => a.findIndex((x) => x.bookingId === r.bookingId) === i && r.status === "checked_in"
  ).length;
  const checkedOut = billRows.filter(
    (r, i, a) => a.findIndex((x) => x.bookingId === r.bookingId) === i && r.status === "checked_out"
  ).length;

  // Forecast (simple: project month-end based on daily run rate)
  const today = new Date();
  const periodStart = new Date(filters.startDate);
  const periodEnd = new Date(filters.endDate);
  const daysElapsed = Math.max(
    1,
    Math.ceil((today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const totalPeriodDays = daysBetween(filters.startDate, filters.endDate);
  const dailyRunRate = totalRevenue / Math.min(daysElapsed, totalPeriodDays);
  const forecastRevenue = dailyRunRate * totalPeriodDays;

  return {
    revenue: {
      total: totalRevenue,
      room: roomRevenue,
      food: totalFoodRevenue,
      other: otherRevenue,
      ota: sourceBreakdown.ota?.revenue || 0,
      walkIn: sourceBreakdown.walk_in?.revenue || 0,
      website: sourceBreakdown.website?.revenue || 0,
      corporate: sourceBreakdown.corporate?.revenue || 0,
      direct: sourceBreakdown.direct?.revenue || 0,
    },
    bookings: {
      total: totalBookings,
      checkedIn,
      checkedOut,
      cancelled: cancelledRows.length,
      noShow: noShowRows.length,
    },
    rooms: {
      total: totalRooms,
      occupiedNights: occupiedRoomNights,
      availableNights: totalAvailableRoomNights,
      unsoldNights: unsoldRoomNights,
    },
    performance: {
      arr,
      adr: arr,
      occupancyPct,
      revpar,
    },
    leakage: {
      outstanding,
      cancelledRevenue,
      noShowRevenue,
      revenueLoss: cancelledRevenue + noShowRevenue,
      potentialUnsoldLoss: unsoldRoomNights * arr,
    },
    forecast: {
      forecastRevenue,
      dailyRunRate,
      daysElapsed: Math.min(daysElapsed, totalPeriodDays),
      totalDays: totalPeriodDays,
    },
  };
}

// ─────────────────────────────────────────────
// API 2: Property Performance Scorecard
// ─────────────────────────────────────────────

export async function getPropertyPerformance(filters: OwnerBIFilters) {
  const [billRows, foodRows, cancelledRows, propsWithRooms, outstandingBillRows] = await Promise.all([
    getBillsInRange(filters),
    getFoodOrdersInRange(filters),
    getCancelledInRange(filters),
    getPropertiesWithRooms(filters.propertyIds),
    getOutstandingBills(filters.propertyIds),
  ]);

  // Pre-aggregate outstanding by property from dedicated query
  const outstandingByPropId: Record<number, number> = {};
  for (const r of outstandingBillRows) {
    outstandingByPropId[r.propertyId] = (outstandingByPropId[r.propertyId] || 0) +
      (num(r.balanceAmount) || num(r.billTotal));
  }

  const days = daysBetween(filters.startDate, filters.endDate);
  const propMap = new Map(propsWithRooms.map((p) => [p.id, p]));

  // Aggregate by property
  const byProperty: Record<
    number,
    {
      roomRevenue: number;
      foodRevenue: number;
      otherRevenue: number;
      occupiedNights: number;
      bookingSet: Set<number>;
      outstanding: number;
      guestNights: number;
      otaRevenue: number;
      walkInRevenue: number;
    }
  > = {};

  const initProp = (pid: number) => {
    if (!byProperty[pid]) {
      byProperty[pid] = {
        roomRevenue: 0,
        foodRevenue: 0,
        otherRevenue: 0,
        occupiedNights: 0,
        bookingSet: new Set(),
        outstanding: 0,
        guestNights: 0,
        otaRevenue: 0,
        walkInRevenue: 0,
      };
    }
    return byProperty[pid];
  };

  const seenBookings = new Set<number>();
  for (const row of billRows) {
    const p = initProp(row.propertyId);
    if (!seenBookings.has(row.bookingId)) {
      seenBookings.add(row.bookingId);
      p.bookingSet.add(row.bookingId);
      p.roomRevenue += num(row.roomCharges);
      p.foodRevenue += num(row.foodCharges);
      p.otherRevenue += num(row.extraCharges);

      const nights = occupiedNightsForBooking(
        row.checkInDate,
        row.checkOutDate,
        filters.startDate,
        filters.endDate
      );
      p.occupiedNights += nights;

      const ciDate = new Date(row.checkInDate);
      const coDate = new Date(row.checkOutDate);
      const stayNights = Math.max(
        0,
        Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      p.guestNights += stayNights;

      const cat = classifySource(row.source);
      const rowRevenue = num(row.roomCharges) + num(row.foodCharges) + num(row.extraCharges);
      if (cat === "ota") p.otaRevenue += rowRevenue;
      if (cat === "walk_in") p.walkInRevenue += rowRevenue;
    }
  }

  // Standalone food per property
  for (const o of foodRows) {
    if (!o.propertyId) continue;
    const p = initProp(o.propertyId);
    p.foodRevenue += num(o.totalAmount);
  }

  // Cancelled per property
  const cancelledByProp: Record<number, number> = {};
  for (const c of cancelledRows) {
    cancelledByProp[c.propertyId] = (cancelledByProp[c.propertyId] || 0) + num(c.totalAmount);
  }

  // Build result
  const result = propsWithRooms.map((prop) => {
    const data = byProperty[prop.id] || {
      roomRevenue: 0,
      foodRevenue: 0,
      otherRevenue: 0,
      occupiedNights: 0,
      bookingSet: new Set(),
      outstanding: 0,
      guestNights: 0,
      otaRevenue: 0,
      walkInRevenue: 0,
    };

    const totalRevenue = data.roomRevenue + data.foodRevenue + data.otherRevenue;
    const totalAvailableNights = data.bookingSet.size > 0 ? prop.roomCount * days : prop.roomCount * days;
    const arr = data.occupiedNights > 0 ? data.roomRevenue / data.occupiedNights : 0;
    const revpar =
      totalAvailableNights > 0 ? data.roomRevenue / totalAvailableNights : 0;
    const occupancyPct =
      totalAvailableNights > 0
        ? (data.occupiedNights / totalAvailableNights) * 100
        : 0;
    const avgStay =
      data.bookingSet.size > 0 ? data.guestNights / data.bookingSet.size : 0;

    return {
      propertyId: prop.id,
      propertyName: prop.name,
      totalRooms: prop.roomCount,
      revenue: {
        total: totalRevenue,
        room: data.roomRevenue,
        food: data.foodRevenue,
        other: data.otherRevenue,
        ota: data.otaRevenue,
        walkIn: data.walkInRevenue,
        outstanding: outstandingByPropId[prop.id] || 0,
        cancelled: cancelledByProp[prop.id] || 0,
      },
      bookings: data.bookingSet.size,
      guestNights: data.guestNights,
      rooms: {
        total: prop.roomCount,
        occupiedNights: data.occupiedNights,
        availableNights: totalAvailableNights,
        unsoldNights: Math.max(0, totalAvailableNights - data.occupiedNights),
        occupancyPct,
      },
      performance: {
        arr,
        adr: arr,
        revpar,
        avgStay,
        profitMargin: 0, // Would need expense data per property
      },
    };
  });

  // Rankings
  const rankings = {
    highestRevenue: result.reduce((a, b) => (a.revenue.total > b.revenue.total ? a : b), result[0])?.propertyName || "",
    highestArr: result.reduce((a, b) => (a.performance.arr > b.performance.arr ? a : b), result[0])?.propertyName || "",
    highestOccupancy: result.reduce((a, b) => (a.rooms.occupancyPct > b.rooms.occupancyPct ? a : b), result[0])?.propertyName || "",
    highestRevpar: result.reduce((a, b) => (a.performance.revpar > b.performance.revpar ? a : b), result[0])?.propertyName || "",
    highestFood: result.reduce((a, b) => (a.revenue.food > b.revenue.food ? a : b), result[0])?.propertyName || "",
    highestWalkIn: result.reduce((a, b) => (a.revenue.walkIn > b.revenue.walkIn ? a : b), result[0])?.propertyName || "",
  };

  return { properties: result, rankings };
}

// ─────────────────────────────────────────────
// API 3: Monthly Sales Dashboard
// ─────────────────────────────────────────────

export async function getMonthlySales(filters: OwnerBIFilters) {
  // Extend range to cover full years for YoY comparison
  const conditions = [
    gte(bookings.checkOutDate, filters.startDate),
    lte(bookings.checkOutDate, filters.endDate),
    ne(bookings.status, "cancelled"),
    ne(bookings.status, "no_show"),
  ];
  if (filters.propertyIds?.length) {
    conditions.push(inArray(bookings.propertyId, filters.propertyIds));
  }

  const rows = await db
    .select({
      checkOutDate: bookings.checkOutDate,
      source: bookings.source,
      status: bookings.status,
      checkInDate: bookings.checkInDate,
      bookingId: bookings.id,
      roomCharges: bills.roomCharges,
      foodCharges: bills.foodCharges,
      extraCharges: bills.extraCharges,
      propertyId: bookings.propertyId,
    })
    .from(bookings)
    .leftJoin(bills, eq(bills.bookingId, bookings.id))
    .where(and(...conditions));

  // Food orders by month
  const startTs = new Date(filters.startDate + "T00:00:00.000Z");
  const endTs = new Date(filters.endDate + "T23:59:59.999Z");
  const foodConditions = [
    gte(orders.createdAt, startTs),
    lte(orders.createdAt, endTs),
    inArray(orders.status, ["delivered", "completed"]),
    eq(orders.isTest, false),
  ];
  if (filters.propertyIds?.length) {
    foodConditions.push(inArray(orders.propertyId, filters.propertyIds));
  }

  const foodRows = await db
    .select({
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
    })
    .from(orders)
    .where(and(...foodConditions));

  // Group by month
  const monthMap: Record<
    string,
    {
      roomRevenue: number;
      foodRevenue: number;
      otherRevenue: number;
      otaRevenue: number;
      walkInRevenue: number;
      bookings: number;
      guestNights: number;
      occupiedNights: number;
      totalRooms: number;
    }
  > = {};

  const seenBookings = new Set<number>();
  for (const row of rows) {
    if (seenBookings.has(row.bookingId)) continue;
    seenBookings.add(row.bookingId);

    const month = row.checkOutDate.substring(0, 7); // YYYY-MM
    if (!monthMap[month]) {
      monthMap[month] = {
        roomRevenue: 0,
        foodRevenue: 0,
        otherRevenue: 0,
        otaRevenue: 0,
        walkInRevenue: 0,
        bookings: 0,
        guestNights: 0,
        occupiedNights: 0,
        totalRooms: 0,
      };
    }
    const m = monthMap[month];
    m.roomRevenue += num(row.roomCharges);
    m.foodRevenue += num(row.foodCharges);
    m.otherRevenue += num(row.extraCharges);
    m.bookings++;

    const ciDate = new Date(row.checkInDate);
    const coDate = new Date(row.checkOutDate);
    const nights = Math.max(
      0,
      Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    m.guestNights += nights;
    m.occupiedNights += nights;

    const cat = classifySource(row.source);
    const rev = num(row.roomCharges) + num(row.foodCharges) + num(row.extraCharges);
    if (cat === "ota") m.otaRevenue += rev;
    if (cat === "walk_in") m.walkInRevenue += rev;
  }

  // Add standalone food to months
  for (const f of foodRows) {
    if (!f.createdAt) continue;
    const month = f.createdAt.toISOString().substring(0, 7);
    if (!monthMap[month]) {
      monthMap[month] = {
        roomRevenue: 0,
        foodRevenue: 0,
        otherRevenue: 0,
        otaRevenue: 0,
        walkInRevenue: 0,
        bookings: 0,
        guestNights: 0,
        occupiedNights: 0,
        totalRooms: 0,
      };
    }
    monthMap[month].foodRevenue += num(f.totalAmount);
  }

  // Sort months and compute growth
  const months = Object.keys(monthMap).sort();
  const result = months.map((month, idx) => {
    const m = monthMap[month];
    const totalRevenue = m.roomRevenue + m.foodRevenue + m.otherRevenue;
    const prevMonth = months[idx - 1];
    const prevData = prevMonth ? monthMap[prevMonth] : null;
    const prevRevenue = prevData ? prevData.roomRevenue + prevData.foodRevenue + prevData.otherRevenue : 0;

    const momGrowth =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

    // YoY: find same month last year
    const [y, mo] = month.split("-");
    const lastYearMonth = `${parseInt(y) - 1}-${mo}`;
    const lastYearData = monthMap[lastYearMonth];
    const lastYearRevenue = lastYearData
      ? lastYearData.roomRevenue + lastYearData.foodRevenue + lastYearData.otherRevenue
      : null;
    const yoyGrowth =
      lastYearRevenue !== null && lastYearRevenue > 0
        ? ((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100
        : null;

    const arr = m.occupiedNights > 0 ? m.roomRevenue / m.occupiedNights : 0;
    const daysInMonth = new Date(parseInt(y), parseInt(mo), 0).getDate();
    const totalAvailNights = m.totalRooms > 0 ? m.totalRooms * daysInMonth : m.occupiedNights * 2;
    const revpar = totalAvailNights > 0 ? m.roomRevenue / totalAvailNights : 0;
    const occupancyPct =
      totalAvailNights > 0 ? (m.occupiedNights / totalAvailNights) * 100 : 0;

    return {
      month,
      totalRevenue,
      roomRevenue: m.roomRevenue,
      foodRevenue: m.foodRevenue,
      otherRevenue: m.otherRevenue,
      otaRevenue: m.otaRevenue,
      walkInRevenue: m.walkInRevenue,
      bookings: m.bookings,
      guestNights: m.guestNights,
      arr,
      revpar,
      occupancyPct,
      momGrowth,
      yoyGrowth,
    };
  });

  return { months: result };
}

// ─────────────────────────────────────────────
// API 4: OTA vs Walk-in Analysis
// ─────────────────────────────────────────────

export async function getOtaAnalysis(filters: OwnerBIFilters) {
  const billRows = await getBillsInRange(filters);

  const sourceMap: Record<
    string,
    {
      bookings: number;
      revenue: number;
      roomNights: number;
      totalStay: number;
    }
  > = {};

  const seenBookings = new Set<number>();
  for (const row of billRows) {
    if (seenBookings.has(row.bookingId)) continue;
    seenBookings.add(row.bookingId);

    const rawSource = row.source || "direct";
    const cat = classifySource(rawSource);
    // Use normalized category OR raw source for detailed breakdown
    const key = rawSource.toLowerCase().trim() || "direct";

    if (!sourceMap[key]) {
      sourceMap[key] = { bookings: 0, revenue: 0, roomNights: 0, totalStay: 0 };
    }

    const s = sourceMap[key];
    s.bookings++;

    const ciDate = new Date(row.checkInDate);
    const coDate = new Date(row.checkOutDate);
    const nights = Math.max(
      0,
      Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    s.roomNights += nights;
    s.totalStay += nights;
    s.revenue +=
      num(row.roomCharges) + num(row.foodCharges) + num(row.extraCharges);
  }

  const totalRevenue = Object.values(sourceMap).reduce((s, v) => s + v.revenue, 0);
  const totalBookings = Object.values(sourceMap).reduce((s, v) => s + v.bookings, 0);

  const sources = Object.entries(sourceMap)
    .map(([source, data]) => {
      const category = classifySource(source);
      const arr = data.roomNights > 0 ? data.revenue / data.roomNights : 0;
      const avgStay = data.bookings > 0 ? data.totalStay / data.bookings : 0;
      return {
        source,
        category,
        bookings: data.bookings,
        revenue: data.revenue,
        roomNights: data.roomNights,
        arr,
        adr: arr,
        avgStay,
        revenueSharePct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        bookingSharePct: totalBookings > 0 ? (data.bookings / totalBookings) * 100 : 0,
        commissionPct: 0, // Not stored in DB — gap identified in audit
        commissionAmount: 0,
        netRevenue: data.revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Category summary
  const categories: Record<string, { revenue: number; bookings: number; roomNights: number }> = {};
  for (const s of sources) {
    if (!categories[s.category]) categories[s.category] = { revenue: 0, bookings: 0, roomNights: 0 };
    categories[s.category].revenue += s.revenue;
    categories[s.category].bookings += s.bookings;
    categories[s.category].roomNights += s.roomNights;
  }

  const rankings = {
    highestRevenue: sources[0]?.source || "-",
    highestArr: [...sources].sort((a, b) => b.arr - a.arr)[0]?.source || "-",
    highestNetRevenue: [...sources].sort((a, b) => b.netRevenue - a.netRevenue)[0]?.source || "-",
  };

  return { sources, categories, rankings, totalRevenue, totalBookings };
}

// ─────────────────────────────────────────────
// API 5: Revenue Leakage Dashboard
// ─────────────────────────────────────────────

export async function getRevenueLeakage(filters: OwnerBIFilters) {
  const [cancelledRows, noShowRows, propsWithRooms, outstandingRows, billRows] =
    await Promise.all([
      getCancelledInRange(filters),
      getNoShowsInRange(filters),
      getPropertiesWithRooms(filters.propertyIds),
      getOutstandingBills(filters.propertyIds),
      getBillsInRange(filters),
    ]);

  const now = new Date();
  const aging = { d0_7: 0, d8_15: 0, d16_30: 0, d30plus: 0 };
  let totalOutstanding = 0;

  for (const row of outstandingRows) {
    const amount = num(row.balanceAmount) || num(row.billTotal);
    totalOutstanding += amount;

    // Use checkOutDate as due date proxy
    const checkoutDate = new Date(row.checkOutDate);
    const daysOld = Math.max(
      0,
      Math.ceil((now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    if (daysOld <= 7) aging.d0_7 += amount;
    else if (daysOld <= 15) aging.d8_15 += amount;
    else if (daysOld <= 30) aging.d16_30 += amount;
    else aging.d30plus += amount;
  }

  // Outstanding by property
  const outstandingByProp: Record<number, { propertyId: number; outstanding: number }> = {};
  for (const row of outstandingRows) {
    if (!outstandingByProp[row.propertyId]) {
      outstandingByProp[row.propertyId] = { propertyId: row.propertyId, outstanding: 0 };
    }
    outstandingByProp[row.propertyId].outstanding +=
      num(row.balanceAmount) || num(row.billTotal);
  }

  // Cancelled by property
  const cancelledByProp: Record<number, { count: number; revenue: number }> = {};
  let totalCancelledRevenue = 0;
  for (const c of cancelledRows) {
    if (!cancelledByProp[c.propertyId]) cancelledByProp[c.propertyId] = { count: 0, revenue: 0 };
    cancelledByProp[c.propertyId].count++;
    cancelledByProp[c.propertyId].revenue += num(c.totalAmount);
    totalCancelledRevenue += num(c.totalAmount);
  }

  // No-show by property
  const noShowByProp: Record<number, { count: number; revenue: number }> = {};
  let totalNoShowRevenue = 0;
  for (const n of noShowRows) {
    if (!noShowByProp[n.propertyId]) noShowByProp[n.propertyId] = { count: 0, revenue: 0 };
    noShowByProp[n.propertyId].count++;
    noShowByProp[n.propertyId].revenue += num(n.totalAmount);
    totalNoShowRevenue += num(n.totalAmount);
  }

  // Checked-in but no checkout (checked_in status, checkout date has passed)
  const ghostCheckIns = billRows.filter((r) => {
    return (
      r.status === "checked_in" &&
      new Date(r.checkOutDate) < now
    );
  });

  // Bookings confirmed but never checked in (confirmed, checkInDate passed)
  const neverCheckedIn = billRows.filter((r) => {
    return (
      r.status === "confirmed" &&
      new Date(r.checkInDate) < now
    );
  });

  // Unsold inventory
  const days = daysBetween(filters.startDate, filters.endDate);
  const unsoldByProp = propsWithRooms.map((prop) => {
    const propBookings = billRows.filter((r) => r.propertyId === prop.id);
    let occupiedNights = 0;
    const seenBids = new Set<number>();
    for (const b of propBookings) {
      if (seenBids.has(b.bookingId)) continue;
      seenBids.add(b.bookingId);
      occupiedNights += occupiedNightsForBooking(
        b.checkInDate,
        b.checkOutDate,
        filters.startDate,
        filters.endDate
      );
    }

    const availableNights = prop.roomCount * days;
    const unsoldNights = Math.max(0, availableNights - occupiedNights);
    const propArr =
      occupiedNights > 0
        ? propBookings
            .filter((r, i, a) => a.findIndex((x) => x.bookingId === r.bookingId) === i)
            .reduce((s, r) => s + num(r.roomCharges), 0) / occupiedNights
        : 0;

    return {
      propertyId: prop.id,
      propertyName: prop.name,
      totalRooms: prop.roomCount,
      availableNights,
      occupiedNights,
      unsoldNights,
      occupancyPct: availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0,
      arr: propArr,
      potentialRevenueLoss: unsoldNights * propArr,
    };
  });

  const totalUnsoldNights = unsoldByProp.reduce((s, p) => s + p.unsoldNights, 0);
  const totalAvailableNights = unsoldByProp.reduce((s, p) => s + p.availableNights, 0);
  const avgArr = unsoldByProp.reduce((s, p) => s + p.arr, 0) / Math.max(1, unsoldByProp.length);
  const totalPotentialLoss = unsoldByProp.reduce((s, p) => s + p.potentialRevenueLoss, 0);

  return {
    cancelled: {
      count: cancelledRows.length,
      totalRevenue: totalCancelledRevenue,
      byProperty: Object.entries(cancelledByProp).map(([pid, d]) => ({
        propertyId: Number(pid),
        propertyName: propsWithRooms.find((p) => p.id === Number(pid))?.name || "Unknown",
        count: d.count,
        revenue: d.revenue,
      })),
    },
    noShow: {
      count: noShowRows.length,
      totalRevenue: totalNoShowRevenue,
      byProperty: Object.entries(noShowByProp).map(([pid, d]) => ({
        propertyId: Number(pid),
        propertyName: propsWithRooms.find((p) => p.id === Number(pid))?.name || "Unknown",
        count: d.count,
        revenue: d.revenue,
      })),
    },
    outstanding: {
      total: totalOutstanding,
      aging,
      byProperty: Object.values(outstandingByProp).map((o) => ({
        ...o,
        propertyName: propsWithRooms.find((p) => p.id === o.propertyId)?.name || "Unknown",
      })),
    },
    ghostCheckIns: ghostCheckIns.map((r) => ({
      bookingId: r.bookingId,
      propertyId: r.propertyId,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      amount: num(r.billTotal) || num(r.totalAmount),
    })),
    neverCheckedIn: neverCheckedIn.map((r) => ({
      bookingId: r.bookingId,
      propertyId: r.propertyId,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      amount: num(r.billTotal) || num(r.totalAmount),
    })),
    unsoldInventory: {
      properties: unsoldByProp,
      totalUnsoldNights,
      totalAvailableNights,
      avgArr,
      totalPotentialLoss,
    },
    totalLeakage: totalCancelledRevenue + totalNoShowRevenue + totalOutstanding,
  };
}

// ─────────────────────────────────────────────
// API 6: Daily Snapshot
// ─────────────────────────────────────────────

export async function getDailySnapshot(filters: OwnerBIFilters) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const thisMonthStart = todayStr.substring(0, 7) + "-01";
  const thisMonthEnd = todayStr;

  const propIds = filters.propertyIds;

  const [yesterdayData, todayCheckIns, todayCheckOuts, monthData, pendingBills] =
    await Promise.all([
      getBillsInRange({ startDate: yesterdayStr, endDate: yesterdayStr, propertyIds: propIds }),
      // Today's expected check-ins
      db
        .select({ id: bookings.id, propertyId: bookings.propertyId, guestId: bookings.guestId })
        .from(bookings)
        .where(
          and(
            eq(bookings.checkInDate, todayStr),
            inArray(bookings.status, ["confirmed", "pending_advance"]),
            ...(propIds?.length ? [inArray(bookings.propertyId, propIds)] : [])
          )
        ),
      // Today's expected check-outs
      db
        .select({ id: bookings.id, propertyId: bookings.propertyId })
        .from(bookings)
        .where(
          and(
            eq(bookings.checkOutDate, todayStr),
            eq(bookings.status, "checked_in"),
            ...(propIds?.length ? [inArray(bookings.propertyId, propIds)] : [])
          )
        ),
      getBillsInRange({ startDate: thisMonthStart, endDate: thisMonthEnd, propertyIds: propIds }),
      // Pending bills
      db
        .select({ id: bills.id, totalAmount: bills.totalAmount, balanceAmount: bills.balanceAmount })
        .from(bills)
        .where(eq(bills.paymentStatus, "pending")),
    ]);

  // Yesterday revenue
  const yesterdayRevenue = yesterdayData.reduce(
    (s, r) => s + num(r.roomCharges) + num(r.foodCharges) + num(r.extraCharges),
    0
  );
  const yesterdayBookings = new Set(yesterdayData.map((r) => r.bookingId)).size;

  // Yesterday food
  const yestStart = new Date(yesterdayStr + "T00:00:00.000Z");
  const yestEnd = new Date(yesterdayStr + "T23:59:59.999Z");
  const yestFoodCond = [
    gte(orders.createdAt, yestStart),
    lte(orders.createdAt, yestEnd),
    inArray(orders.status, ["delivered", "completed"]),
    eq(orders.isTest, false),
    ...(propIds?.length ? [inArray(orders.propertyId, propIds)] : []),
  ];
  const yesterdayFood = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` })
    .from(orders)
    .where(and(...yestFoodCond));

  // Month revenue
  const monthRevenue = monthData.reduce(
    (s, r) => s + num(r.roomCharges) + num(r.foodCharges) + num(r.extraCharges),
    0
  );
  const monthFood = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, new Date(thisMonthStart + "T00:00:00.000Z")),
        lte(orders.createdAt, new Date(thisMonthEnd + "T23:59:59.999Z")),
        inArray(orders.status, ["delivered", "completed"]),
        eq(orders.isTest, false),
        ...(propIds?.length ? [inArray(orders.propertyId, propIds)] : [])
      )
    );

  // Yesterday ARR & occupancy
  const yesterdayOccupiedNights = yesterdayData.reduce(
    (s, r) =>
      s +
      occupiedNightsForBooking(r.checkInDate, r.checkOutDate, yesterdayStr, yesterdayStr),
    0
  );
  const yesterdayRoomRev = yesterdayData.reduce((s, r) => s + num(r.roomCharges), 0);
  const yesterdayArr =
    yesterdayOccupiedNights > 0 ? yesterdayRoomRev / yesterdayOccupiedNights : 0;

  const pendingPayments = pendingBills.reduce(
    (s, b) => s + (num(b.balanceAmount) || num(b.totalAmount)),
    0
  );

  // Month forecast
  const daysElapsedInMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyRunRate = daysElapsedInMonth > 0 ? (monthRevenue + num(monthFood[0]?.total)) / daysElapsedInMonth : 0;
  const forecastMonthEnd = dailyRunRate * daysInMonth;

  return {
    yesterday: {
      revenue: yesterdayRevenue + num(yesterdayFood[0]?.total),
      roomRevenue: yesterdayRevenue,
      foodRevenue: num(yesterdayFood[0]?.total),
      bookings: yesterdayBookings,
      arr: yesterdayArr,
    },
    today: {
      expectedCheckIns: todayCheckIns.length,
      expectedCheckOuts: todayCheckOuts.length,
      pendingPayments,
    },
    thisMonth: {
      revenue: monthRevenue + num(monthFood[0]?.total),
      roomRevenue: monthRevenue,
      foodRevenue: num(monthFood[0]?.total),
      daysElapsed: daysElapsedInMonth,
      daysInMonth,
    },
    forecast: {
      dailyRunRate,
      forecastMonthEnd,
      daysRemaining: daysInMonth - daysElapsedInMonth,
      achievementPct: 0, // target not stored in DB yet
    },
  };
}

// ─────────────────────────────────────────────
// API 7: Revenue Forecast Calculator
// Pure computation — no DB call needed
// ─────────────────────────────────────────────

export function getRevenueForecast(
  totalRooms: number,
  arr: number,
  days: number
) {
  const occupancies = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  return {
    inputs: { totalRooms, arr, days },
    scenarios: occupancies.map((occ) => ({
      occupancyPct: occ * 100,
      occupiedRooms: Math.round(totalRooms * occ),
      expectedRevenue: Math.round(totalRooms * occ * arr * days),
    })),
  };
}

// ─────────────────────────────────────────────
// AI Insights generator (rule-based)
// ─────────────────────────────────────────────

export async function getOwnerInsights(filters: OwnerBIFilters) {
  const [dashboard, propPerf, leakage] = await Promise.all([
    getOwnerDashboard(filters),
    getPropertyPerformance(filters),
    getRevenueLeakage(filters),
  ]);

  const insights: string[] = [];
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const props = propPerf.properties;

  // Revenue contribution
  if (props.length > 0) {
    const topProp = props.reduce((a, b) => (a.revenue.total > b.revenue.total ? a : b));
    const topShare =
      dashboard.revenue.total > 0
        ? ((topProp.revenue.total / dashboard.revenue.total) * 100).toFixed(0)
        : 0;
    insights.push(
      `${topProp.propertyName} contributed ${topShare}% of total revenue (${fmt(topProp.revenue.total)}).`
    );

    // Highest ARR
    const highArr = props.reduce((a, b) => (a.performance.arr > b.performance.arr ? a : b));
    insights.push(
      `${highArr.propertyName} has the highest ARR at ${fmt(highArr.performance.arr)}/night.`
    );

    // Lowest occupancy
    const lowOcc = props.reduce((a, b) =>
      a.rooms.occupancyPct < b.rooms.occupancyPct ? a : b
    );
    insights.push(
      `${lowOcc.propertyName} has the lowest occupancy at ${lowOcc.rooms.occupancyPct.toFixed(1)}% — consider promotional campaigns.`
    );

    // Food revenue leader
    const topFood = props.reduce((a, b) => (a.revenue.food > b.revenue.food ? a : b));
    if (topFood.revenue.food > 0) {
      insights.push(
        `${topFood.propertyName} generated the highest food revenue at ${fmt(topFood.revenue.food)}.`
      );
    }
  }

  // OTA dependency
  const totalRev = dashboard.revenue.total;
  if (totalRev > 0) {
    const otaShare = (dashboard.revenue.ota / totalRev) * 100;
    if (otaShare > 75) {
      insights.push(
        `OTA dependency is high at ${otaShare.toFixed(0)}% — diversify to direct bookings to reduce commission costs.`
      );
    } else if (otaShare > 50) {
      insights.push(
        `OTA bookings account for ${otaShare.toFixed(0)}% of revenue. Growing direct channels could improve margins.`
      );
    }
  }

  // Revenue leakage
  if (leakage.unsoldInventory.totalPotentialLoss > 0) {
    insights.push(
      `Potential revenue from ${leakage.unsoldInventory.totalUnsoldNights.toLocaleString()} unsold room nights is ${fmt(leakage.unsoldInventory.totalPotentialLoss)}.`
    );
  }
  if (leakage.outstanding.total > 0) {
    insights.push(
      `Outstanding collections of ${fmt(leakage.outstanding.total)} need follow-up — ${leakage.outstanding.byProperty.length} propert${leakage.outstanding.byProperty.length === 1 ? "y" : "ies"} affected.`
    );
  }
  if (leakage.cancelled.count > 0) {
    insights.push(
      `${leakage.cancelled.count} cancellation${leakage.cancelled.count > 1 ? "s" : ""} resulted in ${fmt(leakage.cancelled.totalRevenue)} revenue loss this period.`
    );
  }

  return { insights };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1.1 — NEW FUNCTIONS (DO NOT MODIFY PHASE 1 ABOVE)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// FEATURE 1: Property Targets
// ─────────────────────────────────────────────

export async function getTargetsWithActuals(filters: OwnerBIFilters, month: number, year: number) {
  const propsWithRooms = await getPropertiesWithRooms(filters.propertyIds);
  const days = daysBetween(filters.startDate, filters.endDate);

  // Fetch targets for the given month/year
  const targetConds: any[] = [
    eq(propertyTargets.month, month),
    eq(propertyTargets.year, year),
  ];
  if (filters.propertyIds?.length) targetConds.push(inArray(propertyTargets.propertyId, filters.propertyIds));
  const targets = await db.select().from(propertyTargets).where(and(...targetConds));
  const targetMap = new Map(targets.map((t) => [t.propertyId, t]));

  // Actuals using same methodology as Phase 1 validated calculations
  const [billRows, foodRows] = await Promise.all([
    getBillsInRange(filters),
    getFoodOrdersInRange(filters),
  ]);

  // Aggregate actuals by property
  const byProp: Record<number, { roomRevenue: number; foodRevenue: number; occupiedNights: number; billFood: number }> = {};
  const seenBids = new Set<number>();
  for (const r of billRows) {
    if (!byProp[r.propertyId]) byProp[r.propertyId] = { roomRevenue: 0, foodRevenue: 0, occupiedNights: 0, billFood: 0 };
    if (!seenBids.has(r.bookingId)) {
      seenBids.add(r.bookingId);
      byProp[r.propertyId].roomRevenue += num(r.roomCharges);
      byProp[r.propertyId].billFood += num(r.foodCharges);
      byProp[r.propertyId].occupiedNights += occupiedNightsForBooking(r.checkInDate, r.checkOutDate, filters.startDate, filters.endDate);
    }
  }
  for (const o of foodRows) {
    if (!o.propertyId) continue;
    if (!byProp[o.propertyId]) byProp[o.propertyId] = { roomRevenue: 0, foodRevenue: 0, occupiedNights: 0, billFood: 0 };
    byProp[o.propertyId].foodRevenue += num(o.totalAmount);
  }

  const result = propsWithRooms.map((prop) => {
    const t = targetMap.get(prop.id);
    const a = byProp[prop.id] || { roomRevenue: 0, foodRevenue: 0, occupiedNights: 0, billFood: 0 };
    const totalAvail = prop.roomCount * days;
    const actualRevenue = a.roomRevenue + a.foodRevenue + a.billFood;
    const actualOccupancy = totalAvail > 0 ? (a.occupiedNights / totalAvail) * 100 : 0;
    const actualArr = a.occupiedNights > 0 ? a.roomRevenue / a.occupiedNights : 0;
    const actualFood = a.foodRevenue + a.billFood;

    const revTarget = num(t?.revenueTarget);
    const occTarget = num(t?.occupancyTarget);
    const arrTarget = num(t?.arrTarget);
    const foodTarget = num(t?.foodRevenueTarget);

    const pct = (actual: number, target: number) =>
      target > 0 ? Math.round((actual / target) * 100) : null;

    return {
      propertyId: prop.id,
      propertyName: prop.name,
      targets: { revenue: revTarget, occupancy: occTarget, arr: arrTarget, food: foodTarget, id: t?.id },
      actuals: { revenue: actualRevenue, occupancy: actualOccupancy, arr: actualArr, food: actualFood },
      achievement: {
        revenue: pct(actualRevenue, revTarget),
        occupancy: pct(actualOccupancy, occTarget),
        arr: pct(actualArr, arrTarget),
        food: pct(actualFood, foodTarget),
      },
    };
  });

  return { month, year, properties: result };
}

export async function upsertTarget(data: {
  propertyId: number; month: number; year: number;
  revenueTarget: number; occupancyTarget: number; arrTarget: number; foodRevenueTarget: number;
  createdBy?: string;
}) {
  const existing = await db.select({ id: propertyTargets.id })
    .from(propertyTargets)
    .where(and(
      eq(propertyTargets.propertyId, data.propertyId),
      eq(propertyTargets.month, data.month),
      eq(propertyTargets.year, data.year),
    )).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(propertyTargets)
      .set({
        revenueTarget: String(data.revenueTarget),
        occupancyTarget: String(data.occupancyTarget),
        arrTarget: String(data.arrTarget),
        foodRevenueTarget: String(data.foodRevenueTarget),
        updatedAt: new Date(),
      })
      .where(eq(propertyTargets.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(propertyTargets).values({
      propertyId: data.propertyId,
      month: data.month,
      year: data.year,
      revenueTarget: String(data.revenueTarget),
      occupancyTarget: String(data.occupancyTarget),
      arrTarget: String(data.arrTarget),
      foodRevenueTarget: String(data.foodRevenueTarget),
      createdBy: data.createdBy,
    }).returning();
    return created;
  }
}

// ─────────────────────────────────────────────
// FEATURE 2: OTA Commission Rules
// ─────────────────────────────────────────────

export async function getOtaCommissionRules() {
  return db.select().from(otaCommissionRules).orderBy(otaCommissionRules.sourceName);
}

export async function upsertOtaCommissionRule(data: {
  sourceName: string; commissionPct: number; active?: boolean;
}) {
  const existing = await db.select({ id: otaCommissionRules.id })
    .from(otaCommissionRules)
    .where(eq(otaCommissionRules.sourceName, data.sourceName.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(otaCommissionRules)
      .set({ commissionPct: String(data.commissionPct), active: data.active ?? true, updatedAt: new Date() })
      .where(eq(otaCommissionRules.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(otaCommissionRules).values({
      sourceName: data.sourceName.toLowerCase().trim(),
      commissionPct: String(data.commissionPct),
      active: data.active ?? true,
    }).returning();
    return created;
  }
}

export async function seedDefaultOtaCommissions() {
  const defaults = [
    { sourceName: "booking.com", commissionPct: 18 },
    { sourceName: "makemytrip", commissionPct: 18 },
    { sourceName: "goibibo", commissionPct: 18 },
    { sourceName: "agoda", commissionPct: 20 },
    { sourceName: "airbnb", commissionPct: 15 },
    { sourceName: "hostelworld", commissionPct: 15 },
  ];
  for (const d of defaults) {
    const exists = await db.select({ id: otaCommissionRules.id })
      .from(otaCommissionRules)
      .where(eq(otaCommissionRules.sourceName, d.sourceName))
      .limit(1);
    if (exists.length === 0) {
      await db.insert(otaCommissionRules).values({
        sourceName: d.sourceName,
        commissionPct: String(d.commissionPct),
        active: true,
      });
    }
  }
}

export async function getOtaWithCommissions(filters: OwnerBIFilters) {
  const [billRows, commissions, propsWithRooms] = await Promise.all([
    getBillsInRange(filters),
    getOtaCommissionRules(),
    getPropertiesWithRooms(filters.propertyIds),
  ]);

  const commMap = new Map(commissions.map((c) => [c.sourceName.toLowerCase(), num(c.commissionPct)]));

  const days = daysBetween(filters.startDate, filters.endDate);
  const totalAvailNights = propsWithRooms.reduce((s, p) => s + p.roomCount * days, 0);

  // Aggregate by source (OTA only)
  type SourceData = { bookings: Set<number>; grossRevenue: number; roomRevenue: number; occupiedNights: number; commissionPct: number };
  const bySource: Record<string, SourceData> = {};

  const seenBids = new Set<number>();
  for (const r of billRows) {
    const cat = classifySource(r.source);
    if (cat !== "ota") continue;
    const rawSource = (r.source || "ota").toLowerCase().trim();

    // Find best matching commission rule
    let commPct = 0;
    for (const [ruleName, pct] of commMap) {
      if (rawSource.includes(ruleName) || ruleName.includes(rawSource)) {
        commPct = pct;
        break;
      }
    }
    // Display name: use the matched rule name or clean up raw
    const displayKey = rawSource;

    if (!bySource[displayKey]) {
      bySource[displayKey] = { bookings: new Set(), grossRevenue: 0, roomRevenue: 0, occupiedNights: 0, commissionPct: commPct };
    }
    const s = bySource[displayKey];
    if (!seenBids.has(r.bookingId)) {
      seenBids.add(r.bookingId);
      s.bookings.add(r.bookingId);
      s.grossRevenue += num(r.roomCharges) + num(r.foodCharges) + num(r.extraCharges);
      s.roomRevenue += num(r.roomCharges);
      s.occupiedNights += occupiedNightsForBooking(r.checkInDate, r.checkOutDate, filters.startDate, filters.endDate);
    }
  }

  const totalOtaRevenue = Object.values(bySource).reduce((s, d) => s + d.grossRevenue, 0);

  const rows = Object.entries(bySource).map(([source, d]) => {
    const gross = d.grossRevenue;
    const commAmt = gross * (d.commissionPct / 100);
    const net = gross - commAmt;
    const arr = d.occupiedNights > 0 ? d.roomRevenue / d.occupiedNights : 0;
    const occContrib = totalAvailNights > 0 ? (d.occupiedNights / totalAvailNights) * 100 : 0;
    return {
      source,
      bookings: d.bookings.size,
      grossRevenue: gross,
      commissionPct: d.commissionPct,
      commissionAmount: commAmt,
      netRevenue: net,
      revenueShare: totalOtaRevenue > 0 ? (gross / totalOtaRevenue) * 100 : 0,
      arr,
      occupancyContribution: occContrib,
    };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);
  const totalNet = rows.reduce((s, r) => s + r.netRevenue, 0);
  const highestCost = rows.reduce((a, b) => a.commissionAmount > b.commissionAmount ? a : b, rows[0]);
  const highestProfit = rows.reduce((a, b) => a.netRevenue > b.netRevenue ? a : b, rows[0]);

  return {
    rows,
    totals: {
      otaRevenue: totalOtaRevenue,
      otaCommission: totalCommission,
      netOtaRevenue: totalNet,
      highestCostOta: highestCost?.source || null,
      highestProfitOta: highestProfit?.source || null,
    },
  };
}

// ─────────────────────────────────────────────
// FEATURE 3: Room Inventory Certification
// ─────────────────────────────────────────────

export async function getInventoryStatus(propertyIds?: number[]) {
  const props = await getPropertiesWithRooms(propertyIds);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch live room counts from DB
  const roomConds: any[] = [eq(rooms.status, "active")];
  if (propertyIds?.length) roomConds.push(inArray(rooms.propertyId, propertyIds));
  const activeRoomsDb = await db.select({
    propertyId: rooms.propertyId,
    count: sql<number>`COUNT(*)::int`,
  }).from(rooms).where(and(...roomConds)).groupBy(rooms.propertyId);
  const activeMap = new Map(activeRoomsDb.map((r) => [r.propertyId, r.count]));

  const oooRoomsDb = await db.select({
    propertyId: rooms.propertyId,
    count: sql<number>`COUNT(*)::int`,
  }).from(rooms).where(and(
    eq(rooms.status, "out_of_order"),
    ...(propertyIds?.length ? [inArray(rooms.propertyId, propertyIds)] : []),
  )).groupBy(rooms.propertyId);
  const oooMap = new Map(oooRoomsDb.map((r) => [r.propertyId, r.count]));

  // Fetch latest certification per property
  const certConds: any[] = [eq(propertyInventoryCertifications.month, month), eq(propertyInventoryCertifications.year, year)];
  if (propertyIds?.length) certConds.push(inArray(propertyInventoryCertifications.propertyId, propertyIds));
  const certs = await db.select().from(propertyInventoryCertifications).where(and(...certConds));
  const certMap = new Map(certs.map((c) => [c.propertyId, c]));

  return props.map((prop) => {
    const active = activeMap.get(prop.id) || 0;
    const ooo = oooMap.get(prop.id) || 0;
    const total = prop.roomCount;
    const saleable = active - ooo;
    const cert = certMap.get(prop.id);
    return {
      propertyId: prop.id,
      propertyName: prop.name,
      configuredRooms: total,
      activeRooms: active,
      outOfOrderRooms: ooo,
      saleableRooms: Math.max(0, saleable),
      certifiedThisMonth: !!cert,
      certifiedAt: cert?.certifiedAt || null,
      certifiedBy: cert?.certifiedBy || null,
      certSaleableRooms: cert?.saleableRooms || null,
      notes: cert?.notes || null,
      alert: cert && cert.saleableRooms !== Math.max(0, saleable)
        ? `Room count changed since last certification (was ${cert.saleableRooms}, now ${Math.max(0, saleable)})`
        : null,
    };
  });
}

export async function createCertification(data: {
  propertyId: number; month: number; year: number;
  activeRooms: number; outOfOrderRooms: number; saleableRooms: number;
  certifiedBy?: string; notes?: string;
}) {
  // Upsert (one certification per property per month)
  const existing = await db.select({ id: propertyInventoryCertifications.id })
    .from(propertyInventoryCertifications)
    .where(and(
      eq(propertyInventoryCertifications.propertyId, data.propertyId),
      eq(propertyInventoryCertifications.month, data.month),
      eq(propertyInventoryCertifications.year, data.year),
    )).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(propertyInventoryCertifications)
      .set({ activeRooms: data.activeRooms, outOfOrderRooms: data.outOfOrderRooms, saleableRooms: data.saleableRooms, certifiedBy: data.certifiedBy, certifiedAt: new Date(), notes: data.notes })
      .where(eq(propertyInventoryCertifications.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(propertyInventoryCertifications).values({ ...data, certifiedAt: new Date() }).returning();
    return created;
  }
}

// ─────────────────────────────────────────────
// FEATURE 4: Revenue Opportunity Dashboard
// ─────────────────────────────────────────────

export async function getRevenueOpportunity(filters: OwnerBIFilters) {
  const [billRows, propsWithRooms] = await Promise.all([
    getBillsInRange(filters),
    getPropertiesWithRooms(filters.propertyIds),
  ]);

  const days = daysBetween(filters.startDate, filters.endDate);

  const byProp: Record<number, { roomRevenue: number; occupiedNights: number; seenBids: Set<number> }> = {};
  for (const r of billRows) {
    if (!byProp[r.propertyId]) byProp[r.propertyId] = { roomRevenue: 0, occupiedNights: 0, seenBids: new Set() };
    if (!byProp[r.propertyId].seenBids.has(r.bookingId)) {
      byProp[r.propertyId].seenBids.add(r.bookingId);
      byProp[r.propertyId].roomRevenue += num(r.roomCharges);
      byProp[r.propertyId].occupiedNights += occupiedNightsForBooking(r.checkInDate, r.checkOutDate, filters.startDate, filters.endDate);
    }
  }

  const rows = propsWithRooms.map((prop) => {
    const d = byProp[prop.id] || { roomRevenue: 0, occupiedNights: 0 };
    const availNights = prop.roomCount * days;
    const occupiedNights = d.occupiedNights;
    const unsoldNights = Math.max(0, availNights - occupiedNights);
    const arr = occupiedNights > 0 ? d.roomRevenue / occupiedNights : 0;
    const occupancyPct = availNights > 0 ? (occupiedNights / availNights) * 100 : 0;
    const potentialLoss = unsoldNights * arr;
    const status = occupancyPct < 30 ? "critical" : occupancyPct < 50 ? "warning" : "healthy";
    return {
      propertyId: prop.id,
      propertyName: prop.name,
      totalRooms: prop.roomCount,
      availableNights: availNights,
      occupiedNights,
      unsoldNights,
      arr,
      occupancyPct,
      potentialRevenueLoss: potentialLoss,
      status,
    };
  }).sort((a, b) => b.potentialRevenueLoss - a.potentialRevenueLoss);

  const totalUnsold = rows.reduce((s, r) => s + r.unsoldNights, 0);
  const totalOpportunity = rows.reduce((s, r) => s + r.potentialRevenueLoss, 0);
  const criticalCount = rows.filter((r) => r.status === "critical").length;

  return { rows, summary: { totalUnsoldNights: totalUnsold, totalOpportunity, criticalCount, days } };
}

// ─────────────────────────────────────────────
// FEATURE 5: Owner Action Center
// ─────────────────────────────────────────────

export async function getActionCenter(filters: OwnerBIFilters) {
  const [dashboard, opportunity, leakage, targets] = await Promise.all([
    getOwnerDashboard(filters),
    getRevenueOpportunity(filters),
    getRevenueLeakage(filters),
    (async () => {
      const now = new Date();
      return getTargetsWithActuals(filters, now.getMonth() + 1, now.getFullYear());
    })(),
  ]);

  const actions: Array<{
    property: string; propertyId: number; issue: string; impact: string;
    suggestedAction: string; expectedGain: string; priority: "critical" | "high" | "medium";
  }> = [];

  const INR = (v: number) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + "L" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v.toFixed(0)}`;

  // Low occupancy alerts
  for (const r of opportunity.rows) {
    if (r.status === "critical") {
      actions.push({
        property: r.propertyName, propertyId: r.propertyId,
        issue: `${r.propertyName} occupancy is critically low at ${r.occupancyPct.toFixed(1)}%`,
        impact: `${r.unsoldNights} unsold room nights — ${INR(r.potentialRevenueLoss)} revenue opportunity`,
        suggestedAction: "Run weekend promotions, contact travel agents, offer early-bird discounts",
        expectedGain: INR(r.potentialRevenueLoss * 0.3),
        priority: "critical",
      });
    } else if (r.status === "warning") {
      actions.push({
        property: r.propertyName, propertyId: r.propertyId,
        issue: `${r.propertyName} occupancy at ${r.occupancyPct.toFixed(1)}% — below 50% threshold`,
        impact: `${r.unsoldNights} unsold nights — ${INR(r.potentialRevenueLoss)} at risk`,
        suggestedAction: "Push OTA availability, run dynamic pricing, target corporate clients",
        expectedGain: INR(r.potentialRevenueLoss * 0.25),
        priority: "high",
      });
    }
  }

  // Target misses
  for (const p of targets.properties) {
    const revAch = p.achievement.revenue;
    if (revAch !== null && revAch < 80) {
      actions.push({
        property: p.propertyName, propertyId: p.propertyId,
        issue: `${p.propertyName} revenue at ${revAch}% of target`,
        impact: `${INR(p.targets.revenue - p.actuals.revenue)} revenue gap this month`,
        suggestedAction: "Review room rates, upsell services, focus on high-value bookings",
        expectedGain: INR((p.targets.revenue - p.actuals.revenue) * 0.4),
        priority: revAch < 60 ? "critical" : "high",
      });
    }
    const foodAch = p.achievement.food;
    if (foodAch !== null && foodAch < 80 && p.targets.food > 0) {
      actions.push({
        property: p.propertyName, propertyId: p.propertyId,
        issue: `${p.propertyName} food revenue at ${foodAch}% of target`,
        impact: `${INR(p.targets.food - p.actuals.food)} food revenue gap`,
        suggestedAction: "Push meal packages, introduce combo offers, train staff on upselling",
        expectedGain: INR((p.targets.food - p.actuals.food) * 0.35),
        priority: "medium",
      });
    }
  }

  // Outstanding collections
  if (leakage.outstanding.total > 10000) {
    actions.push({
      property: "All Properties", propertyId: 0,
      issue: `Outstanding collections of ${INR(leakage.outstanding.total)} pending`,
      impact: "Cash flow affected — revenue recognized but not collected",
      suggestedAction: "Follow up with guests, send payment reminders, escalate overdue bills",
      expectedGain: INR(leakage.outstanding.total * 0.7),
      priority: "high",
    });
  }

  // High OTA dependency
  const rev = (dashboard as any).revenue;
  const otaRev = (dashboard as any).sourceBreakdown?.ota?.revenue || 0;
  const totalRev = rev?.total || 0;
  const otaPct = totalRev > 0 ? (otaRev / totalRev) * 100 : 0;
  if (otaPct > 75) {
    actions.push({
      property: "All Properties", propertyId: 0,
      issue: `OTA dependency is ${otaPct.toFixed(1)}% — above 75% threshold`,
      impact: "High commission costs reducing net revenue",
      suggestedAction: "Invest in direct booking website, offer loyalty discounts for repeat guests",
      expectedGain: INR(otaRev * 0.05),
      priority: "medium",
    });
  }

  // Sort: critical first
  actions.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.priority] - order[b.priority];
  });

  return { actions, summary: { total: actions.length, critical: actions.filter((a) => a.priority === "critical").length, high: actions.filter((a) => a.priority === "high").length } };
}

// ─────────────────────────────────────────────
// FEATURE 6: CEO Homepage Summary
// ─────────────────────────────────────────────

export async function getCeoSummary(filters: OwnerBIFilters) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const ydayStr = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const propIds = filters.propertyIds;

  // Today's revenue from bills
  const [todayBills, yesterdayBills, monthBills, outstandingBills, monthTargets, snapshotData, opportunityData] =
    await Promise.all([
      getBillsInRange({ startDate: todayStr, endDate: todayStr, propertyIds: propIds }),
      getBillsInRange({ startDate: ydayStr, endDate: ydayStr, propertyIds: propIds }),
      getBillsInRange({ startDate: monthStart, endDate: todayStr, propertyIds: propIds }),
      getOutstandingBills(propIds),
      (async () => {
        const t = await db.select().from(propertyTargets).where(and(
          eq(propertyTargets.month, now.getMonth() + 1),
          eq(propertyTargets.year, now.getFullYear()),
          ...(propIds?.length ? [inArray(propertyTargets.propertyId, propIds)] : []),
        ));
        return t.reduce((s, r) => s + num(r.revenueTarget), 0);
      })(),
      getDailySnapshot(propIds),
      getRevenueOpportunity({ startDate: monthStart, endDate: todayStr, propertyIds: propIds }),
    ]);

  const calcRev = (rows: typeof todayBills) => {
    const seen = new Set<number>();
    return rows.reduce((s, r) => {
      if (seen.has(r.bookingId)) return s;
      seen.add(r.bookingId);
      return s + num(r.roomCharges) + num(r.foodCharges) + num(r.extraCharges);
    }, 0);
  };

  const todayRev = calcRev(todayBills);
  const ydayRev = calcRev(yesterdayBills);
  const monthRev = calcRev(monthBills);
  const outstanding = outstandingBills.reduce((s, r) => s + (num(r.balanceAmount) || num(r.billTotal)), 0);
  const targetAch = monthTargets > 0 ? Math.round((monthRev / monthTargets) * 100) : null;

  // Occupancy (month to date)
  const propsWithRooms = await getPropertiesWithRooms(propIds);
  const daysMtd = daysBetween(monthStart, todayStr);
  const totalAvail = propsWithRooms.reduce((s, p) => s + p.roomCount * daysMtd, 0);
  const seenBids = new Set<number>();
  let occupiedNights = 0;
  let roomRevMonth = 0;
  for (const r of monthBills) {
    if (seenBids.has(r.bookingId)) continue;
    seenBids.add(r.bookingId);
    occupiedNights += occupiedNightsForBooking(r.checkInDate, r.checkOutDate, monthStart, todayStr);
    roomRevMonth += num(r.roomCharges);
  }
  const occupancy = totalAvail > 0 ? (occupiedNights / totalAvail) * 100 : 0;
  const arr = occupiedNights > 0 ? roomRevMonth / occupiedNights : 0;
  const revpar = totalAvail > 0 ? roomRevMonth / totalAvail : 0;

  const leakage = (snapshotData as any).pendingBillsAmount || 0;
  const opportunity = opportunityData.summary.totalOpportunity;

  return {
    today: todayRev,
    yesterday: ydayRev,
    monthToDate: monthRev,
    monthTarget: monthTargets,
    targetAchievement: targetAch,
    occupancy,
    arr,
    revpar,
    outstanding,
    leakage,
    opportunity,
  };
}
