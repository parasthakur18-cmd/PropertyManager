/**
 * Authkey.io Service for WhatsApp and SMS messaging
 * Documentation: https://authkey.io/docs
 */

interface AuthkeyConfig {
  apiKey: string;
  whatsappNumber?: string; // Your registered WhatsApp Business number
}

interface WhatsAppTemplateMessage {
  to: string; // Recipient phone number with country code (e.g., +919876543210)
  template: string; // Template name
  parameters: string[]; // Template parameters in order
}

interface SMSMessage {
  to: string; // Recipient phone number with country code
  message: string; // SMS content
  senderId?: string; // DLT approved sender ID
}

interface AuthkeyResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

export class AuthkeyService {
  private apiKey: string;
  private whatsappNumber: string;
  private baseUrl = 'https://api.authkey.io/request';

  constructor(config: AuthkeyConfig) {
    this.apiKey = config.apiKey;
    this.whatsappNumber = config.whatsappNumber || '';
  }

  /**
   * Send WhatsApp template message
   * Templates must be pre-approved through authkey.io dashboard
   */
  async sendWhatsAppTemplate(params: WhatsAppTemplateMessage): Promise<AuthkeyResponse> {
    try {
      if (!this.apiKey) {
        console.log('[Authkey] API key not configured - message logged only');
        return { success: false, error: 'API key not configured' };
      }

      // Format phone number (remove spaces, ensure + prefix)
      const formattedPhone = params.to.replace(/\s+/g, '').replace(/^(?!\+)/, '+');

      // Authkey.io WhatsApp API endpoint
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.apiKey,
        },
        body: JSON.stringify({
          integrated_number: this.whatsappNumber,
          content_type: 'template',
          payload: {
            to: formattedPhone,
            type: 'template',
            template: {
              name: params.template,
              language: {
                code: 'en', // Default to English
                policy: 'deterministic',
              },
              components: params.parameters.length > 0 ? [
                {
                  type: 'body',
                  parameters: params.parameters.map(param => ({
                    type: 'text',
                    text: param,
                  })),
                },
              ] : [],
            },
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.message_id) {
        console.log(`[Authkey] WhatsApp message sent successfully. Message ID: ${data.message_id}`);
        return {
          success: true,
          messageId: data.message_id,
          status: 'sent',
        };
      } else {
        console.error('[Authkey] WhatsApp send failed:', data);
        return {
          success: false,
          error: data.message || 'Failed to send WhatsApp message',
        };
      }
    } catch (error: any) {
      console.error('[Authkey] WhatsApp send error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Send SMS message
   * Sender ID must be DLT approved
   */
  async sendSMS(params: SMSMessage): Promise<AuthkeyResponse> {
    try {
      if (!this.apiKey) {
        console.log('[Authkey] API key not configured - SMS logged only');
        return { success: false, error: 'API key not configured' };
      }

      // Format phone number - remove + and spaces, get just the digits
      let phoneNumber = params.to.replace(/\s+/g, '').replace(/^\+/, '');
      
      // Extract country code and mobile number
      // For India (+91), expect format: 91XXXXXXXXXX
      let countryCode = '91'; // Default to India
      let mobileNumber = phoneNumber;
      
      if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
        countryCode = '91';
        mobileNumber = phoneNumber.substring(2); // Remove country code
      }

      // Build URL with query parameters (authkey.io uses GET requests)
      const queryParams = new URLSearchParams({
        authkey: this.apiKey,
        mobile: mobileNumber,
        country_code: countryCode,
        sms: params.message,
        sender: params.senderId || 'HOSTEZ', // Your DLT approved sender ID
      });

      const url = `${this.baseUrl}?${queryParams.toString()}`;
      
      console.log('[Authkey] Sending SMS to:', mobileNumber, 'Country:', countryCode);
      console.log('[Authkey] Request URL:', url.replace(this.apiKey, '***KEY***')); // Hide API key in logs

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('[Authkey] SMS API Response:', data);

      // Authkey.io returns status in the response
      if (response.ok && (data.status === 'success' || data.Status === 'Success')) {
        const messageId = data.message_id || data.MessageId || 'unknown';
        console.log(`[Authkey] SMS sent successfully. Message ID: ${messageId}`);
        return {
          success: true,
          messageId,
          status: 'sent',
        };
      } else {
        console.error('[Authkey] SMS send failed:', data);
        return {
          success: false,
          error: data.Message || data.message || 'Failed to send SMS',
        };
      }
    } catch (error: any) {
      console.error('[Authkey] SMS send error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  /**
   * Check delivery status of a message
   */
  async getDeliveryStatus(messageId: string): Promise<AuthkeyResponse> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      const response = await fetch(`${this.baseUrl}/status/${messageId}`, {
        method: 'GET',
        headers: {
          'authkey': this.apiKey,
        },
      });

      const data = await response.json();

      return {
        success: true,
        messageId,
        status: data.status || 'unknown',
      };
    } catch (error: any) {
      console.error('[Authkey] Status check error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }
}

/**
 * Create authkey service instance from environment variables
 */
export function createAuthkeyService(): AuthkeyService | null {
  const apiKey = process.env.AUTHKEY_API_KEY;
  const whatsappNumber = process.env.AUTHKEY_WHATSAPP_NUMBER;

  if (!apiKey) {
    console.log('[Authkey] API credentials not configured - messages will be logged only');
    return null;
  }

  return new AuthkeyService({
    apiKey,
    whatsappNumber,
  });
}
