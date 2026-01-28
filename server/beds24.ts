/**
 * Beds24 Channel Manager Integration
 * API Documentation: https://www.beds24.com/api/json/
 * 
 * This module handles:
 * - Pulling bookings from Beds24
 * - Pushing availability updates to Beds24
 * - Receiving webhook notifications for new bookings
 */

import { format } from "date-fns";

const BEDS24_API_URL = "https://beds24.com/api/json";

interface Beds24Booking {
  bookId: string;
  propId: string;
  roomId: string;
  unitId: string;
  status: string;
  firstNight: string;
  lastNight: string;
  numAdult: number;
  numChild: number;
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
  tax: string;
  commission: string;
  notes: string;
  invoiceNotes: string;
  apiSource: string;
  apiReference: string;
  arrivalTime: string;
  departureTime: string;
  bookingTime: string;
  modifiedTime: string;
}

interface Beds24ApiResponse {
  bookings?: Beds24Booking[];
  error?: string;
  errorCode?: number;
}

interface Beds24PropertyInfo {
  propId: string;
  name: string;
  rooms: Array<{
    roomId: string;
    name: string;
    qty: number;
  }>;
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.BEDS24_API_KEY;
  if (!apiKey) {
    throw new Error("BEDS24_API_KEY not configured");
  }
  return apiKey;
}

/**
 * Fetch bookings from Beds24
 * @param propKey - Property key for the specific property
 * @param options - Optional filters (date range, modified since, etc.)
 */
