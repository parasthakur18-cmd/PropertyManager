/**
 * WhatsApp Messaging Service using authkey.io API
 * Documentation: https://authkey.io/whatsapp-api-docs
 * 
 * IMPORTANT CONFIGURATION:
 * 1. Set AUTHKEY_API_KEY in environment variables
 * 2. Set AUTHKEY_WA_TEMPLATE_ID for the booking confirmation template
 * 3. Template variables are passed in order: var1, var2, var3, etc.
 * 4. Ensure your authkey template matches the variable order
 * 
 * LIMITATIONS:
 * - Currently defaults to Indian country code (91)
 * - Template ID is configurable via environment variable
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
 * IMPORTANT: Template variables are sent in ORDER:
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Date
 * 4. Check-out Date
 * 5. Room Numbers
 * 
 * Ensure your authkey.io template matches this order!
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string,
  roomNumbers: string
): Promise<WhatsAppResponse> {
  // Get template ID from environment or use default
  const templateId = process.env.AUTHKEY_WA_TEMPLATE_ID || "17222";
  
  // Clean and format phone number for Indian numbers
  const cleanedPhone = cleanIndianPhoneNumber(phoneNumber);
  
  // NOTE: Currently hardcoded to India (91)
  // TODO: Add country code field to guests table and use it here
  const countryCode = "91";

  return sendWhatsAppMessage({
    countryCode,
    mobile: cleanedPhone,
    templateId,
    variables: [guestName, propertyName, checkInDate, checkOutDate, roomNumbers],
  });
}

/**
 * Send enquiry notification WhatsApp message
 * 
 * IMPORTANT: Template variables are sent in ORDER:
 * 1. Guest Name
 * 2. Property Name
 * 3. Check-in Date
 * 4. Check-out Date
 */
export async function sendEnquiryNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string
): Promise<WhatsAppResponse> {
  const templateId = process.env.AUTHKEY_WA_TEMPLATE_ID || "17222";
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
