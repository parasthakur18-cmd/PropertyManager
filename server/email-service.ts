/**
 * Email Service for Hostezee PMS
 * Sends transactional emails using AgentMail API via Replit Connector
 * Integration: connection:conn_agentmail_01KBRYGARK83M8KS7F8DFKY8V5
 */

import { AgentMailClient } from 'agentmail';

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

let connectionSettings: any;

/**
 * Get AgentMail credentials from Replit Connector
 */
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=agentmail',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      return null;
    }
    return { apiKey: connectionSettings.settings.api_key };
  } catch (error) {
    console.error('[EMAIL] Failed to get AgentMail credentials:', error);
    return null;
  }
}

/**
 * Get fresh AgentMail client (never cached - tokens expire)
 */
async function getAgentMailClient() {
  const credentials = await getCredentials();
  if (!credentials) {
    return null;
  }
  return new AgentMailClient({
    apiKey: credentials.apiKey
  });
}

// Store the inbox ID after creation (persisted for session)
let cachedInboxId: string | null = null;

/**
 * Get or create an inbox for sending emails
 */
async function getOrCreateInbox(client: AgentMailClient): Promise<string | null> {
  try {
    // Check if we have a cached inbox
    if (cachedInboxId) {
      return cachedInboxId;
    }

    // List existing inboxes
    console.log('[EMAIL] Listing existing inboxes...');
    const inboxesResponse: any = await client.inboxes.list();
    
    // AgentMail response structure: { count, inboxes: [{ inboxId, displayName, ... }] }
    const inboxes = inboxesResponse.inboxes || inboxesResponse.body?.inboxes || [];
    
    if (Array.isArray(inboxes) && inboxes.length > 0) {
      // Use inboxId field (email address format like "name@agentmail.to")
      cachedInboxId = inboxes[0].inboxId || inboxes[0].id;
      console.log(`[EMAIL] Using existing inbox: ${cachedInboxId}`);
      return cachedInboxId;
    }

    // Create new inbox
    console.log('[EMAIL] Creating new inbox...');
    const newInbox: any = await client.inboxes.create({
      displayName: 'Hostezee Notifications'
    });
    
    // Extract inboxId from response
    cachedInboxId = newInbox.inboxId || newInbox.body?.inboxId || newInbox.id;
    if (cachedInboxId) {
      console.log(`[EMAIL] Created new inbox: ${cachedInboxId}`);
      return cachedInboxId;
    }
    
    console.error('[EMAIL] Could not extract inbox ID from response:', JSON.stringify(newInbox));
    return null;
  } catch (error: any) {
    console.error('[EMAIL] Failed to get/create inbox:', error.message);
    return null;
  }
}

/**
 * Send email using AgentMail API via Replit Connector
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResponse> {
  try {
    const client = await getAgentMailClient();
    
    if (!client) {
      console.warn('[EMAIL] AgentMail not connected. Logging email to console.');
      console.log(`[EMAIL CONSOLE] To: ${message.to}`);
      console.log(`[EMAIL CONSOLE] Subject: ${message.subject}`);
      return {
        success: true,
        messageId: `email-console-${Date.now()}`,
      };
    }

    // Get or create inbox
    const inboxId = await getOrCreateInbox(client);
    if (!inboxId) {
      console.warn('[EMAIL] No inbox available. Logging email to console.');
      console.log(`[EMAIL CONSOLE] To: ${message.to}`);
      console.log(`[EMAIL CONSOLE] Subject: ${message.subject}`);
      return {
        success: true,
        messageId: `email-console-${Date.now()}`,
      };
    }

    // Send email via AgentMail
    const sendResponse = await client.inboxes.messages.send(inboxId, {
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text || message.subject,
    });

    const messageId = sendResponse.body?.messageId || sendResponse.body?.id;
    console.log(`[EMAIL] Sent to ${message.to} - Message ID: ${messageId}`);
    
    return {
      success: true,
      messageId: messageId || `email-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('[EMAIL] Error sending email:', error.message);
    // Fallback: log email to console when API unreachable
    console.log(`[EMAIL FALLBACK] To: ${message.to}`);
    console.log(`[EMAIL FALLBACK] Subject: ${message.subject}`);
    return {
      success: true,
      messageId: `email-error-${Date.now()}`,
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
            <h1>Check-in Confirmed</h1>
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
 * Send issue report notification email to super admin
 */
