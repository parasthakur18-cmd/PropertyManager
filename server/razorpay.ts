// RazorPay Payment Link Service
import crypto from "crypto";

export async function createPaymentLink(bookingId: number, amount: number, guestName: string, guestEmail: string, guestPhone: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RazorPay credentials not configured");
  }

  // Create basic auth header
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

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
      reference_id: `${bookingId}`, // Store booking ID so webhook can identify which booking paid
      customer: {
        name: guestName,
        email: guestEmail,
        contact: guestPhone.replace(/[^\d]/g, ""), // Remove special characters
      },
      notify: {
        sms: true,
        email: true,
      },
      upi_link: true,
      callback_url: `${process.env.VITE_API_URL || "http://localhost:5000"}/api/webhooks/razorpay`,
      callback_method: "post",
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
