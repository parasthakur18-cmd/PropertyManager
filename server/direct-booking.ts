/**
 * Direct Booking Engine — public API logic
 *
 * All functions here are called from the unauthenticated /api/public/book/*
 * routes. They intentionally reuse existing DB tables (rooms, bookings, guests)
 * so Hostezee remains the single source of truth.
 *
 * RACE-CONDITION FIX (createWebsiteBooking):
 *   Room assignment and booking INSERT run inside a single pg transaction.
 *   SELECT … FOR UPDATE on the rooms rows serialises concurrent requests —
 *   the second concurrent request blocks until the first commits, then sees
 *   the newly-inserted booking and correctly returns 409.
 */
import crypto from "crypto";
import { db, pool } from "./db";
import { rooms, bookings, guests, properties } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Normalize any Date / ISO string to YYYY-MM-DD for TZ-safe overlap comparisons */
function toDay(d: Date | string): string {
  return (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
}

function nightCount(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PublicRoomType {
  roomType: string;
  roomCategory: string;
  pricePerNight: number;
  maxOccupancy: number;
  totalBeds: number;
  amenities: string[];
  roomIds: number[];
}

export interface AvailableRoomType extends PublicRoomType {
  availableRooms: number;
}

export interface WebsiteBookingSummary {
  token: string;
  bookingId: number;
  status: string;
  holdExpiresAt: string | null;
  propertyId: number;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  paymentLinkUrl: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
}

// ── Public Property Info ────────────────────────────────────────────────────────

export async function getBookingProperty(propertyId: number) {
  const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId));
  if (!prop) throw Object.assign(new Error("Property not found"), { status: 404 });
  if (!(prop as any).directBookingEnabled) {
    throw Object.assign(new Error("Direct booking is not enabled for this property"), { status: 403 });
  }
  return {
    id: prop.id,
    name: prop.name,
    location: prop.location,
    description: prop.description,
    contactEmail: prop.contactEmail,
    contactPhone: prop.contactPhone,
  };
}

// ── Room Types ──────────────────────────────────────────────────────────────────

export async function getPublicRooms(propertyId: number): Promise<PublicRoomType[]> {
  await getBookingProperty(propertyId);

  const allRooms = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));

  const typeMap = new Map<string, PublicRoomType>();
  for (const r of allRooms) {
    if (["maintenance", "out-of-order", "blocked"].includes(r.status ?? "")) continue;
    const key = r.roomType;
    if (!typeMap.has(key)) {
      typeMap.set(key, {
        roomType: r.roomType,
        roomCategory: r.roomCategory ?? "standard",
        pricePerNight: parseFloat(r.pricePerNight),
        maxOccupancy: r.maxOccupancy,
        totalBeds: r.totalBeds ?? 1,
        amenities: (r.amenities ?? []).filter(Boolean),
        roomIds: [],
      });
    }
    typeMap.get(key)!.roomIds.push(r.id);
  }

  return Array.from(typeMap.values()).sort((a, b) => a.pricePerNight - b.pricePerNight);
}

// ── Availability ───────────────────────────────────────────────────────────────

export async function getPublicAvailability(
  propertyId: number,
  checkIn: string,
  checkOut: string,
  requestedGuests?: number,
): Promise<AvailableRoomType[]> {
  await getBookingProperty(propertyId);

  if (checkOut <= checkIn) throw Object.assign(new Error("Check-out must be after check-in"), { status: 400 });
  const today = toDay(new Date());
  if (checkIn < today) throw Object.assign(new Error("Check-in date cannot be in the past"), { status: 400 });

  const roomTypes = await getPublicRooms(propertyId);
  const allRoomIds = roomTypes.flatMap(rt => rt.roomIds);

  if (allRoomIds.length === 0) return [];

  const activeBookings = await db.select({
    id: bookings.id,
    roomId: bookings.roomId,
    roomIds: bookings.roomIds,
    checkInDate: bookings.checkInDate,
    checkOutDate: bookings.checkOutDate,
    status: bookings.status,
    bedsBooked: bookings.bedsBooked,
    numberOfGuests: bookings.numberOfGuests,
  }).from(bookings).where(
    and(
      eq(bookings.propertyId, propertyId),
      inArray(bookings.status, ["pending", "pending_payment", "confirmed", "checked-in"]),
      sql`${bookings.checkOutDate} > ${checkIn}`,
      sql`${bookings.checkInDate} < ${checkOut}`,
    )
  );

  const result: AvailableRoomType[] = [];

  for (const rt of roomTypes) {
    if (requestedGuests && rt.maxOccupancy < requestedGuests && rt.roomCategory !== "dormitory") continue;

    const isDorm = rt.roomCategory === "dormitory";

    if (isDorm) {
      let totalBedsInType = 0;
      let bedsOccupied = 0;

      for (const roomId of rt.roomIds) {
        const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).then(r => r[0]);
        if (!room) continue;
        totalBedsInType += room.totalBeds ?? 1;

        const roomBookings = activeBookings.filter(b => b.roomId === roomId || (b.roomIds ?? []).includes(roomId));
        for (const b of roomBookings) {
          bedsOccupied += b.bedsBooked || b.numberOfGuests || 1;
        }
      }
      const bedsAvailable = Math.max(0, totalBedsInType - bedsOccupied);
      if (bedsAvailable > 0) result.push({ ...rt, availableRooms: bedsAvailable });
    } else {
      let availableCount = 0;
      for (const roomId of rt.roomIds) {
        const overlapping = activeBookings.filter(b => {
          const bRooms = [b.roomId, ...(b.roomIds ?? [])].filter(Boolean);
          return bRooms.includes(roomId);
        });
        if (overlapping.length === 0) availableCount++;
      }
      if (availableCount > 0) result.push({ ...rt, availableRooms: availableCount });
    }
  }

  return result;
}

