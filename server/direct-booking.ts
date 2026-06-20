/**
 * Direct Booking Engine — public API logic
 *
 * All functions here are called from the unauthenticated /api/public/book/*
 * routes. They intentionally reuse existing DB tables (rooms, bookings, guests)
 * so Hostezee remains the single source of truth.
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
  roomCategory: string;            // 'standard' | 'dormitory' | etc.
  pricePerNight: number;
  maxOccupancy: number;
  totalBeds: number;               // relevant for dormitories
  amenities: string[];
  roomIds: number[];               // all room IDs of this type
}

export interface AvailableRoomType extends PublicRoomType {
  availableRooms: number;          // rooms / beds free for the entire date range
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
  await getBookingProperty(propertyId); // validates enabled

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
    const entry = typeMap.get(key)!;
    entry.roomIds.push(r.id);
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

  // Fetch all active bookings that overlap the requested date range
  // Overlap: bOut > checkIn AND bIn < checkOut  (standard hotel standard)
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
    if (requestedGuests && rt.maxOccupancy < requestedGuests && rt.roomCategory !== "dormitory") {
      // Single-room capacity too low — skip
      continue;
    }

    const isDorm = rt.roomCategory === "dormitory";

    if (isDorm) {
      // For dormitories, count beds booked across all rooms of this type
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
      if (bedsAvailable > 0) {
        result.push({ ...rt, availableRooms: bedsAvailable });
      }
    } else {
      // Regular rooms — count how many rooms of this type are free for the entire date range
      let availableCount = 0;
      for (const roomId of rt.roomIds) {
        const overlapping = activeBookings.filter(b => {
          const bRooms = [b.roomId, ...(b.roomIds ?? [])].filter(Boolean);
          return bRooms.includes(roomId);
        });
        if (overlapping.length === 0) availableCount++;
      }
      if (availableCount > 0) {
        result.push({ ...rt, availableRooms: availableCount });
      }
    }
  }

  return result;
}

// ── Website Booking Creation ───────────────────────────────────────────────────

export interface CreateWebsiteBookingInput {
  propertyId: number;
  roomType: string;
  checkIn: string;       // YYYY-MM-DD
  checkOut: string;      // YYYY-MM-DD
  numberOfGuests: number;
  bedsRequested?: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  specialRequests?: string;
  mealPlan?: string;
}

export async function createWebsiteBooking(input: CreateWebsiteBookingInput): Promise<WebsiteBookingSummary> {
  await getBookingProperty(input.propertyId); // validates enabled

  if (input.checkOut <= input.checkIn) {
    throw Object.assign(new Error("Check-out must be after check-in"), { status: 400 });
  }

  const nights = nightCount(input.checkIn, input.checkOut);
  if (nights < 1) throw Object.assign(new Error("Minimum stay is 1 night"), { status: 400 });

  // Find a free room of the requested type
  const availability = await getPublicAvailability(input.propertyId, input.checkIn, input.checkOut, input.numberOfGuests);
  const available = availability.find(rt => rt.roomType === input.roomType);
  if (!available || available.availableRooms < 1) {
    throw Object.assign(new Error("No rooms of this type are available for the selected dates"), { status: 409 });
  }

  const isDorm = available.roomCategory === "dormitory";

  // Find the specific room to assign
  let assignedRoomId: number | null = null;
  const activeBookings = await db.select({
    id: bookings.id,
    roomId: bookings.roomId,
    roomIds: bookings.roomIds,
    checkInDate: bookings.checkInDate,
    checkOutDate: bookings.checkOutDate,
    status: bookings.status,
  }).from(bookings).where(
    and(
      eq(bookings.propertyId, input.propertyId),
      inArray(bookings.status, ["pending", "pending_payment", "confirmed", "checked-in"]),
      sql`${bookings.checkOutDate} > ${input.checkIn}`,
      sql`${bookings.checkInDate} < ${input.checkOut}`,
    )
  );

  for (const roomId of available.roomIds) {
    const overlapping = activeBookings.filter(b => {
      const bRooms = [b.roomId, ...(b.roomIds ?? [])].filter(Boolean);
      return bRooms.includes(roomId);
    });
    if (overlapping.length === 0) {
      assignedRoomId = roomId;
      break;
    }
  }

  if (!assignedRoomId && !isDorm) {
    throw Object.assign(new Error("Could not assign a room — please try again"), { status: 409 });
  }
  if (isDorm) assignedRoomId = available.roomIds[0]; // dorm: assign to first dorm room of this type

  // Find or create guest record
  const cleanPhone = input.guestPhone.replace(/[^\d]/g, "");
  if (cleanPhone.length < 10) {
    throw Object.assign(new Error("Please provide a valid 10-digit phone number"), { status: 400 });
  }

  let guestId: number;
  const phoneVariants = [input.guestPhone, cleanPhone, `+91${cleanPhone.slice(-10)}`];
  const existingGuests = await db.select().from(guests).where(
    sql`${guests.phone} = ANY(${phoneVariants})`
  ).limit(1);

  if (existingGuests.length > 0) {
    guestId = existingGuests[0].id;
    // Update name/email if changed
    if (existingGuests[0].fullName !== input.guestName || (input.guestEmail && existingGuests[0].email !== input.guestEmail)) {
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

  // Calculate total amount
  const totalAmount = available.pricePerNight * nights;
  const advanceAmount = Math.ceil(totalAmount * 0.30); // 30% advance via Razorpay

  // Generate token and hold expiry (15 minutes)
  const token = generateToken();
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Create the booking in pending_payment status
  const [booking] = await db.insert(bookings).values({
    propertyId: input.propertyId,
    roomId: assignedRoomId,
    guestId,
    checkInDate: input.checkIn as any,
    checkOutDate: input.checkOut as any,
    numberOfGuests: input.numberOfGuests,
    bedsBooked: isDorm ? (input.bedsRequested ?? input.numberOfGuests) : undefined,
    status: "pending_payment",
    totalAmount: String(totalAmount),
    advanceAmount: String(advanceAmount),
    advancePaymentStatus: "pending",
    source: "website",
    mealPlan: input.mealPlan ?? "EP",
    specialRequests: input.specialRequests ?? null,
    createdBy: "website",
    websiteBookingToken: token,
    paymentHoldExpiresAt: holdExpiresAt,
  } as any).returning();

  return {
    token,
    bookingId: booking.id,
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

  // Get advance amount (30% of total)
  const advanceAmount = Math.ceil(booking.totalAmount * 0.30);

  // Create Razorpay payment link with WEB- reference_id
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
      expire_by: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    }),
  });

  if (!response.ok) {
    const err: any = await response.json();
    throw Object.assign(
      new Error(`Payment gateway error: ${err.error?.description ?? "Unknown error"}`),
      { status: 502 }
    );
  }

  const data: any = await response.json();
  const paymentLinkUrl: string = data.short_url;

  // Update booking with payment link details
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

  // Get room type
  let roomType = "Unknown";
  if (row.roomId) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, row.roomId));
    if (room) roomType = room.roomType;
  }

  // Get guest info
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
  if (!["pending_payment", "pending"].includes(booking.status)) return; // already cancelled/expired

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
  expireStaleWebsiteHolds().catch(() => {}); // run once on startup
  setInterval(() => expireStaleWebsiteHolds().catch((e) => {
    console.warn("[DIRECT-BOOKING] Hold expiry cron error:", e.message);
  }), 5 * 60 * 1000);
  console.log("[DIRECT-BOOKING] Hold expiry cron started (every 5 min)");
}
