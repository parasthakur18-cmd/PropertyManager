# Authkey.io Integration Setup Guide

This guide will help you set up authkey.io for SMS and WhatsApp messaging in Hostezee.

## Why authkey.io?

Authkey.io is an excellent choice for the Indian market, offering:

- **Competitive Pricing**: ₹0.35 per WhatsApp conversation, ₹0.90 per marketing template
- **Free Credits**: ₹2,500 free credits for startups (~10,000 OTP/transactional messages)
- **No Setup Fees**: Zero setup costs and no monthly charges
- **Multi-Channel**: WhatsApp + SMS with automatic fallback
- **DLT Compliance**: Assistance with India's DLT compliance requirements
- **Developer-Friendly**: REST APIs with Node.js SDK support

## Getting Started

### 1. Sign Up for authkey.io

1. Visit [https://authkey.io](https://authkey.io)
2. Sign up for a free account
3. Apply for the Startup Plan to get ₹2,500 free credits
4. Complete your profile and verify your business

### 2. Get Your API Credentials

Once your account is set up:

1. Go to your authkey.io dashboard
2. Navigate to **API Settings**
3. Copy your **API Key**
4. Note your **WhatsApp Business Number** (after WhatsApp setup)

### 3. Configure WhatsApp Business API (Optional but Recommended)

To use WhatsApp messaging:

1. In authkey.io dashboard, go to **WhatsApp Business API**
2. Follow the verification process (authkey.io team will help)
3. Get Meta (Facebook) approval for your WhatsApp Business account
4. Create message templates in the authkey.io dashboard
5. Wait for template approval (usually 24-48 hours)

### 4. Set Up DLT for SMS (Required for India)

For SMS messaging in India:

1. Register on DLT portal (Airtel, Jio, or Vodafone)
2. Get your **Sender ID** approved (e.g., "HOSTEZ")
3. Register your SMS templates
4. authkey.io team can assist with DLT registration

### 5. Add Credentials to Hostezee

In your Replit project:

1. Go to **Secrets** (🔒 icon in the left sidebar)
2. Add the following environment variables:

```
AUTHKEY_API_KEY=your_api_key_here
AUTHKEY_WHATSAPP_NUMBER=your_whatsapp_business_number
```

**Example:**
```
AUTHKEY_API_KEY=abc123def456ghi789
AUTHKEY_WHATSAPP_NUMBER=+919876543210
```

### 6. Set Up Delivery Status Webhook (Optional)

To track message delivery status:

1. In authkey.io dashboard, go to **Webhook Settings**
2. Add your webhook URL:
   ```
   https://your-replit-app.replit.dev/api/webhooks/authkey/delivery-status
   ```
3. Enable delivery status updates

## Message Templates

Hostezee comes with pre-configured message templates:

1. **Payment Reminder** - Reminds guests about pending advance payments
2. **Booking Confirmation** - Confirms booking after payment received
3. **Check-in Details** - Sends check-in information and property details
4. **Payment Confirmation** - Confirms payment receipt
5. **Check-out Reminder** - Reminds guests about checkout time
6. **Welcome Message** - Welcome message after check-in

### Creating WhatsApp Templates in authkey.io

For each template above, create a corresponding template in authkey.io dashboard:

1. Go to **WhatsApp Templates**
2. Click **Create New Template**
3. Use the following format:

**Example: Booking Confirmation Template**
```
Name: booking_confirmation
Category: Transactional
Language: English

Body:
Hello {{1}}, your booking at {{2}} is confirmed! Check-in: {{3}}. We look forward to welcoming you. - Hostezee Team
```

**Template Variables:**
- {{1}} = Guest Name
- {{2}} = Property Name  
- {{3}} = Check-in Date

4. Submit for approval
5. Once approved, the template will be available for use

## Testing the Integration

### Test SMS Sending

1. Log in to Hostezee
2. Go to **Enquiries**
3. Click on any enquiry
4. Click **Send Message**
5. Select "SMS" as channel
6. Choose a template or write custom message
7. Click **Send**
8. Check the communications log to verify delivery

### Test WhatsApp Sending

1. Follow the same steps as SMS
2. Select "WhatsApp" as channel
3. Choose a pre-approved template
4. Click **Send**
5. Recipient will receive WhatsApp message

## Troubleshooting

### Messages Not Sending

**Check:**
1. API key is correctly set in Secrets
2. Phone numbers include country code (e.g., +91 for India)
3. WhatsApp templates are approved in authkey.io dashboard
4. SMS sender ID is DLT approved
5. Check server logs for error messages

### WhatsApp Templates Not Working

**Solutions:**
1. Verify template is approved in authkey.io dashboard
2. Ensure template name matches exactly (case-sensitive)
3. Check that all template variables are provided
4. Wait 24-48 hours for new template approval

### SMS Not Delivering in India

**Solutions:**
1. Ensure DLT registration is complete
2. Verify sender ID is approved
3. Check SMS template is registered on DLT
4. Use transactional route (not promotional) for OTP/alerts

## Pricing Guide

### WhatsApp Costs
- User-initiated conversations: ₹0.35 per conversation (24-hour window)
- Business-initiated templates: ₹0.90 per template
- Free: Customer replies within 24-hour window

### SMS Costs
- Transactional SMS: ~₹0.34 per SMS (₹3,400 for 10,000 messages)
- Promotional SMS: Lower rates available
- Volume discounts available

### Cost Optimization Tips
1. **Use WhatsApp for confirmations** - More engaging and cheaper for replies
2. **Use SMS for OTPs** - Faster delivery, better for time-sensitive messages
3. **Batch messages** - Send multiple messages at optimal times
4. **Template reuse** - Create reusable templates to save approval time

## Support

### authkey.io Support
- Email: support@authkey.io
- Dashboard: Live chat available
- Documentation: https://authkey.io/docs

### Hostezee Support
- Check server logs for integration errors
- Review communication history in the app
- Verify environment variables are set correctly

## Next Steps

Once authkey.io is set up:

1. ✅ Test SMS sending to your phone
2. ✅ Test WhatsApp messaging (if configured)
3. ✅ Train staff on using the messaging features
4. ✅ Monitor delivery status in Communications tab
5. ✅ Track messaging costs in authkey.io dashboard

Your guests will now receive automated booking confirmations, payment reminders, and check-in details via SMS and WhatsApp!
