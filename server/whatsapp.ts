/**
 * WhatsApp Messaging Service using authkey.io API
 * Documentation: https://authkey.io/whatsapp-api-docs
 * 
 * IMPORTANT CONFIGURATION:
 * Required environment variables:
 * - AUTHKEY_API_KEY: Your authkey.io API key
 * 
 * Optional template IDs (with defaults):
 * - AUTHKEY_WA_BOOKING_CONFIRMATION: Template for booking confirmation (default: 18491)
 * - AUTHKEY_WA_PAYMENT_CONFIRMATION: Template for payment received (default: 18649)
 * - AUTHKEY_WA_CHECKIN_DETAILS: Template for check-in notification (default: 28769)
 * - AUTHKEY_WA_OTA_BOOKING: Template for new OTA booking alert to staff (default: 28770)
 * - AUTHKEY_WA_CHECKOUT_DETAILS: Template for checkout thank-you (default: 28968)
 * - AUTHKEY_WA_FOOD_ORDER_RECEIVED: Template for food order confirmation to guest (default: 28983)
 * - AUTHKEY_WA_PENDING_PAYMENT: Template for payment reminders (default: 18649)
 * - AUTHKEY_WA_ENQUIRY_CONFIRMATION: Template for enquiry confirmation (default: 18491)
 * - AUTHKEY_WA_PREBILL: Template for pre-bill verification (default: 19852)
 * - AUTHKEY_WA_SPLIT_PAYMENT: Template for balance payment link (default: 29412)
 * - AUTHKEY_WA_ADVANCE_PAYMENT: Template for advance payment request (default: 29410)
 * - AUTHKEY_WA_ADVANCE_CONFIRMATION: Template for payment received confirmation (default: 29409)
 * - AUTHKEY_WA_FOOD_ORDER_STAFF_ALERT: Template for new food order alert to staff (default: 29652)
 * 
 * Template variables are passed in order: var1, var2, var3, etc.
 * Ensure your authkey templates match the variable order!
 * 
 * LIMITATIONS:
 * - Currently defaults to Indian country code (91)
 */

interface WhatsAppMessageParams {
  countryCode: string;
  mobile: string;
  templateId: string;
  variables?: string[]; // Ordered array of variables
}

interface WhatsAppResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Clean phone number for Indian numbers
 * - Removes all non-digit characters
 * - Iteratively strips all variants of prefixes until 10 digits remain
 * - Returns 10-digit mobile number
 * - Throws error if result is not 10 digits
 * 
 * Examples:
 * "+91 8700553523" -> "8700553523"
 * "918700553523" -> "8700553523"
 * "0091 8700553523" -> "8700553523"
 * "00910123456789" -> "0123456789"
 * "08700553523" -> "8700553523"
 * "8700553523" -> "8700553523"
 */
function cleanIndianPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  
  // Iteratively strip prefixes until we have exactly 10 digits
  while (cleaned.length > 10) {
    // Try stripping 0091 (international dialing)
    if (cleaned.startsWith("0091") && cleaned.length >= 14) {
      cleaned = cleaned.substring(4);
    }
    // Try stripping 91 (country code)
    else if (cleaned.startsWith("91") && cleaned.length >= 12) {
      cleaned = cleaned.substring(2);
    }
    // Try stripping leading 0 (trunk prefix)
    else if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    // Can't reduce further
    else {
      break;
    }
  }
  
  // Validate: must be exactly 10 digits
  if (cleaned.length !== 10) {
    throw new Error(`Invalid Indian phone number: expected 10 digits, got ${cleaned.length} (original: ${phone}, cleaned: ${cleaned})`);
  }
  
  return cleaned;
}

/**
 * Send WhatsApp message using authkey.io API
 */
