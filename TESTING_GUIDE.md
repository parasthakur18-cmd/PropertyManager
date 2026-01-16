# Hostezee Multi-Tenant Authentication - Testing Guide

## Quick Start

The app is running on `http://localhost:5000`

---

## TEST 1: Registration (Email/Password)

### Steps:
1. Go to `/signup` or `/register`
2. Enter:
   - **Email**: `testuser@example.com`
   - **Password**: `TestPass123!`
   - **Phone**: `9876543210` (10 digits for Indian format)
   - **Business Name**: `My Hotel`
3. Click **"Create Account"**

### Expected Results:
- ✅ User created with `verificationStatus: 'pending'`
- ✅ Redirects to pending verification page
- ✅ Shows message: "Your account is pending approval"
- ✅ WhatsApp notification sent to the phone number

---

## TEST 2: Login with Pending User (Should FAIL)

### Steps:
1. Go to `/login`
2. Click **"Login with Email"**
3. Enter:
   - **Email**: `testuser@example.com`
   - **Password**: `TestPass123!`
4. Click **"Login"**

### Expected Results:
- ❌ Login fails with 403 status
- ✅ Shows: "Account Pending Approval"
- ✅ Message: "Your account is awaiting Super Admin approval. You'll receive a WhatsApp notification once approved."
- ✅ User is NOT logged in

---

## TEST 3: Super Admin Approval

### Steps:
1. Go to `/super-admin` (requires Super Admin login)
2. Click **"Pending Users"** tab
3. Find the pending user `testuser@example.com`
4. Click **"Approve"** button
5. Enter property details:
   - **Property Name**: `My Hotel`
   - **Location**: `Delhi`
   - **Property Type**: `Hotel`
6. Click **"Approve User"**

### Expected Results:
- ✅ User status changes to `verified`
- ✅ User assigned as `admin` role
- ✅ New property created and assigned
- ✅ WhatsApp notification sent: "Congratulations! Your Hostezee account has been approved. Property: My Hotel. Login at https://hostezee.in"
- ✅ User can now login

---

## TEST 4: Email/Password Login (After Approval)

### Steps:
1. Go to `/login`
2. Click **"Login with Email"**
3. Enter approved credentials:
   - **Email**: `testuser@example.com`
   - **Password**: `TestPass123!`
4. Click **"Login"**

### Expected Results:
- ✅ Login successful (200 status)
- ✅ Redirected to dashboard
- ✅ User authenticated

---

## TEST 5: Mobile OTP Login

### Steps:
1. Go to `/login`
2. Click **"Mobile OTP"** tab
3. Enter phone: `9876543210`
4. Click **"Send OTP"**

### Expected Results:
- ✅ Message: "OTP sent to your WhatsApp"
- ✅ In **development mode**: OTP displayed below (e.g., "OTP for testing: 123456")
- ✅ In **production**: OTP sent via WhatsApp (Authkey.io)
- ✅ 60-second rate limit enforced (try sending again immediately)

### Continue OTP Login:
5. Enter the OTP code
6. Click **"Verify OTP"**

### Expected Results:
- ✅ OTP verified
- ✅ If user pending: Shows "Account Pending Approval"
- ✅ If user approved: Logs in and redirects to dashboard

---

## TEST 6: Google OAuth Login

### Steps:
1. Go to `/login`
2. Click **"Continue with Google"** button
3. Select a Google account or create a test account

### Expected Results:
- ✅ Redirected to Google login
- ✅ After approval, new user created with `pending` status
- ✅ Shows pending approval page
- ✅ Super Admin can approve this user in the Pending Users tab

---

## TEST 7: Super Admin Rejection

### Steps:
1. Create another test user (see TEST 1)
2. Go to `/super-admin` → **"Pending Users"** tab
3. Find the pending user
4. Click **"Reject"** button
5. Enter reason: `Business details incomplete`
6. Click **"Reject User"**

### Expected Results:
- ✅ User status changes to `rejected`
- ✅ WhatsApp notification sent: "Your Hostezee account application was not approved. Reason: Business details incomplete. Contact support for assistance."
- ✅ User cannot login

---

## TEST 8: Tenant Isolation (Multi-Property Access)

### Prerequisites:
- Create 2 users: `user1@test.com` and `user2@test.com`
- Approve them with different properties

### Steps:
1. Login as User 1
2. Check properties/rooms visible - should only see their property
3. Logout
4. Login as User 2
5. Try to access User 1's rooms via URL: `/rooms?propertyId=[user1_property_id]`

### Expected Results:
- ✅ User 1 can only see their property
- ✅ User 2 can only see their property
- ✅ User 2 accessing User 1's property returns 403 error
- ✅ Data is completely isolated

---

## TEST 9: Rate Limiting (OTP)

### Steps:
1. Go to `/login` → **"Mobile OTP"**
2. Enter phone: `9111111111`
3. Click **"Send OTP"** ← First request
4. Immediately click **"Send OTP"** again

### Expected Results:
- ✅ First request: Success
- ✅ Second request (within 60 seconds): Error message "Please wait 60 seconds before requesting another OTP"

---

## TEST 10: OTP Expiry

### Steps:
1. Request OTP for mobile login (see TEST 5)
2. Copy the OTP
3. Wait 5 minutes and 1 second
4. Try to verify the OTP

### Expected Results:
- ❌ OTP verification fails
- ✅ Error message: "OTP has expired. Please request a new one."

---

## Debugging Tips

### Check Browser Console:
- Open DevTools (F12)
- Look for API responses and errors
- Check network tab for `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/email-login`

### Check Server Logs:
- Look for messages like:
  - `[OTP] Sent OTP 123456 to 9876543210 for login`
  - `[SUPER-ADMIN] Approved user email with admin role`
  - `[Tenant Access] User blocked from property 5`

### Test Account Template:
```
Email: test+[date]@hostezee.com
Password: TestPassword123!
Phone: 98[random 8 digits]
Business: Test Business [date]
```

---

## What to Verify

- [ ] Registration works with validation
- [ ] Pending users blocked from login
- [ ] Super Admin can approve/reject users
- [ ] Email/Password login works after approval
- [ ] Mobile OTP login works
- [ ] Google OAuth login works
- [ ] WhatsApp notifications sent (check phone)
- [ ] Rate limiting on OTP
- [ ] OTP expiry after 5 minutes
- [ ] Tenant isolation working (different users see different data)
- [ ] 403 errors for unauthorized access

---

## Production Checklist

Before going live, ensure:
- [ ] AUTHKEY_API_KEY environment variable is set
- [ ] Authkey.io account configured with templates
- [ ] Database backups working
- [ ] Email notifications working for admins
- [ ] Rate limiting functioning correctly
- [ ] SSL/HTTPS enabled
- [ ] Session timeout configured
- [ ] Error logging enabled