// ── Website Booking Creation (TRANSACTION-SAFE) ────────────────────────────────

export interface CreateWebsiteBookingInput {
  propertyId: number;
  roomType: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  bedsRequested?: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  specialRequests?: string;
  mealPlan?: string;
}

export async function createWebsiteBooking(input: CreateWebsiteBookingInput): Promise<WebsiteBookingSummary> {
  // ── Pre-transaction validation (fast, no locks needed) ──────────────────────
  await getBookingProperty(input.propertyId);

  if (input.checkOut <= input.checkIn) {
    throw Object.assign(new Error("Check-out must be after check-in"), { status: 400 });
  }
  const nights = nightCount(input.checkIn, input.checkOut);
  if (nights < 1) throw Object.assign(new Error("Minimum stay is 1 night"), { status: 400 });

  const today = toDay(new Date());
  if (input.checkIn < today) {
    throw Object.assign(new Error("Check-in date cannot be in the past"), { status: 400 });
  }

  const cleanPhone = input.guestPhone.replace(/[^\d]/g, "");
  if (cleanPhone.length < 10) {
    throw Object.assign(new Error("Please provide a valid 10-digit phone number"), { status: 400 });
  }

  // ── Guest upsert (outside transaction — not the race-prone section) ─────────
  let guestId: number;
  const phoneVariants = [...new Set([input.guestPhone, cleanPhone, `+91${cleanPhone.slice(-10)}`])];
  const existingGuests = await db.select().from(guests).where(
    inArray(guests.phone, phoneVariants)
  ).limit(1);

  if (existingGuests.length > 0) {
    guestId = existingGuests[0].id;
    if (
      existingGuests[0].fullName !== input.guestName ||
      (input.guestEmail && existingGuests[0].email !== input.guestEmail)
    ) {
      await db.update(guests).set({
        fullName: input.guestName,
        ...(input.guestEmail ? { email: input.guestEmail } : {}),
      }).where(eq(guests.id, guestId));
    }
  } else {
    const [newGuest] = await db.insert(guests).values({
      fullName: input.guestName,
      phone: input.guestPhone,
      email: input.guestEmail ?? null,
    }).returning();
    guestId = newGuest.id;
  }

  // ── Generate token + expiry before entering the transaction ─────────────────
  const token = generateToken();
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // ── TRANSACTION: lock rooms → check overlaps → assign → insert ──────────────
  //
  // SELECT … FOR UPDATE on the rooms rows serialises concurrent transactions.
  // A second concurrent request for the same room type will block at the FOR UPDATE
  // until the first transaction commits.  After commit, the second transaction
  // re-reads the bookings table inside the same transaction and correctly sees
  // the booking just inserted — returning 409 if no inventory remains.
  //
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    // 1. Lock all rooms of the requested type for the duration of this transaction.
    //    ORDER BY id ensures all callers acquire locks in the same order, preventing deadlock.
    const lockResult = await client.query<{
      id: number;
      room_category: string;
      price_per_night: string;
      max_occupancy: number;
      total_beds: number | null;
    }>(
      `SELECT id, room_category, price_per_night, max_occupancy, total_beds
       FROM rooms
       WHERE property_id = $1
         AND room_type = $2
         AND COALESCE(status, 'available') NOT IN ('maintenance', 'out-of-order', 'blocked')
       ORDER BY id
       FOR UPDATE`,
      [input.propertyId, input.roomType],
    );

    if (lockResult.rows.length === 0) {
      throw Object.assign(new Error("No rooms of this type exist at this property"), { status: 409 });
    }

    const lockedRooms = lockResult.rows;
    const lockedRoomIds = lockedRooms.map(r => r.id);
    const isDorm = lockedRooms[0].room_category === "dormitory";
    const pricePerNight = parseFloat(lockedRooms[0].price_per_night);

    // 2. Fetch overlapping bookings for the locked rooms — inside the transaction
    //    so we see the latest committed state (including any booking the concurrent
    //    request just committed a moment ago).
    const overlapResult = await client.query<{
      room_id: number | null;
      room_ids: number[] | null;
      beds_booked: number | null;
      number_of_guests: number | null;
    }>(
      `SELECT room_id, room_ids, beds_booked, number_of_guests
       FROM bookings
       WHERE property_id = $1
         AND status IN ('pending', 'pending_payment', 'confirmed', 'checked-in')
         AND check_out_date > $2
         AND check_in_date  < $3
         AND (room_id = ANY($4) OR room_ids && $4)`,
      [input.propertyId, input.checkIn, input.checkOut, lockedRoomIds],
    );

    const overlapping = overlapResult.rows;

    // 3. Assign the first free room (or check bed capacity for dorms).
    let assignedRoomId: number;

    if (isDorm) {
      const totalBeds = lockedRooms.reduce((s, r) => s + (r.total_beds ?? 1), 0);
      const bedsOccupied = overlapping.reduce((s, b) => s + (b.beds_booked ?? b.number_of_guests ?? 1), 0);
      const bedsNeeded = input.bedsRequested ?? input.numberOfGuests;
      if (totalBeds - bedsOccupied < bedsNeeded) {
        throw Object.assign(
          new Error("No beds available for the selected dates — please try different dates"),
          { status: 409 },
        );
      }
      assignedRoomId = lockedRoomIds[0];
    } else {
      const freeRoom = lockedRoomIds.find(roomId => {
        return !overlapping.some(b => {
          const bRooms = [b.room_id, ...(b.room_ids ?? [])].filter((x): x is number => x != null);
          return bRooms.includes(roomId);
        });
      });

      if (!freeRoom) {
        throw Object.assign(
          new Error("Room no longer available — another booking was just confirmed. Please search again."),
          { status: 409 },
        );
      }
      assignedRoomId = freeRoom;
    }

    // 4. Insert the booking inside the same transaction.
    const totalAmount = pricePerNight * nights;
    const advanceAmount = Math.ceil(totalAmount * 0.30);

    const insertResult = await client.query<{ id: number }>(
      `INSERT INTO bookings (
         property_id, room_id, guest_id,
         check_in_date, check_out_date,
         number_of_guests, beds_booked,
         status, total_amount, advance_amount,
         advance_payment_status, source, meal_plan,
         special_requests, created_by,
         website_booking_token, payment_hold_expires_at
       ) VALUES (
         $1,  $2,  $3,
         $4,  $5,
         $6,  $7,
         'pending_payment', $8, $9,
         'pending', 'website', $10,
         $11, 'website',
         $12, $13
       ) RETURNING id`,
      [
        input.propertyId, assignedRoomId, guestId,
        input.checkIn, input.checkOut,
        input.numberOfGuests, isDorm ? (input.bedsRequested ?? input.numberOfGuests) : null,
        String(totalAmount), String(advanceAmount),
        input.mealPlan ?? "EP",
        input.specialRequests ?? null,
        token, holdExpiresAt,
      ],
    );

    await client.query("COMMIT");
    committed = true;

    const bookingId = insertResult.rows[0].id;

    return {
      token,
      bookingId,
      status: "pending_payment",
      holdExpiresAt: holdExpiresAt.toISOString(),
      propertyId: input.propertyId,
      roomType: input.roomType,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      guests: input.numberOfGuests,
      totalAmount,
      paymentLinkUrl: null,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail ?? null,
    };

  } catch (err) {
    if (!committed) {
      try { await client.query("ROLLBACK"); } catch { /* ignore rollback error */ }
    }
    throw err;
  } finally {
    client.release();
  }
}

