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
import { eq, and, desc, inArray, lte, gte, isNull, isNotNull } from "drizzle-orm";
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

  let httpStatus: number | undefined;

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

    httpStatus = response.status;
    let responseData: any;

    // Safely parse response — AioSell may return HTML on 500 errors
    const rawText = await response.text();
    try {
      responseData = JSON.parse(rawText);
    } catch {
      // Non-JSON response (e.g. HTML error page from AioSell)
      const snippet = rawText.slice(0, 300).replace(/\s+/g, " ");
      logEntry.status = "error";
      logEntry.errorMessage = `HTTP ${httpStatus} — non-JSON response: ${snippet}`;
      logEntry.responsePayload = { httpStatus, rawSnippet: snippet };
      await db.insert(aiosellSyncLogs).values(logEntry);
      console.error(`[AIOSELL] ${syncType} — HTTP ${httpStatus}, non-JSON body: ${snippet}`);
      return { success: false, message: `AioSell returned HTTP ${httpStatus} with a non-JSON response. Check AioSell credentials or contact AioSell support.` };
    }

    const isSuccess = responseData.success === true && response.ok;
    logEntry.status = isSuccess ? "success" : "failed";
    logEntry.responsePayload = { httpStatus, ...responseData };
    if (!isSuccess) {
      logEntry.errorMessage = `HTTP ${httpStatus} — ${responseData.message || "Unknown error"}`;
    }

    await db.insert(aiosellSyncLogs).values(logEntry);

    if (isSuccess) {
      await db
        .update(aiosellConfigurations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(aiosellConfigurations.id, config.id));
    }

    console.log(`[AIOSELL] ${syncType} HTTP ${httpStatus} result: ${isSuccess ? "SUCCESS" : "FAILED"} - ${responseData.message || ""}`);
    if (!isSuccess) {
      console.error(`[AIOSELL PUSH] Rejected by AioSell — HTTP ${httpStatus} — full response:`, JSON.stringify(responseData));
    }
    return { success: isSuccess, message: responseData.message };
  } catch (error: any) {
    logEntry.status = "error";
    logEntry.errorMessage = `Network error: ${error.message}`;
    await db.insert(aiosellSyncLogs).values(logEntry);

    console.error(`[AIOSELL] ${syncType} network error:`, error.message);
    return { success: false, message: `Cannot reach AioSell: ${error.message}` };
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
  // Send a minimal inventory update payload — AioSell may return 500 for empty arrays,
  // but any HTTP response means the server is reachable. Only a network error = no connection.
  const today = new Date().toISOString().split("T")[0];
  const payload = {
    hotelCode: config.hotelCode,
    updates: [{ startDate: today, endDate: today, rooms: [] }],
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

    const httpStatus = response.status;
    const rawText = await response.text();
    let data: any = null;
    try { data = JSON.parse(rawText); } catch { /* non-JSON response */ }

    // Any HTTP response means we successfully reached AioSell's server.
    // 400/500 can mean invalid payload (e.g. empty rooms), NOT a connection failure.
    // Only a network-level throw means the server is unreachable.
    const connected = true; // we got a response
    const logStatus = (response.ok && data?.success) ? "success" : httpStatus >= 500 ? "failed" : "success";
    let message: string;
    if (response.ok && data?.success) {
      message = "Connection successful";
    } else if (httpStatus === 401 || httpStatus === 403) {
      message = `Authentication failed (HTTP ${httpStatus}) — check your PMS Name and PMS Password`;
    } else if (httpStatus >= 500) {
      message = `AioSell server error (HTTP ${httpStatus}) — the server is reachable but returned an error. This may be a temporary issue or an invalid payload format.`;
    } else {
      message = `Connected (HTTP ${httpStatus})${data?.message ? " — " + data.message : ""}`;
    }

    await db.insert(aiosellSyncLogs).values({
      configId: config.id,
      propertyId: config.propertyId,
      syncType: "connection_test",
      direction: "outbound",
      status: logStatus,
      requestPayload: payload,
      responsePayload: data ? { httpStatus, ...data } : { httpStatus, rawSnippet: rawText.slice(0, 200) },
      errorMessage: logStatus !== "success" ? message : null,
    });

    return { success: connected, message };
  } catch (error: any) {
    return { success: false, message: `Cannot reach AioSell server: ${error.message}` };
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
      bedsBooked: bookings.bedsBooked,
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
    // Also fetch confirmed room stays (roomId NOT NULL) from booking_room_stays.
    // These are extra rooms beyond the primary booking.roomId — present in multi-room
    // OTA bookings and manual group bookings — and must be counted as booked inventory.
    const confirmedStayRoomIdsByBookingId = new Map<number, number[]>();
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

      const confirmedStays = await db.select({
        bookingId: bookingRoomStays.bookingId,
        roomId: bookingRoomStays.roomId,
      }).from(bookingRoomStays)
        .where(
          and(
            inArray(bookingRoomStays.bookingId, activeBookingIds),
            isNotNull(bookingRoomStays.roomId),
          )
        );
      for (const stay of confirmedStays) {
        if (stay.roomId == null) continue;
        if (!confirmedStayRoomIdsByBookingId.has(stay.bookingId)) {
          confirmedStayRoomIdsByBookingId.set(stay.bookingId, []);
        }
        confirmedStayRoomIdsByBookingId.get(stay.bookingId)!.push(stay.roomId);
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

        // Determine if any room in this mapping is a dormitory type
        const isDormitory = allRooms.some(r => roomIds.includes(r.id) && r.roomCategory === "dormitory");

        // Also exclude rooms in maintenance/out-of-order/blocked status
        const blockedRoomIds = allRooms
          .filter(r => roomIds.includes(r.id) && (r.status === "maintenance" || r.status === "out-of-order" || r.status === "blocked"))
          .map(r => r.id);
        const activeRoomIds = roomIds.filter(id => !blockedRoomIds.includes(id));

        if (isDormitory) {
          // For dormitory rooms: push available BED count (not room count)
          // Sum totalBeds across active rooms, then subtract bedsBooked from overlapping bookings
          const totalBeds = allRooms
            .filter(r => activeRoomIds.includes(r.id))
            .reduce((sum, r) => sum + (r.totalBeds || 1), 0);

          // Track beds booked per room.
          // SOURCE-OF-TRUTH RULE for dorms:
          //   - If booking has stays in booking_room_stays (multi-bed OTA reservations),
          //     each stay row = 1 bed. Use stays exclusively to avoid double-counting
          //     the primary room (which appears in BOTH bookings.roomId AND a stay row).
          //   - Otherwise (single-bed manual booking with no stays), fall back to
          //     booking.roomId / roomIds with bedsBooked count.
          const bedsBookedByRoom: Record<number, number> = {};
          for (const booking of activeBookings) {
            const cin = new Date(booking.checkInDate);
            const cout = new Date(booking.checkOutDate);
            cin.setHours(0, 0, 0, 0);
            cout.setHours(0, 0, 0, 0);
            if (cin <= date && date < cout) {
              const stayRoomIds = confirmedStayRoomIdsByBookingId.get(booking.id) || [];
              if (stayRoomIds.length > 0) {
                // Multi-bed OTA reservation: each stay row counts as 1 bed
                for (const rid of stayRoomIds) {
                  if (activeRoomIds.includes(rid)) {
                    bedsBookedByRoom[rid] = (bedsBookedByRoom[rid] || 0) + 1;
                  }
                }
              } else {
                // Manual / legacy single-bed booking: use bedsBooked from booking row
                const beds = booking.bedsBooked || 1;
                const bRoomId = booking.roomId;
                if (bRoomId && activeRoomIds.includes(bRoomId)) {
                  bedsBookedByRoom[bRoomId] = (bedsBookedByRoom[bRoomId] || 0) + beds;
                }
                if (booking.roomIds) {
                  for (const rid of booking.roomIds) {
                    if (activeRoomIds.includes(rid)) {
                      bedsBookedByRoom[rid] = (bedsBookedByRoom[rid] || 0) + beds;
                    }
                  }
                }
              }
            }
          }

          // Hard safety check: never report more beds available than physical capacity
          for (const rid of activeRoomIds) {
            const room = allRooms.find(r => r.id === rid);
            const cap = room?.totalBeds || 0;
            if (cap > 0 && (bedsBookedByRoom[rid] || 0) > cap) {
              console.warn(`[AIOSELL] Over-booked dorm room ${rid} (${room?.roomNumber}): ${bedsBookedByRoom[rid]} beds booked > ${cap} capacity. Capping at ${cap}.`);
              bedsBookedByRoom[rid] = cap;
            }
          }

          // Also count TBS dorm stays (no roomId assigned yet) by aiosellRoomCode
          let tbsDormBeds = 0;
          for (const booking of activeBookings) {
            const cin = new Date(booking.checkInDate);
            const cout = new Date(booking.checkOutDate);
            cin.setHours(0, 0, 0, 0);
            cout.setHours(0, 0, 0, 0);
            if (cin <= date && date < cout && !booking.roomId) {
              const tbsForBooking = tbsStaysByBookingId.get(booking.id) || [];
              for (const stay of tbsForBooking) {
                if (stay.aiosellRoomCode === mapping.aiosellRoomCode) tbsDormBeds++;
              }
            }
          }

          const bedsBooked = Object.values(bedsBookedByRoom).reduce((s, n) => s + n, 0);
          const available = Math.max(0, totalBeds - bedsBooked - tbsDormBeds);
          dateAvailability[dateStr][mapping.aiosellRoomCode] = available;
        } else {
          // For regular rooms: push count of rooms NOT booked on this date
          const bookedRoomIds = new Set<number>();
          let tbsCount = 0;
          for (const booking of activeBookings) {
            const cin = new Date(booking.checkInDate);
            const cout = new Date(booking.checkOutDate);
            cin.setHours(0, 0, 0, 0);
            cout.setHours(0, 0, 0, 0);
            if (cin <= date && date < cout) {
              if (booking.roomId && activeRoomIds.includes(booking.roomId)) {
                bookedRoomIds.add(booking.roomId);
              }
              if (booking.roomIds) {
                for (const rid of booking.roomIds) {
                  if (activeRoomIds.includes(rid)) bookedRoomIds.add(rid);
                }
              }
              // Also count rooms from booking_room_stays with an assigned roomId
              // (covers multi-room OTA bookings and manual group bookings where
              //  extra rooms are stored in stays rather than booking.roomIds)
              const stayRoomIds = confirmedStayRoomIdsByBookingId.get(booking.id) || [];
              for (const rid of stayRoomIds) {
                if (activeRoomIds.includes(rid)) bookedRoomIds.add(rid);
              }
              const tbsForBooking = tbsStaysByBookingId.get(booking.id) || [];
              for (const stay of tbsForBooking) {
                if (stay.aiosellRoomCode === mapping.aiosellRoomCode) tbsCount++;
              }
            }
          }
          const physicallyAvailable = activeRoomIds.filter(id => !bookedRoomIds.has(id)).length;
          const available = Math.max(0, physicallyAvailable - tbsCount);
          dateAvailability[dateStr][mapping.aiosellRoomCode] = available;
        }
      }
    }

    // ── Step 1: Load active stopSell restrictions from Hostezee DB ────────────────
    // These must be respected so a closure set via Hostezee's restriction push
    // is never silently overridden by a fresh inventory count push.
    const todayStr = today.toISOString().split("T")[0];
    const horizonStr = horizon.toISOString().split("T")[0];

    const activeRestrictions = await db.select().from(aiosellInventoryRestrictions)
      .where(and(
        eq(aiosellInventoryRestrictions.configId, config.id),
        gte(aiosellInventoryRestrictions.endDate, todayStr), // still active or future
      ));

    // Build a fast lookup: roomCode → list of {startDate, endDate} ranges where stopSell=true
    const stopSellRanges = new Map<string, { start: string; end: string }[]>();
    for (const restriction of activeRestrictions) {
      if (!restriction.stopSell) continue;
      const mapping = mappings.find(m => m.id === restriction.roomMappingId);
      if (!mapping) continue;
      const code = mapping.aiosellRoomCode;
      if (!stopSellRanges.has(code)) stopSellRanges.set(code, []);
      stopSellRanges.get(code)!.push({
        start: restriction.startDate as string,
        end: restriction.endDate as string,
      });
    }

    // ── Step 2: Override availability to 0 for any stopSell-restricted date ──────
    // If the property has manually closed certain dates via Hostezee's restriction
    // feature, forcing available=0 here prevents the inventory push from re-opening
    // those dates on connected OTAs (Booking.com, etc.).
    if (stopSellRanges.size > 0) {
      for (const dateStr of Object.keys(dateAvailability)) {
        for (const [roomCode, ranges_] of stopSellRanges) {
          const isClosed = ranges_.some(r => dateStr >= r.start && dateStr <= r.end);
          if (isClosed && dateAvailability[dateStr][roomCode] !== undefined) {
            const was = dateAvailability[dateStr][roomCode];
            dateAvailability[dateStr][roomCode] = 0;
            if (was > 0) {
              console.log(`[AIOSELL] stopSell override: ${roomCode} on ${dateStr} forced 0 (was ${was})`);
            }
          }
        }
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

      // Structured [SYNC_DATA] snapshot — gives full picture of what is going to OTAs
      const blockedTotal = allRooms.filter(r => r.status === "maintenance" || r.status === "out-of-order" || r.status === "blocked").length;
      const totalMapped = firstUpdate.rooms.length;
      const availableTotal = firstUpdate.rooms.reduce((sum, r) => sum + r.available, 0);
      const bookedTotal = allRooms.length - blockedTotal - availableTotal;
      const stopSellInfo = stopSellRanges.size > 0
        ? ` stopSell_active=[${[...stopSellRanges.keys()].join(",")}]`
        : "";
      console.log(`[SYNC_DATA] property=${propertyId} total_rooms=${allRooms.length} blocked=${blockedTotal} booked=${Math.max(0, bookedTotal)} available=${availableTotal} mapped_types=${totalMapped} ranges=${inventoryUpdates.length} breakdown=[${availSummary}]${stopSellInfo}`);

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

    // ── Step 3: Re-push stored restrictions AFTER inventory push ─────────────────
    // Critical: the inventory push (available count) can implicitly open dates on
    // AioSell/Booking.com even if a stopSell restriction was previously in place.
    // Re-sending restrictions immediately after the count push ensures closures
    // set via Hostezee remain in effect on all connected channels.
    if (activeRestrictions.length > 0) {
      const restrictionUpdates: InventoryRestrictionUpdate[] = [];
      for (const restriction of activeRestrictions) {
        const mapping = mappings.find(m => m.id === restriction.roomMappingId);
        if (!mapping) continue;
        restrictionUpdates.push({
          startDate: restriction.startDate as string,
          endDate: restriction.endDate as string,
          rooms: [{
            roomCode: mapping.aiosellRoomCode,
            restrictions: {
              stopSell: restriction.stopSell,
              minimumStay: restriction.minimumStay ?? null,
              closeOnArrival: restriction.closeOnArrival,
              closeOnDeparture: restriction.closeOnDeparture,
              exactStayArrival: null,
              maximumStayArrival: null,
              minimumAdvanceReservation: null,
              maximumStay: null,
              maximumAdvanceReservation: null,
              minimumStayArrival: null,
            },
          }],
        });
      }
      if (restrictionUpdates.length > 0) {
        await pushInventoryRestrictions(config, restrictionUpdates);
        console.log(`[AIOSELL] Re-pushed ${restrictionUpdates.length} active restriction(s) after inventory sync to prevent OTA re-opening closed dates`);
      }
    }
  } catch (error: any) {
    console.error(`[AIOSELL] Auto-sync inventory failed for property ${propertyId}:`, error.message);
  }
}