export async function fetchBeds24Bookings(
  propKey: string,
  options?: {
    arrivalFrom?: string;
    arrivalTo?: string;
    departureFrom?: string;
    departureTo?: string;
    modifiedSince?: string;
    includeArchived?: boolean;
  }
): Promise<Beds24Booking[]> {
  const apiKey = getApiKey();
  
  const requestBody: any = {
    authentication: {
      apiKey: apiKey,
      propKey: propKey,
    },
  };

  if (options?.arrivalFrom) requestBody.arrivalFrom = options.arrivalFrom;
  if (options?.arrivalTo) requestBody.arrivalTo = options.arrivalTo;
  if (options?.departureFrom) requestBody.departureFrom = options.departureFrom;
  if (options?.departureTo) requestBody.departureTo = options.departureTo;
  if (options?.modifiedSince) requestBody.modifiedSince = options.modifiedSince;
  if (options?.includeArchived) requestBody.includeArchived = options.includeArchived;

  try {
    console.log(`[BEDS24] Fetching bookings for property with propKey: ${propKey.substring(0, 4)}...`);
    
    const response = await fetch(`${BEDS24_API_URL}/getBookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error(`[BEDS24] API Error: ${data.error}`);
      throw new Error(data.error);
    }

    const bookings = Array.isArray(data) ? data : data.bookings || [];
    console.log(`[BEDS24] Fetched ${bookings.length} bookings`);
    return bookings;
  } catch (error: any) {
    console.error("[BEDS24] Failed to fetch bookings:", error.message);
    throw error;
  }
}

/**
 * Get property information from Beds24
 */
export async function getBeds24Properties(propKey: string): Promise<any> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${BEDS24_API_URL}/getProperties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: {
          apiKey: apiKey,
          propKey: propKey,
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error: any) {
    console.error("[BEDS24] Failed to fetch properties:", error.message);
    throw error;
  }
}

/**
 * Get room types from Beds24
 */
export async function getBeds24Rooms(propKey: string): Promise<any> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${BEDS24_API_URL}/getRoomTypes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: {
          apiKey: apiKey,
          propKey: propKey,
        },
      }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("[BEDS24] Failed to fetch rooms:", error.message);
    throw error;
  }
}

/**
 * Set availability in Beds24
 * @param propKey - Property key
 * @param roomId - Beds24 room ID
 * @param date - Date in YYYY-MM-DD format
 * @param numAvail - Number of available rooms
 */
export async function setBeds24Availability(
  propKey: string,
  roomId: string,
  date: string,
  numAvail: number
): Promise<boolean> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${BEDS24_API_URL}/setAvailability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: {
          apiKey: apiKey,
          propKey: propKey,
        },
        roomId: roomId,
        from: date,
        to: date,
        numAvail: numAvail,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error(`[BEDS24] Set availability error: ${data.error}`);
      return false;
    }

    console.log(`[BEDS24] Set availability for room ${roomId} on ${date}: ${numAvail}`);
    return true;
  } catch (error: any) {
    console.error("[BEDS24] Failed to set availability:", error.message);
    return false;
  }
}

/**
 * Create a booking in Beds24
 */
export async function createBeds24Booking(
  propKey: string,
  bookingData: {
    roomId: string;
    firstNight: string;
    lastNight: string;
    numAdult: number;
    numChild?: number;
    guestFirstName: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    price?: string;
    status?: string;
  }
): Promise<any> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${BEDS24_API_URL}/setBooking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authentication: {
          apiKey: apiKey,
          propKey: propKey,
        },
        ...bookingData,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`[BEDS24] Created booking: ${data.bookId}`);
    return data;
  } catch (error: any) {
    console.error("[BEDS24] Failed to create booking:", error.message);
    throw error;
  }
}

/**
 * Parse Beds24 webhook payload
 * Webhook format varies based on version
 */
export function parseBeds24WebhookPayload(payload: any): {
  bookingId: string;
  propertyId: string;
  action: 'new' | 'modified' | 'cancelled';
  data: any;
} | null {
  try {
    if (!payload) return null;

    // Beds24 webhook v1 format
    if (payload.bookId) {
      return {
        bookingId: payload.bookId,
        propertyId: payload.propId || '',
        action: payload.status === 'cancelled' ? 'cancelled' : 
                (payload.action === 'modified' ? 'modified' : 'new'),
        data: payload,
      };
    }

    // Beds24 webhook v2 format
    if (payload.booking) {
      const booking = payload.booking;
      return {
        bookingId: booking.id?.toString() || '',
        propertyId: booking.propertyId?.toString() || '',
        action: payload.event === 'booking.cancelled' ? 'cancelled' :
                (payload.event === 'booking.modified' ? 'modified' : 'new'),
        data: booking,
      };
    }

    console.log("[BEDS24] Unknown webhook format:", JSON.stringify(payload));
    return null;
  } catch (error) {
    console.error("[BEDS24] Failed to parse webhook payload:", error);
    return null;
  }
}

/**
 * Convert Beds24 booking to Hostezee booking format
 */
export function convertBeds24ToHostezee(beds24Booking: Beds24Booking): {
  guestData: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    country?: string;
  };
  bookingData: {
    checkInDate: Date;
    checkOutDate: Date;
    numberOfGuests: number;
    totalAmount: string;
    source: string;
    externalBookingId: string;
    specialRequests: string;
    status: string;
  };
} {
  const guestFullName = beds24Booking.guestFirstName && beds24Booking.guestName
    ? `${beds24Booking.guestFirstName} ${beds24Booking.guestName}`
    : beds24Booking.guestName || beds24Booking.guestFirstName || "Guest";

  return {
    guestData: {
      fullName: guestFullName,
      email: beds24Booking.guestEmail || "",
      phone: beds24Booking.guestPhone || beds24Booking.guestMobile || "",
      address: beds24Booking.guestAddress,
      country: beds24Booking.guestCountry,
    },
    bookingData: {
      checkInDate: new Date(beds24Booking.firstNight),
      checkOutDate: new Date(beds24Booking.lastNight),
      numberOfGuests: (beds24Booking.numAdult || 1) + (beds24Booking.numChild || 0),
      totalAmount: beds24Booking.price || "0",
      source: beds24Booking.apiSource || "Beds24",
      externalBookingId: beds24Booking.bookId,
      specialRequests: beds24Booking.notes || "",
      status: mapBeds24Status(beds24Booking.status),
    },
  };
}

/**
 * Map Beds24 status to Hostezee status
 */
function mapBeds24Status(beds24Status: string): string {
  const statusMap: Record<string, string> = {
    "0": "pending",
    "1": "confirmed",
    "2": "confirmed",
    "3": "checked-in",
    "4": "checked-out",
    "cancelled": "cancelled",
    "canceled": "cancelled",
  };
  
  return statusMap[beds24Status?.toLowerCase()] || "pending";
}

/**
 * Test Beds24 API connection
 */
export async function testBeds24Connection(propKey: string): Promise<{
  success: boolean;
  message: string;
  propertyInfo?: any;
}> {
  try {
    const properties = await getBeds24Properties(propKey);
    return {
      success: true,
      message: "Successfully connected to Beds24",
      propertyInfo: properties,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to connect to Beds24",
    };
  }
}
