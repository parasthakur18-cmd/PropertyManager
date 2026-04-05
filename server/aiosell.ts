import { db } from "./db";
import {
  aiosellConfigurations,
  aiosellRoomMappings,
  aiosellRatePlans,
  aiosellSyncLogs,
  aiosellRateUpdates,
  aiosellInventoryRestrictions,
  type AiosellConfig,
  type AiosellRoomMapping,
  type AiosellRatePlan,
} from "@shared/schema";
import { eq, and, desc, inArray, lte, gte, isNull } from "drizzle-orm";
import { rooms, bookings, bookingRoomStays } from "@shared/schema";

interface AiosellApiResponse {
  success: boolean;
  message?: string;
}

interface InventoryUpdate {
  startDate: string;
  endDate: string;
  rooms: { available: number; roomCode: string; roomId?: string }[];
}

interface RateUpdate {
  startDate: string;
  endDate: string;
  rates: { roomCode: string; rate: number; rateplanCode: string }[];
}

interface InventoryRestrictionUpdate {
  startDate: string;
  endDate: string;
  rooms: {
    roomCode: string;
    restrictions: {
      stopSell: boolean;
      minimumStay: number | null;
      closeOnArrival: boolean;
      closeOnDeparture: boolean;
      exactStayArrival: number | null;
      maximumStayArrival: number | null;
      minimumAdvanceReservation: number | null;
      maximumStay: number | null;
      maximumAdvanceReservation: number | null;
      minimumStayArrival: number | null;
    };
  }[];
}

interface RateRestrictionUpdate {
  startDate: string;
  endDate: string;
  rates: {
    roomCode: string;
    rateplanCode: string;
    restrictions: {
      stopSell: boolean;
      minimumStay: number | null;
      closeOnArrival: boolean;
      closeOnDeparture: boolean;
      exactStayArrival: number | null;
      maximumStayArrival: number | null;
      minimumAdvanceReservation: number | null;
      maximumStay: number | null;
      maximumAdvanceReservation: number | null;
      minimumStayArrival: number | null;
    };
  }[];
}

async function makeAiosellRequest(
  config: AiosellConfig,
  endpoint: string,
  payload: any,
  syncType: string,
): Promise<AiosellApiResponse> {
  const url = `${config.apiBaseUrl}/api/v2/cm/${endpoint}/${config.pmsName}`;

  console.log(`[AIOSELL] ${syncType} → ${url}`);

  const logEntry: any = {
    configId: config.id,
    propertyId: config.propertyId,
    syncType,
    direction: "outbound",
    status: "pending",
    requestPayload: payload,
  };

  try {
    const authHeader = config.pmsPassword
      ? "Basic " + Buffer.from(`${config.pmsName}:${config.pmsPassword}`).toString("base64")
      : undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    logEntry.status = responseData.success ? "success" : "failed";
    logEntry.responsePayload = responseData;
    if (!responseData.success) {
      logEntry.errorMessage = responseData.message || "Unknown error";
    }

    await db.insert(aiosellSyncLogs).values(logEntry);

    if (responseData.success) {
      await db
        .update(aiosellConfigurations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(aiosellConfigurations.id, config.id));
    }

    console.log(`[AIOSELL] ${syncType} result: ${responseData.success ? "SUCCESS" : "FAILED"} - ${responseData.message || ""}`);
    if (!responseData.success) {
      console.error(`[AIOSELL PUSH] Rejected by AioSell — full response:`, JSON.stringify(responseData));
    }
    return responseData;
  } catch (error: any) {
    logEntry.status = "error";
    logEntry.errorMessage = error.message;
    await db.insert(aiosellSyncLogs).values(logEntry);

    console.error(`[AIOSELL] ${syncType} error:`, error.message);
    return { success: false, message: error.message };
  }
}

export async function pushInventory(
  config: AiosellConfig,
  updates: InventoryUpdate[],
): Promise<AiosellApiResponse> {
  const payload = {
    hotelCode: config.hotelCode,
    updates,
  };
  return makeAiosellRequest(config, "update", payload, "inventory_push");
}

export async function pushRates(
  config: AiosellConfig,
  updates: RateUpdate[],
): Promise<AiosellApiResponse> {
  const payload = {
    hotelCode: config.hotelCode,
    updates,
  };
  return makeAiosellRequest(config, "update-rates", payload, "rate_push");
}

export async function pushInventoryRestrictions(
  config: AiosellConfig,
  updates: InventoryRestrictionUpdate[],
  toChannels?: string[],
): Promise<AiosellApiResponse> {
  const payload: any = {
    hotelCode: config.hotelCode,
    updates,
  };
  if (toChannels && toChannels.length > 0) {
    payload.toChannels = toChannels;
  }
  return makeAiosellRequest(config, "update", payload, "inventory_restrictions_push");
}

