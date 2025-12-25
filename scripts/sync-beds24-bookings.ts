import { format, addDays, subDays } from "date-fns";
import { db } from "../server/db";
import { bookings, guests, rooms } from "../shared/schema";
import { eq, and, sql, ne, or, gte, lte, lt, gt } from "drizzle-orm";

const BEDS24_API_URL = "https://beds24.com/api/json";

interface Beds24Booking {
  bookId: string;
  propId: string;
  roomId: string;
  unitId: string;
  status: string;
  firstNight: string;
  lastNight: string;
  numAdult: string;
  numChild: string;
  guestFirstName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestMobile: string;
  guestCountry: string;
  guestAddress: string;
  guestCity: string;
  price: string;
  deposit: string;
  referer: string;
  apiSource: string;
  apiReference: string;
}

interface RoomMapping {
  beds24_room_id: string;
  room_type: string;
}

async function getRoomMappings(propertyId: number): Promise<RoomMapping[]> {
  const result = await db.execute(sql`
    SELECT beds24_room_id, room_type 
    FROM beds24_room_mappings 
    WHERE property_id = ${propertyId}
  `);
  return result.rows as RoomMapping[];
}

async function findAvailableRoom(
  propertyId: number,
  roomType: string,
  checkInDate: string,
  checkOutDate: string,
  propertyRooms: any[]
): Promise<number | null> {
  // Get rooms of this type
  const roomsOfType = propertyRooms.filter(r => r.roomType === roomType);
  
  if (roomsOfType.length === 0) {
    console.log(`[SYNC] No rooms found for type: ${roomType}`);
    return propertyRooms.length > 0 ? propertyRooms[0].id : null;
  }

  // Check each room for availability
  for (const room of roomsOfType) {
    const conflictingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, room.id),
          // Check for date overlap
          lt(bookings.checkInDate, checkOutDate),
          gt(bookings.checkOutDate, checkInDate)
        )
      )
      .limit(1);

    if (conflictingBookings.length === 0) {
      return room.id;
    }
  }

  // No available room of this type, return first room of type anyway
  console.log(`[SYNC] All ${roomType} rooms occupied for ${checkInDate}-${checkOutDate}, using first available`);
  return roomsOfType[0].id;
}

async function syncBeds24Bookings() {
  const apiKey = process.env.BEDS24_API_KEY;
  const propKey = "propertykey123456789987654321";
  const propertyId = 14;

  if (!apiKey) {
    console.error("[SYNC] BEDS24_API_KEY not configured");
    process.exit(1);
  }

  console.log("[SYNC] Starting Beds24 sync for property", propertyId);

  // Get room mappings
  const roomMappings = await getRoomMappings(propertyId);
  console.log(`[SYNC] Loaded ${roomMappings.length} room mappings`);

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const ninetyDaysAhead = addDays(today, 90);

  const response = await fetch(`${BEDS24_API_URL}/getBookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authentication: { apiKey, propKey },
      arrivalFrom: format(thirtyDaysAgo, "yyyy-MM-dd"),
      arrivalTo: format(ninetyDaysAhead, "yyyy-MM-dd"),
    }),
  });

  const beds24Bookings: Beds24Booking[] = await response.json();
  console.log(`[SYNC] Fetched ${beds24Bookings.length} bookings from Beds24`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const propertyRooms = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  console.log(`[SYNC] Found ${propertyRooms.length} rooms in property`);

  for (const b24Booking of beds24Bookings) {
    try {
      const existing = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.externalBookingId, b24Booking.bookId),
            eq(bookings.externalSource, "beds24")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const guestName = `${b24Booking.guestFirstName} ${b24Booking.guestName}`.trim();
      const guestPhone = b24Booking.guestMobile || b24Booking.guestPhone || "0000000000";
      const guestEmail = b24Booking.guestEmail || null;

      let guestId: number | null = null;

      if (guestName) {
        const existingGuest = await db
          .select()
          .from(guests)
          .where(eq(guests.fullName, guestName))
          .limit(1);

        if (existingGuest.length > 0) {
          guestId = existingGuest[0].id;
        } else {
          const newGuest = await db
            .insert(guests)
            .values({
              fullName: guestName,
              email: guestEmail,
              phone: guestPhone,
              address: b24Booking.guestAddress || null,
              nationality: b24Booking.guestCountry || null,
            })
            .returning();
          guestId = newGuest[0].id;
          console.log(`[SYNC] Created guest: ${guestName}`);
        }
      }

      // Find room type from mapping
      const mapping = roomMappings.find(m => m.beds24_room_id === b24Booking.roomId);
      const roomType = mapping?.room_type || null;

      const checkInDate = b24Booking.firstNight;
      const checkOutDate = format(addDays(new Date(b24Booking.lastNight), 1), "yyyy-MM-dd");

      // Find available room of the correct type
      let roomId: number | null = null;
      if (roomType) {
        roomId = await findAvailableRoom(propertyId, roomType, checkInDate, checkOutDate, propertyRooms);
        console.log(`[SYNC] Mapped Beds24 room ${b24Booking.roomId} → ${roomType} → Room ID ${roomId}`);
      } else {
        roomId = propertyRooms.length > 0 ? propertyRooms[0].id : null;
        console.log(`[SYNC] No mapping for Beds24 room ${b24Booking.roomId}, using default`);
      }

      const numGuests = parseInt(b24Booking.numAdult || "1") + parseInt(b24Booking.numChild || "0");
      const source = b24Booking.referer || "Beds24";

      await db.insert(bookings).values({
        propertyId,
        roomId,
        guestId,
        checkInDate,
        checkOutDate,
        numberOfGuests: numGuests,
        status: "confirmed",
        totalAmount: b24Booking.price,
        advanceAmount: b24Booking.deposit || "0",
        source,
        externalBookingId: b24Booking.bookId,
        externalSource: "beds24",
      });

      synced++;
      console.log(
        `[SYNC] Imported: ${guestName} | ${checkInDate} - ${checkOutDate} | ${roomType || 'Unknown'} | ₹${b24Booking.price}`
      );
    } catch (err: any) {
      console.error(`[SYNC] Error syncing booking ${b24Booking.bookId}:`, err.message);
      errors++;
    }
  }

  console.log("\n[SYNC] Summary:");
  console.log(`  Total fetched: ${beds24Bookings.length}`);
  console.log(`  Synced: ${synced}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  process.exit(0);
}

syncBeds24Bookings().catch((err) => {
  console.error("[SYNC] Fatal error:", err);
  process.exit(1);
});
