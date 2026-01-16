# Hostezee Super Admin - Testing Guide

## 🎯 Quick Start

### Access Super Admin Dashboard
1. Open your app: `http://localhost:5000`
2. Navigate to: `/super-admin`
3. You should see the **Super Admin Dashboard** with tabs for:
   - Users Management
   - Properties Overview
   - System Reports
   - Settings

---

## 📋 Test Cases

### Test 1: View All Users
**Purpose:** Verify Super Admin can see all system users

**Steps:**
1. Go to `/super-admin`
2. Click on **"Users Management"** tab
3. You should see a table with:
   - User ID
   - Email
   - Role (admin, super-admin, manager, staff, kitchen)
   - Status (active/suspended)
   - Property Assignments
   - Actions (Edit, Suspend/Activate, Login As)

**Expected Result:**
- List of all users displays ✅
- Each user row shows complete information ✅
- Action buttons are available for each user ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/users \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected response: JSON array of all users

---

### Test 2: View All Properties
**Purpose:** Verify Super Admin can see all properties in the system

**Steps:**
1. Go to `/super-admin`
2. Click on **"Properties Overview"** tab
3. You should see a table/cards with:
   - Property Name
   - Location
   - Owner User ID
   - Status
   - Total Rooms
   - Occupancy Stats

**Expected Result:**
- All properties display ✅
- Property details are accurate ✅
- Occupancy information shows correctly ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/properties \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected response: JSON array of all properties

---

### Test 3: Suspend a User
**Purpose:** Verify Super Admin can suspend/deactivate users

**Steps:**
1. Go to Super Admin → Users Management
2. Find a user in the table
3. Click the **"Suspend"** button (or "Activate" if already suspended)
4. Confirm the action in the dialog

**Expected Result:**
- User status changes to "suspended" ✅
- User cannot login anymore ✅
- Toast notification shows success ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/status \
  -H "Content-Type: application/json" \
  -d '{"userId": 2, "status": "suspended"}'
```
Expected response: `{"success": true}`

---

### Test 4: Activate a User
**Purpose:** Verify Super Admin can activate suspended users

**Steps:**
1. Go to Super Admin → Users Management
2. Find a suspended user
3. Click the **"Activate"** button
4. Confirm the action

**Expected Result:**
- User status changes to "active" ✅
- User can login again ✅
- Toast notification shows success ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/status \
  -H "Content-Type: application/json" \
  -d '{"userId": 2, "status": "active"}'
```

---

### Test 5: Login As User
**Purpose:** Verify Super Admin can impersonate other users

**Steps:**
1. Go to Super Admin → Users Management
2. Find any user
3. Click the **"Login As User"** button next to their name
4. You should be logged in as that user

**Expected Result:**
- You're now logged in as the selected user ✅
- Sidebar shows the user's assigned properties ✅
- All data is filtered to that user's properties ✅
- You can perform operations as that user ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/login-as/2 \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected response: User is logged in with session set

---

### Test 6: View System Reports
**Purpose:** Verify Super Admin can see comprehensive system reports

**Steps:**
1. Go to Super Admin → System Reports tab
2. You should see:
   - Total Users Count
   - Total Properties Count
   - Total Bookings Count
   - Total Revenue
   - Booking Status Distribution
   - User Role Distribution

**Expected Result:**
- All metrics display correctly ✅
- Numbers match database ✅
- Charts/visualizations render properly ✅

**API Test (Manual):**
```bash
curl -X POST http://localhost:5000/api/super-admin/reports \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected response: JSON with system statistics

---

### Test 7: Forgot Password Flow
**Purpose:** Verify password recovery system works

**Steps:**
1. Go to login page
2. Click "Forgot Password?"
3. Enter email address
4. System sends OTP (check console/logs)
5. Enter OTP code
6. Enter new password
7. Click "Reset Password"

**Expected Result:**
- OTP is sent ✅
- OTP verification works ✅
- Password is reset successfully ✅
- Can login with new password ✅

**API Test (Manual):**
```bash
# Step 1: Request OTP
curl -X POST http://localhost:5000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Step 2: Verify OTP
curl -X POST http://localhost:5000/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'

# Step 3: Reset Password
curl -X POST http://localhost:5000/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456", "newPassword": "newpass123"}'
```

---

### Test 8: Verify Audit Logging
**Purpose:** Verify all Super Admin actions are logged

**Steps:**
1. Go to Super Admin
2. Perform any action (suspend user, view reports, etc.)
3. Check database audit_logs table
4. Verify the action is recorded with:
   - User ID
   - Action type
   - Timestamp
   - Details

**Expected Result:**
- All actions are logged ✅
- Audit trail is complete ✅
- No unauthorized actions show up ✅

---

## 🧪 Comprehensive System Test

### Complete Workflow Test
```
1. Start app
2. Login as admin user
3. Go to /super-admin
4. View all users
5. View all properties
6. View system reports
7. Suspend a staff user
8. Login as a different user (using "Login As")
9. Verify you see only that user's properties
10. Logout
11. Verify suspended user cannot login
12. Activate the suspended user
13. Verify user can now login again
```

---

## ✅ Success Criteria

All tests pass when:
- ✅ All 8 endpoints respond with correct data
- ✅ All UI buttons work and trigger correct actions
- ✅ Status changes (suspend/activate) work correctly
- ✅ Login-as functionality switches user context properly
- ✅ Reports show accurate system statistics
- ✅ Password recovery flow completes successfully
- ✅ Audit logs record all actions
- ✅ No errors in browser console or server logs

---

## 🔧 Troubleshooting

### If endpoints return "Unauthorized"
- Make sure you're logged in first
- Check that you have admin/super-admin role

### If Super Admin page doesn't load
- Check browser console for errors (F12)
- Verify route is `/super-admin` exactly
- Restart the application

### If buttons don't work
- Check server logs for errors
- Verify database connection is active
- Check that data is loaded (not in loading state)

### If Login-As doesn't work
- Verify user ID is correct
- Check that user exists in database
- Look for errors in browser console

---

## 📊 Expected Test Results

When all tests pass:
```
Test Results Summary:
✅ Test 1: View All Users          - PASS
✅ Test 2: View All Properties     - PASS
✅ Test 3: Suspend User            - PASS
✅ Test 4: Activate User           - PASS
✅ Test 5: Login As User           - PASS
✅ Test 6: View System Reports     - PASS
✅ Test 7: Forgot Password Flow    - PASS
✅ Test 8: Audit Logging           - PASS

Overall Status: ✅ SUPER ADMIN FULLY FUNCTIONAL
```

---

## 🚀 Next Steps After Testing

Once all tests pass:
1. Super Admin is **production-ready** ✅
2. All 8 endpoints are working ✅
3. All UI features are functional ✅
4. Audit logging is active ✅

You can now deploy to production!