export async function sendWhatsAppMessage(params: WhatsAppMessageParams): Promise<WhatsAppResponse> {
  if (params.templateId === "disabled") {
    console.log(`[WhatsApp] Template disabled — skipping message to +${params.countryCode}-${params.mobile}`);
    return { success: true, message: "Template disabled" };
  }

  const authkey = process.env.AUTHKEY_API_KEY;
  
  if (!authkey) {
    console.error("[WhatsApp] AUTHKEY_API_KEY not configured");
    return { success: false, error: "WhatsApp API key not configured" };
  }

  const url = "https://console.authkey.io/restapi/requestjson.php";
  
  // Build body values from ordered variables array
  // authkey.io expects: { "1": "value1", "2": "value2", ... }
  const bodyValues: Record<string, string> = {};
  if (params.variables) {
    params.variables.forEach((value, index) => {
      bodyValues[String(index + 1)] = value;
    });
  }

  const payload = {
    country_code: params.countryCode,
    mobile: params.mobile,
    wid: params.templateId,
    type: "text",
    bodyValues: bodyValues,
  };

  try {
    console.log(`[WhatsApp] Sending message to +${params.countryCode}-${params.mobile} (template: ${params.templateId})`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authkey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Authkey returns HTTP 200 even on failure — must check the response body.
    // Actual response: {"status":"Success","LogID":"...","Message":"Submitted Successfully"}
    // Use case-insensitive checks since the API returns "Success" (capital S)
    const statusLower = typeof data.status === "string" ? data.status.toLowerCase() : "";
    const typeLower = typeof data.type === "string" ? data.type.toLowerCase() : "";
    const messageLower = typeof data.Message === "string" ? data.Message.toLowerCase() : "";
    const isSuccess = response.ok && (
      statusLower === "success" ||
      typeLower === "success" ||
      data.status === 200 ||
      data.LogID !== undefined ||
      data.messageId !== undefined ||
      messageLower.includes("submitted") ||
      messageLower.includes("success")
    );

    if (isSuccess) {
      console.log(`[WhatsApp] ✅ Message delivered (template: ${params.templateId})`);
      return { success: true, message: "WhatsApp message sent successfully" };
    } else {
      console.error(`[WhatsApp] ❌ API rejected message (template: ${params.templateId}):`, JSON.stringify(data));
      return { success: false, error: data.message || data.error || JSON.stringify(data) };
    }
  } catch (error: any) {
    console.error("[WhatsApp] Request failed:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

/**
 * Send booking confirmation WhatsApp message
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Date
 * 4. Check-out Date
 * 5. Room Numbers
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string,
  roomNumbers: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_BOOKING_CONFIRMATION || "18491";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, checkInDate, checkOutDate, roomNumbers],
  });
}

/**
 * Send payment confirmation WhatsApp message
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Amount Paid
 * 3. Payment Date
 * 4. Booking Reference
 * 5. Property Name
 */
export async function sendPaymentConfirmation(
  phoneNumber: string,
  guestName: string,
  amountPaid: string,
  paymentDate: string,
  bookingReference: string,
  propertyName: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_PAYMENT_CONFIRMATION || "18649";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, amountPaid, paymentDate, bookingReference, propertyName],
  });
}

/**
 * Send check-in notification WhatsApp message
 * Template: checkinnmsgwoodpecker (WID 28769) — Woodpecker Inn only
 * Template: WID 29292 — all other properties
 *
 * Template variables (in order):
 * 1. Property Name  — "Welcome to 🌿 {{1}}"
 * 2. Guest Name     — "Dear , {{2}}"
 * 3. Food Order Link — "👉 {{3}}"
 */
export async function sendCheckInNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  foodOrderLink: string,
  templateIdOverride?: string
): Promise<WhatsAppResponse> {
  // Use override if provided (routes.ts always passes the correct one based on property name)
  // 28769 → Woodpecker Inn ONLY | 29292 → all other properties
  const isWoodpecker = propertyName.toLowerCase().includes("woodpecker");
  const templateId = templateIdOverride || (isWoodpecker ? "28769" : "29292");

  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [propertyName, guestName, foodOrderLink],
  });
}

/**
 * Send new OTA booking received alert to property staff
 * Template: notification (WID 28770)
 *
 * Template variables (in order):
 * 1. Property Name  — "A new booking has been received for . {{1}}"
 * 2. Guest Name     — "Guest Name: {{2}}"
 *
 * Recipient: property's contactPhone (staff/manager, not the guest)
 */
export async function sendOtaBookingNotification(
  phoneNumber: string,
  propertyName: string,
  guestName: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_OTA_BOOKING || "28770";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [propertyName, guestName],
  });
}

/**
 * Send booking confirmation WhatsApp message to guest
 * Template: WID 29294 — sent when booking status changes to "confirmed"
 *
 * Template variables (in order):
 * 1. Property Name  — "🌿 *Booking Confirmed!* 🌿 {{1}}"
 * 2. Guest Name     — "Dear , {{2}}"
 * 3. Check-in Date  — "📅 *Check-in Date:* {{3}}"
 * 4. Check-out Date — "📅 *Check-out Date:* {{4}}"
 */
export async function sendBookingConfirmedNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_BOOKING_CONFIRMED || "29294";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);

  return sendWhatsAppMessage({
    countryCode: "91",
    mobile: cleanedPhone,
    templateId,
    variables: [propertyName, guestName, checkInDate, checkOutDate],
  });
}

