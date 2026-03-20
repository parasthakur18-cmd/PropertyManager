// RazorPay Payment Link Service
import crypto from "crypto";

/**
 * Returns true if the email is a virtual/masked OTA email
 * (Booking.com, Airbnb, Expedia, etc.) — we never send Razorpay
 * notifications to these because the guest won't see them.
 */
function isVirtualEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.includes("@guest.booking.com") ||
    lower.includes("@m.airbnb.com") ||
    lower.includes("@reply.airbnb.com") ||
    lower.includes("@expediapartnercentral") ||
    lower.includes("@goibibo") ||
    lower.includes("@makemytrip") ||
    lower.includes("@mmt.") ||
    lower.endsWith(".booking.com")
  );
}

/**
 * Returns true if the phone number looks like a real dialable number
 * (at least 10 digits after stripping non-numeric characters).
 */
export function isRealPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 10;
}

export async function createPaymentLink(bookingId: number, amount: number, guestName: string, guestEmail: string, guestPhone: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RazorPay credentials not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment.");
  }

  const cleanedPhone = (guestPhone || "").replace(/[^\d]/g, "");
  if (cleanedPhone.length < 10) {
    throw new Error("Guest phone number is required (valid 10-digit number) to create payment link.");
  }

  // Strip virtual OTA emails — Razorpay should never email booking.com virtual addresses
  const realEmail = guestEmail && !isVirtualEmail(guestEmail) ? guestEmail : undefined;

  // Create basic auth header
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Generate unique reference_id: booking_{id}_{timestamp} to allow multiple links per booking
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueReferenceId = `booking_${bookingId}_${timestamp}`;

  // RazorPay Payment Link API
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // RazorPay expects amount in paise (multiply by 100)
      currency: "INR",
      accept_partial: false,
      description: `Payment for Booking #${bookingId}`,
      reference_id: uniqueReferenceId,
      customer: {
        name: guestName,
        ...(realEmail ? { email: realEmail } : {}),
        contact: cleanedPhone,
      },
      notify: {
        sms: false,   // We send WhatsApp ourselves — disable Razorpay SMS
        email: false, // We send WhatsApp ourselves — disable Razorpay email
      },
      upi_link: true,
      expire_by: Math.floor(Date.now() / 1000) + 15552000, // 180 days from now
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`RazorPay error: ${error.error?.description || "Failed to create payment link"}`);
  }

  const data: any = await response.json();
  return {
    linkId: data.id,
    shortUrl: data.short_url,
    paymentLink: data.short_url, // The URL to send to customer
  };
}

// Create payment link specifically for enquiry advance payments
export async function createEnquiryPaymentLink(enquiryId: number, amount: number, guestName: string, guestEmail: string, guestPhone: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RazorPay credentials not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your secrets.");
  }

  if (!guestPhone || typeof guestPhone !== 'string') {
    throw new Error("Guest phone number is required to create payment link");
  }

  const cleanedPhone = guestPhone.replace(/[^\d]/g, "");
  if (cleanedPhone.length < 10) {
    throw new Error("Invalid phone number. Please enter a valid 10-digit phone number.");
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount. Amount must be greater than zero.");
  }

  // Strip virtual OTA emails
  const realEmail = guestEmail && !isVirtualEmail(guestEmail) ? guestEmail : undefined;

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueReferenceId = `enquiry_${enquiryId}_${timestamp}`;

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      description: `Advance Payment for Enquiry #${enquiryId}`,
      reference_id: uniqueReferenceId,
      customer: {
        name: guestName || "Guest",
        ...(realEmail ? { email: realEmail } : {}),
        contact: cleanedPhone,
      },
      notify: {
        sms: false,   // We send WhatsApp ourselves — disable Razorpay SMS
        email: false, // We send WhatsApp ourselves — disable Razorpay email
      },
      upi_link: true,
      expire_by: Math.floor(Date.now() / 1000) + 604800, // 7 days for advance payment
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`RazorPay error: ${error.error?.description || "Failed to create payment link"}`);
  }

  const data: any = await response.json();
  return {
    linkId: data.id,
    shortUrl: data.short_url,
    paymentLink: data.short_url,
  };
}

export async function getPaymentLinkStatus(linkId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RazorPay credentials not configured");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1/payment_links/${linkId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch payment link status");
  }

  return await response.json();
}

// Verify RazorPay webhook signature
export function verifyWebhookSignature(payload: string, signature: string) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const hash = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
  return hash === signature;
}

// Create payment link specifically for booking advance payments with expiry
export async function createAdvancePaymentLink(
  bookingId: number,
  amount: number,
  guestName: string,
  guestEmail: string,
  guestPhone: string,
  expiryHours: number = 24
) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RazorPay credentials not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your secrets.");
  }

  if (!guestPhone || typeof guestPhone !== 'string') {
    throw new Error("Guest phone number is required to create payment link");
  }

  const cleanedPhone = guestPhone.replace(/[^\d]/g, "");
  if (cleanedPhone.length < 10) {
    throw new Error("Invalid phone number. Please enter a valid 10-digit phone number.");
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount. Amount must be greater than zero.");
  }

  // Strip virtual OTA emails
  const realEmail = guestEmail && !isVirtualEmail(guestEmail) ? guestEmail : undefined;

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueReferenceId = `advance_${bookingId}_${timestamp}`;

  const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      description: `Advance Payment for Booking #${bookingId}`,
      reference_id: uniqueReferenceId,
      customer: {
        name: guestName || "Guest",
        ...(realEmail ? { email: realEmail } : {}),
        contact: cleanedPhone,
      },
      notify: {
        sms: false,   // We send WhatsApp ourselves — disable Razorpay SMS
        email: false, // We send WhatsApp ourselves — disable Razorpay email
      },
      upi_link: true,
      expire_by: expiryTimestamp,
      notes: {
        booking_id: bookingId.toString(),
        payment_type: "advance",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`RazorPay error: ${error.error?.description || "Failed to create payment link"}`);
  }

  const data: any = await response.json();
  return {
    linkId: data.id,
    shortUrl: data.short_url,
    paymentLink: data.short_url,
    expiryTimestamp: new Date(expiryTimestamp * 1000),
    referenceId: uniqueReferenceId,
  };
}