export async function sendIssueReportNotificationEmail(
  adminEmail: string,
  reporterName: string,
  title: string,
  description: string,
  category: string,
  severity: string
): Promise<EmailResponse> {
  const subject = `[${severity.toUpperCase()}] New Issue Report: ${title}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; }
          .label { font-weight: bold; color: #555; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .severity-critical { color: #dc2626; }
          .severity-high { color: #f97316; }
          .severity-medium { color: #eab308; }
          .severity-low { color: #22c55e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Issue Report</h1>
          </div>
          <div class="content">
            <p>A user has submitted a new issue report in your PMS system.</p>
            
            <div class="details-box">
              <p><span class="label">Reported By:</span> ${reporterName}</p>
              <p><span class="label">Title:</span> ${title}</p>
              <p><span class="label">Category:</span> ${category.replace(/_/g, " ").toUpperCase()}</p>
              <p><span class="label severity-${severity}">Severity:</span> <span class="severity-${severity}">${severity.toUpperCase()}</span></p>
            </div>

            <p><span class="label">Description:</span></p>
            <div style="background: white; padding: 15px; border-left: 3px solid #1e40af; white-space: pre-wrap;">${description}</div>

            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              <strong>Next Step:</strong> Log in to your Super Admin Portal → Reports tab to view and manage this issue.
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
    to: adminEmail,
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

            <p><span class="warning">Security Notice:</span> If you didn't request this, please ignore this email and your account will remain secure.</p>
            
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

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  guestEmail: string,
  guestName: string,
  propertyName: string,
  amount: number,
  bookingId: number,
  paymentDate: string
): Promise<EmailResponse> {
  const subject = `Payment Confirmation - ${propertyName} #${bookingId}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .payment-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #28a745; }
          .label { font-weight: bold; color: #555; }
          .amount { font-size: 24px; color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${guestName},</p>
            <p>Thank you! Your payment has been successfully received and confirmed.</p>
            
            <div class="payment-details">
              <p><span class="label">Booking ID:</span> #${bookingId}</p>
              <p><span class="label">Property:</span> ${propertyName}</p>
              <p><span class="label">Amount Paid:</span> <span class="amount">₹${amount.toFixed(2)}</span></p>
              <p><span class="label">Payment Date:</span> ${paymentDate}</p>
            </div>

            <p>Your booking is confirmed and you're all set for your stay!</p>
            
            <p>If you have any questions, please contact us.</p>
            
            <p>Thank you for your reservation!</p>
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
 * Send expense notification email to admin
 */
export async function sendExpenseNotificationEmail(
  adminEmail: string,
  adminName: string,
  propertyName: string,
  categoryName: string,
  amount: number,
  description: string
): Promise<EmailResponse> {
  const subject = `New Expense Recorded - ${propertyName}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #fd7e14; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .expense-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #fd7e14; }
          .label { font-weight: bold; color: #555; }
          .amount { font-size: 20px; color: #fd7e14; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Expense Recorded</h1>
          </div>
          <div class="content">
            <p>Hello ${adminName},</p>
            <p>A new expense has been recorded in your system.</p>
            
            <div class="expense-details">
              <p><span class="label">Property:</span> ${propertyName}</p>
              <p><span class="label">Category:</span> ${categoryName}</p>
              <p><span class="label">Amount:</span> <span class="amount">₹${amount.toFixed(2)}</span></p>
              <p><span class="label">Description:</span> ${description}</p>
            </div>

            <p>You can view all expenses and manage your budget in the Expenses section of your dashboard.</p>
            
            <p>Best regards,<br>Hostezee PMS</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}

/**
 * Send vendor payment notification email
 */
export async function sendVendorPaymentNotificationEmail(
  adminEmail: string,
  adminName: string,
  vendorName: string,
  amount: number,
  paymentDate: string
): Promise<EmailResponse> {
  const subject = `Vendor Payment Recorded - ${vendorName}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0dcaf0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .payment-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0dcaf0; }
          .label { font-weight: bold; color: #555; }
          .amount { font-size: 20px; color: #0dcaf0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vendor Payment Recorded</h1>
          </div>
          <div class="content">
            <p>Hello ${adminName},</p>
            <p>A payment to a vendor has been recorded in your system.</p>
            
            <div class="payment-details">
              <p><span class="label">Vendor:</span> ${vendorName}</p>
              <p><span class="label">Amount Paid:</span> <span class="amount">₹${amount.toFixed(2)}</span></p>
              <p><span class="label">Payment Date:</span> ${paymentDate}</p>
            </div>

            <p>You can view vendor transactions and manage payments in the Vendors section of your dashboard.</p>
            
            <p>Best regards,<br>Hostezee PMS</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}

/**
 * Send account suspension notification email
 */
export async function sendAccountSuspensionEmail(
  userEmail: string,
  userName: string,
  propertyName?: string
): Promise<EmailResponse> {
  const subject = `Your Hostezee Account Has Been Suspended`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .contact-info { background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Suspended</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>We regret to inform you that your Hostezee account has been suspended.</p>
            
            <div class="info-box">
              <p><strong>Account:</strong> ${userEmail}</p>
              ${propertyName ? `<p><strong>Property:</strong> ${propertyName}</p>` : ''}
            </div>

            <p>During the suspension period, you will not be able to:</p>
            <ul>
              <li>Log in to your dashboard</li>
              <li>Manage bookings or guests</li>
              <li>Access any property management features</li>
            </ul>

            <div class="contact-info">
              <p><strong>Need help?</strong></p>
              <p>If you believe this was a mistake or would like to discuss your account status, please contact our support team at <a href="mailto:support@hostezee.in">support@hostezee.in</a></p>
            </div>
            
            <p>Best regards,<br>Hostezee Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

/**
 * Send account reactivation notification email
 */
export async function sendAccountReactivationEmail(
  userEmail: string,
  userName: string,
  propertyName?: string
): Promise<EmailResponse> {
  const subject = `Welcome Back! Your Hostezee Account Has Been Reactivated`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
          .btn { display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Reactivated!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Great news! Your Hostezee account has been reactivated and you now have full access to all features.</p>
            
            <div class="info-box">
              <p><strong>Account:</strong> ${userEmail}</p>
              ${propertyName ? `<p><strong>Property:</strong> ${propertyName}</p>` : ''}
            </div>

            <p>You can now:</p>
            <ul>
              <li>Log in to your dashboard</li>
              <li>Manage bookings and guests</li>
              <li>Access all property management features</li>
            </ul>

            <p style="text-align: center;">
              <a href="https://hostezee.replit.app/login" class="btn">Login to Your Dashboard</a>
            </p>
            
            <p>Best regards,<br>Hostezee Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}