/**
 * Send checkout thank-you WhatsApp message to guest
 * Template: WID 28968
 *
 * Template text:
 * "Dear {{1}} ,
 * We hope you had a wonderful stay with us. 😊
 * Your check-out has been successfully completed. Thank you for choosing * {{2}} *.
 * We truly appreciate your visit and look forward to welcoming you again soon in the beautiful Himalayas. 🌄
 * Safe travels! 🙏"
 *
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 *
 * Note: older parameters (totalAmount, checkoutDate, roomNumbers) are kept in the
 * function signature for backward compatibility but are not passed to the template.
 */
export async function sendCheckoutNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  totalAmount?: string,
  checkoutDate?: string,
  roomNumbers?: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_CHECKOUT_DETAILS || "28968";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName],
  });
}

/**
 * Send food order received confirmation WhatsApp message to guest
 * Template: WID 28983
 *
 * Template text:
 * "🍽️ *Order Received*
 * Dear {{1}},
 * Your food order has been successfully received and sent to the kitchen. 👨‍🍳
 * ⏳ *Preparation Time:* 20–30 minutes
 * Your meal is now being freshly prepared and will be served shortly.
 * 🌿 *While you wait*, you can explore our range of *Himalayan organic products*, sourced directly from the mountains.
 * 🙏 *Thank you for ordering with us.*
 * Visit our website to explore more.
 * 👉 www.thepahadicompany.in"
 *
 * Template variables (in order):
 * 1. Guest Name (or customer name for restaurant orders)
 */
export async function sendFoodOrderReceived(
  phoneNumber: string,
  guestName: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_FOOD_ORDER_RECEIVED || "28983";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName],
  });
}

/**
 * Send new food order alert to property staff/admin
 * Template ID: 29652
 *
 * Template:
 * 🚨 New Food Order Received
 * Guest: {{1}}
 * Room: {{2}}
 * Order Details:
 * {{3}}
 * Total Amount: ₹ {{4}}
 * ⚠️ Please prepare the order immediately.
 *
 * Template variables (in order):
 * 1. Guest Name
 * 2. Room Number / "Walk-in" / "Restaurant"
 * 3. Order items (formatted list)
 * 4. Total Amount
 *
 * Recipient: property contactPhone (staff/admin)
 */
export async function sendFoodOrderStaffAlert(
  phoneNumber: string,
  guestName: string,
  room: string,
  orderDetails: string,
  totalAmount: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_FOOD_ORDER_STAFF_ALERT || "29652";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, room, orderDetails, totalAmount],
  });
}

/**
 * Send pre-bill notification WhatsApp message (APPROVED TEMPLATE - WID 19852)
 * 
 * Template Format:
 * "Dear {{1}} , here is your pre-bill for summary
 * Nights: 2
 * Room Charges: ₹ {{2}}
 * Food Charges: ₹ {{3}}
 * Total Amount: ₹ {{4}}
 * If you have any questions, please let us know."
 * 
 * Template variables (in order) - DO NOT include ₹ symbol, template has it:
 * 1. Guest Name (e.g., "Yogita")
 * 2. Room Charges (e.g., "5000.00") - no ₹ prefix
 * 3. Food Charges (e.g., "1500.00") - no ₹ prefix
 * 4. Balance Due (amount guest needs to pay after advance deduction)
 * 
 * NOTE: Parameter 4 now sends balance due (not total) so guest sees correct payable amount
 */
export async function sendPreBillNotification(
  phoneNumber: string,
  guestName: string,
  roomCharges: string,
  foodCharges: string,
  advancePaid: string,
  balanceDue: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_PREBILL || "19852";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  // Send balance due as the "Total Amount" parameter so guest sees correct payable amount
  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [
      guestName,      // 1. Guest Name
      roomCharges,    // 2. Room Charges
      foodCharges,    // 3. Food Charges
      balanceDue,     // 4. Balance Due (what guest actually needs to pay)
    ],
  });
}

/**
 * Send pending payment reminder WhatsApp message
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Pending Amount
 * 4. Due Date
 * 5. Booking Reference
 */
export async function sendPendingPaymentReminder(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  pendingAmount: string,
  dueDate: string,
  bookingReference: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_PENDING_PAYMENT || "18649";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, pendingAmount, dueDate, bookingReference],
  });
}

/**
 * Send enquiry confirmation WhatsApp message
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Date
 * 4. Check-out Date
 */