// ── Initiate Payment ───────────────────────────────────────────────────────────

export async function initiateWebsitePayment(token: string): Promise<{ paymentLinkUrl: string; advanceAmount: number }> {
  const booking = await getWebsiteBookingByToken(token);
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

  if (booking.status === "confirmed") {
    throw Object.assign(new Error("This booking is already confirmed"), { status: 400 });
  }
  if (booking.status !== "pending_payment") {
    throw Object.assign(new Error("Booking is not in payment pending state"), { status: 400 });
  }
  if (booking.holdExpiresAt && new Date(booking.holdExpiresAt) < new Date()) {
    throw Object.assign(new Error("Booking hold has expired. Please search again."), { status: 410 });
  }

  const advanceAmount = Math.ceil(booking.totalAmount * 0.30);

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw Object.assign(new Error("Payment gateway not configured"), { status: 503 });

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const referenceId = `WEB-${token}`;
  const cleanPhone = booking.guestPhone.replace(/[^\d]/g, "");

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(advanceAmount * 100),
      currency: "INR",
      accept_partial: false,
      description: `Advance for ${booking.roomType} at ${booking.propertyId} | ${booking.checkIn}→${booking.checkOut}`,
      reference_id: referenceId,
      customer: {
        name: booking.guestName,
        ...(booking.guestEmail ? { email: booking.guestEmail } : {}),
        contact: cleanPhone,
      },
      notify: { sms: false, email: false },
      upi_link: true,
      expire_by: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  });

  if (!response.ok) {
    const err: any = await response.json();
    throw Object.assign(
      new Error(`Payment gateway error: ${err.error?.description ?? "Unknown error"}`),
      { status: 502 },
    );
  }

  const data: any = await response.json();
  const paymentLinkUrl: string = data.short_url;

  await db.update(bookings as any).set({
    paymentLinkId: data.id,
    paymentLinkUrl,
    paymentLinkExpiry: new Date(Date.now() + 60 * 60 * 1000),
  } as any).where(eq(bookings.id, booking.bookingId));

  return { paymentLinkUrl, advanceAmount };
}

