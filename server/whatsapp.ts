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
 * - AUTHKEY_WA_CHECKIN_DETAILS: Template for check-in notification (default: 18712)
 * - AUTHKEY_WA_CHECKOUT_DETAILS: Template for checkout/billing (default: 18667)
 * - AUTHKEY_WA_PENDING_PAYMENT: Template for payment reminders (default: 18649)
 * - AUTHKEY_WA_ENQUIRY_CONFIRMATION: Template for enquiry confirmation (default: 18491)
 * - AUTHKEY_WA_PREBILL: Template for pre-bill verification (default: 19852)
 * - AUTHKEY_WA_SPLIT_PAYMENT: Template for split/advance payments (default: 19892)
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
    
    if (response.ok) {
      console.log("[WhatsApp] Message sent successfully");
      return { success: true, message: "WhatsApp message sent successfully" };
    } else {
      console.error("[WhatsApp] API error:", data);
      return { success: false, error: data.message || "Failed to send WhatsApp message" };
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
 * 
 * Template variables (in order):
 * 1. Property Name (e.g., "Mountain View")
 * 2. Guest Name (e.g., "Yogita")
 * 3. Room Numbers
 * 4. Check-in Date
 * 5. Check-out Date
 */
export async function sendCheckInNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  roomNumbers: string,
  checkInDate: string,
  checkOutDate: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_CHECKIN_DETAILS || "18712";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [propertyName, guestName, roomNumbers, checkInDate, checkOutDate],
  });
}

/**
 * Send checkout/billing notification WhatsApp message
 * 
 * Template variables (in order):
 * 1. Guest Name
 * 2. Property Name
 * 3. Total Amount
 * 4. Checkout Date
 * 5. Room Numbers
 */
export async function sendCheckoutNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  totalAmount: string,
  checkoutDate: string,
  roomNumbers: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_CHECKOUT_DETAILS || "18667";
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, totalAmount, checkoutDate, roomNumbers],
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
