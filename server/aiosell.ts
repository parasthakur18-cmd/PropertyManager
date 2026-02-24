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
import { eq, and, desc } from "drizzle-orm";

interface AiosellApiResponse {
  success: boolean;
  message?: string;
}

interface InventoryUpdate {
  startDate: string;
  endDate: string;
  rooms: { available: number; roomCode: string }[];
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
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (mappings.length === 0) return;

    const { rooms } = await import("@shared/schema");
    const allRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.propertyId, propertyId));

    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 365);
    const endDate = futureDate.toISOString().split("T")[0];

    const roomsByType: Record<string, number> = {};
    for (const room of allRooms) {
      const roomType = room.type || room.name;
      if (room.status === "available") {
        roomsByType[roomType] = (roomsByType[roomType] || 0) + 1;
      }
    }

    const roomUpdates: { available: number; roomCode: string }[] = [];
    for (const mapping of mappings) {
      const available = roomsByType[mapping.hostezeeRoomType] || 0;
      roomUpdates.push({
        available,
        roomCode: mapping.aiosellRoomCode,
      });
    }

    if (roomUpdates.length > 0) {
      await pushInventory(config, [
        {
          startDate: today,
          endDate,
          rooms: roomUpdates,
        },
      ]);
    }
  } catch (error: any) {
    console.error(`[AIOSELL] Auto-sync inventory failed for property ${propertyId}:`, error.message);
  }
}