export async function sendEnquiryConfirmation(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_ENQUIRY_CONFIRMATION || "18491";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, checkInDate, checkOutDate],
  });
}

/**
 * Send welcome message with menu link WhatsApp notification after check-in
 * 
 * This is the comprehensive welcome message that includes:
 * - Property welcome
 * - WiFi info
 * - Food ordering link
 * - Amenities info
 * - Checkout time
 * - Contact number
 * 
 * Template variables (in order):
 * 1. Property Name (e.g., "Mountain View Resort")
 * 2. Guest Name (e.g., "Yogita")
 * 3. Menu Link (e.g., "https://yoursite.com/menu?type=room&property=1&room=102")
 */
export async function sendWelcomeWithMenuLink(
  phoneNumber: string,
  propertyName: string,
  guestName: string,
  menuLink: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_WELCOME_MENU || "21932";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [propertyName, guestName, menuLink],
  });
}

/**
 * Send advance payment request WhatsApp message
 * Template ID: 29410
 * 
 * Template: Dear {{1}}, Greetings from {{2}}! Thank you for choosing us
 * from {{3}} to {{4}}. Advance: ₹{{5}}. Payment link: {{6}}
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Date
 * 4. Check-out Date
 * 5. Advance Amount
 * 6. Payment Link
 */
export async function sendAdvancePaymentRequest(
  phoneNumber: string,
  guestName: string,
  checkInDate: string,
  checkOutDate: string,
  propertyName: string,
  advanceAmount: string,
  paymentLink: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_ADVANCE_PAYMENT || "29410";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, checkInDate, checkOutDate, advanceAmount, paymentLink],
  });
}

/**
 * Send advance payment confirmation WhatsApp message
 * Template ID: 29409
 * 
 * Template: Dear {{1}}, we have received your payment of ₹{{2}}.
 * Your booking is now confirmed. Thank you for booking with us!
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Amount Paid
 */
export async function sendAdvancePaymentConfirmation(
  phoneNumber: string,
  guestName: string,
  amountPaid: string,
  propertyName?: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_ADVANCE_CONFIRMATION || "29409";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, amountPaid],
  });
}

/**
 * Send payment reminder WhatsApp message
 * Template ID: 18489 (payment_reminder)
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Advance Amount
 * 3. Property Name
 * 4. Check-in Date
 * 5. Check-out Date
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  guestName: string,
  advanceAmount: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_PAYMENT_REMINDER || "18489";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, advanceAmount, propertyName, checkInDate, checkOutDate],
  });
}

/**
 * Send initial booking payment request — WID 29779
 * Sent immediately when advance payment link is generated.
 *
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Advance Amount (₹XXXX)
 * 4. Payment Link
 */
export async function sendInitialPaymentRequest(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  advanceAmount: string,
  paymentLink: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_INITIAL_PAYMENT || "29779";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  return sendWhatsAppMessage({
    countryCode: "91",
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, advanceAmount, paymentLink],
  });
}

/**
 * Send payment reminder 1 — WID 29780
 * Sent automatically +1 hour after the initial payment request.
 *
 * Template variables (in order):
 * 1. Guest Name
 * 2. Payment Link
 */
export async function sendPaymentReminder1(
  phoneNumber: string,
  guestName: string,
  paymentLink: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_REMINDER1 || "29780";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  return sendWhatsAppMessage({
    countryCode: "91",
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, paymentLink],
  });
}

/**
 * Send final payment reminder — WID 29781
 * Sent automatically +3 hours after the initial payment request.
 *
 * Template variables (in order):
 * 1. Guest Name
 * 2. Payment Link
 */
export async function sendFinalPaymentReminder(
  phoneNumber: string,
  guestName: string,
  paymentLink: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_FINAL_REMINDER || "29781";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  return sendWhatsAppMessage({
    countryCode: "91",
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, paymentLink],
  });
}

/**
 * Send booking expired/room released notice — WID 29782
 * MANUAL USE ONLY — send after admin manually cancels the booking.
 *
 * Template variables (in order):
 * 1. Guest Name
 */
export async function sendBookingExpiredNotice(
  phoneNumber: string,
  guestName: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_BOOKING_EXPIRED || "29782";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  return sendWhatsAppMessage({
    countryCode: "91",
    mobile: cleanedPhone,
    templateId,
    variables: [guestName],
  });
}

/**
 * Send task reminder WhatsApp message
 * Template ID: configurable via AUTHKEY_WA_TASK_REMINDER
 * 
 * Default Template Format:
 * "Hello {{1}}, Task: {{2}}, Property: {{3}}, Due: {{4}}, Status: {{5}}"
 * 
 * Template variables (in order):
 * 1. Assigned User Name
 * 2. Task Title
 * 3. Property Name
 * 4. Due Date/Time
 * 5. Status
 */