// ── Status Check ───────────────────────────────────────────────────────────────

export async function getWebsiteBookingByToken(token: string): Promise<WebsiteBookingSummary | null> {
  const [row] = await db.select({
    id: bookings.id,
    status: bookings.status,
    propertyId: bookings.propertyId,
    roomId: bookings.roomId,
    checkInDate: bookings.checkInDate,
    checkOutDate: bookings.checkOutDate,
    numberOfGuests: bookings.numberOfGuests,
    totalAmount: bookings.totalAmount,
    paymentLinkUrl: bookings.paymentLinkUrl,
    holdExpiresAt: (bookings as any).paymentHoldExpiresAt,
    guestId: bookings.guestId,
  }).from(bookings).where(
    eq((bookings as any).websiteBookingToken, token)
  ).limit(1);

  if (!row) return null;

  let roomType = "Unknown";
  if (row.roomId) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, row.roomId));
    if (room) roomType = room.roomType;
  }

  let guestName = "", guestPhone = "", guestEmail: string | null = null;
  if (row.guestId) {
    const [guest] = await db.select().from(guests).where(eq(guests.id, row.guestId));
    if (guest) { guestName = guest.fullName; guestPhone = guest.phone; guestEmail = guest.email ?? null; }
  }

  const checkIn = toDay(row.checkInDate as any);
  const checkOut = toDay(row.checkOutDate as any);

  return {
    token,
    bookingId: row.id,
    status: row.status ?? "pending_payment",
    holdExpiresAt: row.holdExpiresAt ? new Date(row.holdExpiresAt as any).toISOString() : null,
    propertyId: row.propertyId,
    roomType,
    checkIn,
    checkOut,
    nights: nightCount(checkIn, checkOut),
    guests: row.numberOfGuests ?? 1,
    totalAmount: parseFloat(row.totalAmount ?? "0"),
    paymentLinkUrl: row.paymentLinkUrl ?? null,
    guestName,
    guestPhone,
    guestEmail,
  };
}

// ── Cancel Hold ────────────────────────────────────────────────────────────────

export async function cancelWebsiteBookingHold(token: string): Promise<void> {
  const booking = await getWebsiteBookingByToken(token);
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  if (booking.status === "confirmed") {
    throw Object.assign(new Error("Confirmed bookings cannot be cancelled here. Please contact the property."), { status: 400 });
  }
  if (!["pending_payment", "pending"].includes(booking.status)) return;

  await db.update(bookings).set({ status: "cancelled" } as any).where(eq(bookings.id, booking.bookingId));
}

// ── Hold Expiry Cron ───────────────────────────────────────────────────────────

export async function expireStaleWebsiteHolds(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      UPDATE bookings
      SET status = 'cancelled', cancellation_reason = 'Payment hold expired (website booking)'
      WHERE status = 'pending_payment'
        AND website_booking_token IS NOT NULL
        AND payment_hold_expires_at IS NOT NULL
        AND payment_hold_expires_at < NOW()
      RETURNING id
    `);
    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`[DIRECT-BOOKING] Expired ${count} stale website holds`);
    }
    return count;
  } finally {
    client.release();
  }
}

/** Start the background cron that expires stale payment holds every 5 minutes */
export function startHoldExpiryCron(): void {
  expireStaleWebsiteHolds().catch(() => {});
  setInterval(() => expireStaleWebsiteHolds().catch((e) => {
    console.warn("[DIRECT-BOOKING] Hold expiry cron error:", e.message);
  }), 5 * 60 * 1000);
  console.log("[DIRECT-BOOKING] Hold expiry cron started (every 5 min)");
}
