/**
 * WhatsApp Messaging Service using authkey.io API
 * Documentation: https://authkey.io/whatsapp-api-docs
 */

interface WhatsAppMessageParams {
  countryCode: string;
  mobile: string;
  templateId: string;
  variables?: Record<string, string>;
}

interface WhatsAppResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send WhatsApp message using authkey.io API
 */
export async function sendWhatsAppMessage(params: WhatsAppMessageParams): Promise<WhatsAppResponse> {
  const authkey = process.env.AUTHKEY_API_KEY;
  
  if (!authkey) {
    console.error("AUTHKEY_API_KEY not configured");
    return { success: false, error: "WhatsApp API key not configured" };
  }

  const url = "https://console.authkey.io/restapi/requestjson.php";
  
  // Build body values from variables
  const bodyValues: Record<string, string> = {};
  if (params.variables) {
    Object.entries(params.variables).forEach(([key, value], index) => {
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
      return { success: true, message: "WhatsApp message sent successfully" };
    } else {
      console.error("WhatsApp API error:", data);
      return { success: false, error: data.message || "Failed to send WhatsApp message" };
    }
  } catch (error: any) {
    console.error("WhatsApp API request failed:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

/**
 * Send booking confirmation WhatsApp message
 * Template should have variables: {#guestName#}, {#propertyName#}, {#checkIn#}, {#checkOut#}, {#roomNumbers#}
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string,
  roomNumbers: string,
  templateId: string = "17222" // Default template ID, can be configured
): Promise<WhatsAppResponse> {
  // Extract country code and mobile number
  // Assuming Indian numbers for now (+91)
  const countryCode = "91";
  const mobile = phoneNumber.replace(/\D/g, "").slice(-10); // Last 10 digits

  return sendWhatsAppMessage({
    countryCode,
    mobile,
    templateId,
    variables: {
      guestName,
      propertyName,
      checkInDate,
      checkOutDate,
      roomNumbers,
    },
  });
}

/**
 * Send enquiry notification WhatsApp message
 * Template should have variables: {#guestName#}, {#propertyName#}, {#checkIn#}, {#checkOut#}
 */
export async function sendEnquiryNotification(
  phoneNumber: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string,
  templateId: string = "17222" // Default template ID, can be configured
): Promise<WhatsAppResponse> {
  const countryCode = "91";
  const mobile = phoneNumber.replace(/\D/g, "").slice(-10);

  return sendWhatsAppMessage({
    countryCode,
    mobile,
    templateId,
    variables: {
      guestName,
      propertyName,
      checkInDate,
      checkOutDate,
    },
  });
}

/**
 * Send custom WhatsApp message with custom template and variables
 */
export async function sendCustomWhatsAppMessage(
  phoneNumber: string,
  templateId: string,
  variables: Record<string, string>
): Promise<WhatsAppResponse> {
  const countryCode = "91";
  const mobile = phoneNumber.replace(/\D/g, "").slice(-10);

  return sendWhatsAppMessage({
    countryCode,
    mobile,
    templateId,
    variables,
  });
}