export async function sendTaskReminder(
  phoneNumber: string,
  userName: string,
  taskTitle: string,
  propertyName: string,
  dueDate: string,
  status: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_TASK_REMINDER || "18489";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [userName, taskTitle, propertyName, dueDate, status],
  });
}

/**
 * Send custom WhatsApp message with custom template and variables
 * 
 * @param phoneNumber - Indian phone number (will be cleaned and formatted)
 * @param templateId - authkey.io template ID (WID)
 * @param variables - Ordered array of variables matching template order
 */
export async function sendCustomWhatsAppMessage(
  phoneNumber: string,
  templateId: string,
  variables: string[]
): Promise<WhatsAppResponse> {
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables,
  });
}

/**
 * Send self check-in link WhatsApp message
 * Uses template 22462 by default
 * 
 * Template Format (22462):
 * "Hello {{1}} ,
 * Welcome to {{2}} 🌿
 * Your booking for today is confirmed.
 * You can complete your self check-in now by uploading your ID proof using the link below:
 * {{3}}
 * Once the check-in is completed, you will receive your room number and stay details instantly.
 * If you need any assistance, please feel free to contact us.
 * We wish you a comfortable and pleasant stay 🙂"
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Link
 */
export async function sendSelfCheckinLink(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkinLink: string,
  checkInDate: string,
  checkOutDate?: string,
  roomNumber?: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_SELF_CHECKIN || "22462";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  // Template 22462 variables: [guestName, propertyName, checkinLink]
  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, checkinLink],
  });
}

// Template type mapping for WhatsApp template settings
export type TemplateType = 
  | 'booking_confirmation' 
  | 'pending_payment' 
  | 'payment_reminder'
  | 'payment_confirmation' 
  | 'checkin_message' 
  | 'checkout_message'
  | 'prebill_message'
  | 'split_payment'
  | 'welcome_menu';

interface TemplateSetting {
  templateType: string;
  isEnabled: boolean;
  sendTiming: string;
  delayHours: number;
}

/**
 * Check if a template should be sent immediately or delayed
 * Returns: { send: boolean, delayMs: number }
 * - If disabled: send = false
 * - If immediate: send = true, delayMs = 0
 * - If delayed: send = true, delayMs = delay in milliseconds
 */
export async function checkTemplateSetting(
  propertyId: number,
  templateType: TemplateType,
  storage: any
): Promise<{ send: boolean; delayMs: number }> {
  try {
    const settings = await storage.getWhatsappTemplateSettings(propertyId);
    const setting = settings?.find((s: TemplateSetting) => s.templateType === templateType);
    
    if (!setting) {
      // No setting found - default to enabled and immediate
      console.log(`[WhatsApp] No template setting found for ${templateType} on property ${propertyId}, defaulting to immediate`);
      return { send: true, delayMs: 0 };
    }
    
    if (!setting.isEnabled) {
      console.log(`[WhatsApp] Template ${templateType} is disabled for property ${propertyId}`);
      return { send: false, delayMs: 0 };
    }
    
    if (setting.sendTiming === 'delayed' && setting.delayHours > 0) {
      const delayMs = setting.delayHours * 60 * 60 * 1000; // Convert hours to ms
      console.log(`[WhatsApp] Template ${templateType} set to delay ${setting.delayHours} hours for property ${propertyId}`);
      return { send: true, delayMs };
    }
    
    console.log(`[WhatsApp] Template ${templateType} enabled for immediate send on property ${propertyId}`);
    return { send: true, delayMs: 0 };
  } catch (error) {
    console.error(`[WhatsApp] Error checking template setting for ${templateType}:`, error);
    // Default to enabled and immediate on error
    return { send: true, delayMs: 0 };
  }
}

/**
 * Schedule a delayed WhatsApp message
 * This sets a timeout to send the message after the specified delay
 */
export function scheduleDelayedMessage(
  delayMs: number,
  sendFn: () => Promise<WhatsAppResponse>
): void {
  console.log(`[WhatsApp] Scheduling message to be sent in ${delayMs / 1000 / 60 / 60} hours`);
  setTimeout(async () => {
    try {
      const result = await sendFn();
      console.log(`[WhatsApp] Delayed message sent:`, result);
    } catch (error) {
      console.error(`[WhatsApp] Failed to send delayed message:`, error);
    }
  }, delayMs);
}
