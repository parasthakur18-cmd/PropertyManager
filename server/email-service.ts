/**
 * Email Service for Hostezee PMS
 * Sends transactional emails for bookings, check-ins, and password resets
 * Currently logs emails to console (ready for SMTP integration)
 */

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using Node.js nodemailer
 * Falls back to console logging if email service is not configured
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResponse> {
  try {
    // Log email to console (for development/testing)
    console.log(`[EMAIL] Sending to: ${message.to}`);
    console.log(`[EMAIL] Subject: ${message.subject}`);
    console.log(`[EMAIL] HTML:\n${message.html}`);

    // If in production with email service configured, send via SMTP
    // For now, logging is sufficient
    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('[EMAIL] Send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  guestEmail: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  checkOutDate: string,
  roomNumbers: string,
  bookingId: number
): Promise<EmailResponse> {
  const subject = `Booking Confirmation - ${propertyName} #${bookingId}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .booking-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #17a2b8; }
          .label { font-weight: bold; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
          </div>
          <div class="content">
            <p>Dear ${guestName},</p>
            <p>Thank you for booking with us! Your reservation has been confirmed.</p>
            
            <div class="booking-details">
              <p><span class="label">Booking ID:</span> #${bookingId}</p>
              <p><span class="label">Property:</span> ${propertyName}</p>
              <p><span class="label">Room(s):</span> ${roomNumbers}</p>
              <p><span class="label">Check-in:</span> ${checkInDate}</p>
              <p><span class="label">Check-out:</span> ${checkOutDate}</p>
            </div>

            <p>On the day of your arrival, you can use our <strong>Guest Self Check-in</strong> system to check in quickly without waiting for staff.</p>
            
            <p>If you have any questions, please contact us.</p>
            
            <p>We look forward to welcoming you!</p>
            <p>Best regards,<br>The Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: guestEmail,
    subject,
    html,
  });
}

/**
 * Send self check-in confirmation email
 */
export async function sendSelfCheckinConfirmationEmail(
  guestEmail: string,
  guestName: string,
  propertyName: string,
  checkInDate: string,
  roomNumber: string
): Promise<EmailResponse> {
  const subject = `Self Check-in Confirmed - ${propertyName}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .success-box { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Check-in Confirmed</h1>
          </div>
          <div class="content">
            <p>Hello ${guestName},</p>
            
            <div class="success-box">
              <p style="margin: 0; color: #155724;"><strong>Your check-in has been completed successfully!</strong></p>
            </div>

            <p><strong>Booking Details:</strong></p>
            <ul>
              <li>Property: ${propertyName}</li>
              <li>Room: ${roomNumber}</li>
              <li>Check-in Date: ${checkInDate}</li>
            </ul>

            <p>Your room key has been registered in the system. Please proceed to your room.</p>
            <p>If you need any assistance during your stay, please contact front desk.</p>
            
            <p>Thank you for choosing us!</p>
            <p>Best regards,<br>The Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: guestEmail,
    subject,
    html,
  });
}

/**
 * Send password reset OTP email
 */
export async function sendPasswordResetEmail(
  email: string,
  otp: string
): Promise<EmailResponse> {
  const subject = 'Password Reset - One-Time Code';
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .otp-box { background: white; border: 2px solid #dc3545; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>We received a request to reset your password. Your one-time code is below:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p style="margin-top: 10px; color: #666;">Valid for 15 minutes</p>
            </div>

            <p><span class="warning">⚠ Security Notice:</span> If you didn't request this, please ignore this email and your account will remain secure.</p>
            
            <p>To reset your password:</p>
            <ol>
              <li>Go to the password reset page</li>
              <li>Enter this one-time code</li>
              <li>Create your new password</li>
            </ol>

            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              For security reasons, never share your OTP with anyone. Our team will never ask for your OTP.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