export async function pushRateRestrictions(
  config: AiosellConfig,
  updates: RateRestrictionUpdate[],
  toChannels?: string[],
): Promise<AiosellApiResponse> {
  const payload: any = {
    hotelCode: config.hotelCode,
    updates,
  };
  if (toChannels && toChannels.length > 0) {
    payload.toChannels = toChannels;
  }
  return makeAiosellRequest(config, "update-rates", payload, "rate_restrictions_push");
}

export async function pushNoShow(
  config: AiosellConfig,
  bookingId: string,
  partner: string,
): Promise<AiosellApiResponse> {
  const url = `${config.apiBaseUrl}/api/v2/cm/noshow`;
  const payload = {
    hotelCode: config.hotelCode,
    bookingId,
    partner,
  };

  console.log(`[AIOSELL] noshow → ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    await db.insert(aiosellSyncLogs).values({
      configId: config.id,
      propertyId: config.propertyId,
      syncType: "noshow_push",
      direction: "outbound",
      status: responseData.success ? "success" : "failed",
      requestPayload: payload,
      responsePayload: responseData,
      errorMessage: responseData.success ? null : (responseData.message || "Unknown error"),
    });

    return responseData;
  } catch (error: any) {
    await db.insert(aiosellSyncLogs).values({
      configId: config.id,
      propertyId: config.propertyId,
      syncType: "noshow_push",
      direction: "outbound",
      status: "error",
      requestPayload: payload,
      errorMessage: error.message,
    });
    return { success: false, message: error.message };
  }
}

export async function testConnection(config: AiosellConfig): Promise<AiosellApiResponse> {
  const payload = {
    hotelCode: config.hotelCode,
    updates: [
      {
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        rooms: [],
      },
    ],
  };

  try {
    const url = `${config.apiBaseUrl}/api/v2/cm/update/${config.pmsName}`;
    const authHeader = config.pmsPassword
      ? "Basic " + Buffer.from(`${config.pmsName}:${config.pmsPassword}`).toString("base64")
      : undefined;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    await db.insert(aiosellSyncLogs).values({
      configId: config.id,
      propertyId: config.propertyId,
      syncType: "connection_test",
      direction: "outbound",
      status: response.ok ? "success" : "failed",
      requestPayload: payload,
      responsePayload: data,
      errorMessage: response.ok ? null : (data.message || `HTTP ${response.status}`),
    });

    return {
      success: response.ok,
      message: response.ok ? "Connection successful" : (data.message || `HTTP ${response.status}`),
    };
  } catch (error: any) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

export interface AiosellReservation {
  action: string;
  hotelCode: string;
  channel: string;
  bookingId: string;
  cmBookingId: string;
  bookedOn: string;
  checkin: string;
  checkout: string;
  segment?: string;
  specialRequests?: string;
  pah?: boolean;
  amount?: { amountAfterTax?: number; amountBeforeTax?: number; tax?: number; currency?: string };
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string; address?: { line1?: string; city?: string; state?: string; country?: string } };
  rooms?: { roomCode: string; occupancy?: { adults?: number; children?: number } }[];
}

export async function pullReservationsFromAioSell(
  config: AiosellConfig,
  fromDate: string,
  toDate: string,
): Promise<{ success: boolean; reservations?: AiosellReservation[]; message?: string }> {
  const url = `${config.apiBaseUrl}/api/v2/cm/get-reservations/${config.pmsName}`;
  const payload = { hotelCode: config.hotelCode, from: fromDate, to: toDate };

  console.log(`[AIOSELL] pull-reservations → ${url} from=${fromDate} to=${toDate}`);

  try {
    const authHeader = config.pmsPassword
      ? "Basic " + Buffer.from(`${config.pmsName}:${config.pmsPassword}`).toString("base64")
      : undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    await db.insert(aiosellSyncLogs).values({
      configId: config.id,
      propertyId: config.propertyId,
      syncType: "reservation_pull",
      direction: "inbound",
      status: response.ok && data.success !== false ? "success" : "failed",
      requestPayload: payload,
      responsePayload: data,
      errorMessage: response.ok ? null : (data.message || `HTTP ${response.status}`),
    });

    if (!response.ok) {
      return { success: false, message: data.message || `AioSell returned HTTP ${response.status}` };
    }

    // AioSell may return reservations as data.reservations or data.data
    const reservations: AiosellReservation[] = data.reservations || data.data || [];
    return { success: true, reservations };
  } catch (error: any) {
    console.error(`[AIOSELL] pull-reservations failed:`, error.message);
    return { success: false, message: error.message };
  }
}

export async function getConfigForProperty(propertyId: number): Promise<AiosellConfig | null> {
  const [config] = await db
    .select()
    .from(aiosellConfigurations)
    .where(and(eq(aiosellConfigurations.propertyId, propertyId), eq(aiosellConfigurations.isActive, true)));
  return config || null;
}

export async function getRoomMappingsForConfig(configId: number): Promise<AiosellRoomMapping[]> {
  return db
    .select()
    .from(aiosellRoomMappings)
    .where(eq(aiosellRoomMappings.configId, configId));
}

export async function getRatePlansForConfig(configId: number): Promise<AiosellRatePlan[]> {
  return db
    .select()
    .from(aiosellRatePlans)
    .where(eq(aiosellRatePlans.configId, configId));
}

export async function autoSyncInventoryForProperty(propertyId: number): Promise<void> {
  try {
    const config = await getConfigForProperty(propertyId);
    if (!config || !config.isActive) return;

    const mappings = await getRoomMappingsForConfig(config.id);
    if (mappings.length === 0) {
      console.warn(`[AIOSELL] Auto-sync skipped for property ${propertyId}: no room mappings configured`);
      return;
    }

    console.log(`[AIOSELL] Auto-sync started for property ${propertyId} — ${mappings.length} mapping(s): ${mappings.map(m => `${m.aiosellRoomCode}→${m.hostezeeRoomType}`).join(", ")}`);

    // Build a quick lookup: roomCode → full mapping (needed to attach roomId when pushing)
    const mappingByCode = new Map(mappings.map(m => [m.aiosellRoomCode, m]));

    // Fetch all rooms for this property
    const allRooms = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));

    // Fetch all active bookings (pending/confirmed/checked-in) for this property
    // that overlap with the next 90 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 90);

    const activeBookings = await db.select({
      id: bookings.id,
      roomId: bookings.roomId,
      roomIds: bookings.roomIds,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
      status: bookings.status,
    }).from(bookings).where(
      and(
        eq(bookings.propertyId, propertyId),
        // status must be active
        inArray(bookings.status, ["pending", "confirmed", "checked-in"]),
        // booking overlaps our window: checkIn < horizon AND checkOut > today
        lte(bookings.checkInDate, horizon),
        gte(bookings.checkOutDate, today),
      )
    );

    // Also fetch TBS room stays (no assigned roomId) to correctly reduce inventory
    // These represent rooms that are sold but not yet physically assigned
    const activeBookingIds = activeBookings.map(b => b.id);
    const tbsStaysByBookingId = new Map<number, { aiosellRoomCode: string }[]>();
    if (activeBookingIds.length > 0) {
      const tbsStays = await db.select({
        bookingId: bookingRoomStays.bookingId,
        aiosellRoomCode: bookingRoomStays.aiosellRoomCode,
      }).from(bookingRoomStays)
        .where(
          and(
            inArray(bookingRoomStays.bookingId, activeBookingIds),
            isNull(bookingRoomStays.roomId), // Only TBS stays — confirmed stays already counted via booking.roomId
          )
        );
      for (const stay of tbsStays) {
        if (stay.aiosellRoomCode && !tbsStaysByBookingId.has(stay.bookingId)) {
          tbsStaysByBookingId.set(stay.bookingId, []);
        }
        if (stay.aiosellRoomCode) {
          tbsStaysByBookingId.get(stay.bookingId)!.push({ aiosellRoomCode: stay.aiosellRoomCode });
        }
      }
    }

    // Group rooms by type (using hostezeeRoomType from mappings)
    const roomsByType: Record<string, number[]> = {};
    for (const mapping of mappings) {
      const matchingRooms = allRooms.filter(r =>
        r.roomType === mapping.hostezeeRoomType
      );
      if (matchingRooms.length > 0) {
        roomsByType[mapping.hostezeeRoomType] = matchingRooms.map(r => r.id);
      }
    }

    // Compute per-date availability and group into contiguous ranges (90-day window)
    // We'll compute day-by-day for 90 days and group into ranges
    const DAYS = 90;
    const dateAvailability: Record<string, Record<string, number>> = {}; // date → roomCode → count

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];

      dateAvailability[dateStr] = {};

      for (const mapping of mappings) {
        const roomIds = roomsByType[mapping.hostezeeRoomType] || [];
        if (roomIds.length === 0) {
          dateAvailability[dateStr][mapping.aiosellRoomCode] = 0;
          continue;
        }

        // Count rooms of this type that have NO active booking on this date
        const bookedRoomIds = new Set<number>();
        let tbsCount = 0; // TBS stays reduce available count without a specific room
        for (const booking of activeBookings) {
          const cin = new Date(booking.checkInDate);
          const cout = new Date(booking.checkOutDate);
          cin.setHours(0, 0, 0, 0);
          cout.setHours(0, 0, 0, 0);

          // Booking occupies a date if: checkIn <= date < checkOut
          if (cin <= date && date < cout) {
            if (booking.roomId && roomIds.includes(booking.roomId)) {
              bookedRoomIds.add(booking.roomId);
            }
            if (booking.roomIds) {
              for (const rid of booking.roomIds) {
                if (roomIds.includes(rid)) bookedRoomIds.add(rid);
              }
            }
            // Count TBS stays (sold but no specific room assigned) for this room code
            const tbsForBooking = tbsStaysByBookingId.get(booking.id) || [];
            for (const stay of tbsForBooking) {
              if (stay.aiosellRoomCode === mapping.aiosellRoomCode) {
                tbsCount++;
              }
            }
          }
        }

        // Also exclude rooms in maintenance/out-of-order/blocked status
        const blockedRoomIds = allRooms
          .filter(r => roomIds.includes(r.id) && (r.status === "maintenance" || r.status === "out-of-order" || r.status === "blocked"))
          .map(r => r.id);

        const physicallyAvailable = roomIds.filter(id => !bookedRoomIds.has(id) && !blockedRoomIds.includes(id)).length;
        const available = Math.max(0, physicallyAvailable - tbsCount);
        dateAvailability[dateStr][mapping.aiosellRoomCode] = available;
      }
    }

    // Group consecutive dates with same availability counts into ranges
    const dates = Object.keys(dateAvailability).sort();
    if (dates.length === 0) return;

    // Build ranges: we need one update entry per contiguous block of same availability
    // Strategy: for each mapping, find ranges, then combine all into one batch
    // Simpler approach: group all mappings together by date, push one update per date-range segment

    interface DateRange { startDate: string; endDate: string; counts: Record<string, number> }
    const ranges: DateRange[] = [];
    let currentRange: DateRange = {
      startDate: dates[0],
      endDate: dates[0],
      counts: { ...dateAvailability[dates[0]] },
    };

    for (let i = 1; i < dates.length; i++) {
      const date = dates[i];
      const prevCounts = currentRange.counts;
      const currCounts = dateAvailability[date];
      const isSame = Object.keys(prevCounts).every(code => prevCounts[code] === currCounts[code]);
      if (isSame) {
        currentRange.endDate = date;
      } else {
        ranges.push(currentRange);
        currentRange = { startDate: date, endDate: date, counts: { ...currCounts } };
      }
    }
    ranges.push(currentRange);

    // Convert to InventoryUpdate format — attach roomId when mapping has one
    const inventoryUpdates = ranges.map(range => ({
      startDate: range.startDate,
      endDate: range.endDate,
      rooms: Object.entries(range.counts).map(([roomCode, available]) => {
        const mapping = mappingByCode.get(roomCode);
        const entry: { roomCode: string; available: number; roomId?: string } = { roomCode, available };
        if (mapping?.aiosellRoomId) {
          entry.roomId = mapping.aiosellRoomId;
        }
        return entry;
      }),
    }));

    if (inventoryUpdates.length > 0) {
      // Summary snapshot for the first date range
      const firstUpdate = inventoryUpdates[0];
      const availSummary = firstUpdate.rooms.map(r => `${r.roomCode}:${r.available}`).join(", ");
      console.log(`[AIOSELL] Auto-sync: pushing ${inventoryUpdates.length} date range(s) for property ${propertyId}. Today's availability: [${availSummary}]`);

      // Per-room push log (production visibility)
      for (const update of inventoryUpdates) {
        for (const room of update.rooms) {
          console.log("[AIOSELL PUSH] Sending:", {
            roomId: room.roomId ?? null,
            roomCode: room.roomCode,
            availability: room.available,
            startDate: update.startDate,
            endDate: update.endDate,
          });
        }
      }

      await pushInventory(config, inventoryUpdates);
      const sentSummary = inventoryUpdates[0]?.rooms.map(r => `${r.roomCode}:${r.available}`).join(", ") ?? "none";
      console.log(`[SYNC_SENT] property=${propertyId} ranges=${inventoryUpdates.length} todayAvailability=[${sentSummary}]`);
    }
  } catch (error: any) {
    console.error(`[AIOSELL] Auto-sync inventory failed for property ${propertyId}:`, error.message);
  }
}
