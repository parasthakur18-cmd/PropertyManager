# HOSTEZEE - Multi-Tenant Architecture & Authentication Implementation Plan

## Document Version: 1.0
## Created: December 5, 2025
## Status: APPROVED FOR IMPLEMENTATION

---

# EXECUTIVE SUMMARY

This document outlines the complete implementation plan for:
1. **Multi-Tenant Architecture** - Complete data isolation between property owners
2. **Enhanced Authentication** - Multiple login methods for users
3. **Super Admin Enhancements** - User approval workflow and management
4. **Security Enforcement** - International-standard access control

---

# PART 1: AUTHENTICATION SYSTEM

## 1.1 SUPPORTED LOGIN METHODS

| Method | User Type | Status |
|--------|-----------|--------|
| Google OAuth (Replit Auth) | All users | ✅ Existing |
| Email + Password | All users | ✅ Existing (needs enhancement) |
| Super Admin Login | Super Admin only | ✅ Existing |
| Mobile + WhatsApp OTP | All users | 🆕 NEW |

## 1.2 AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOGIN PAGE OPTIONS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  📧 Google      │  │  👤 Email       │  │  📱 Mobile + OTP            │  │
│  │  (Replit Auth)  │  │  + Password     │  │  (WhatsApp via Authkey)     │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
│           ▼                    ▼                         ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    USER VERIFICATION CHECK                              │ │
│  │  Is user verified? (verification_status = 'verified')                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│           │                    │                         │                   │
│     ┌─────┴─────┐        ┌─────┴─────┐            ┌─────┴─────┐             │
│     │ VERIFIED  │        │ PENDING   │            │ REJECTED  │             │
│     └─────┬─────┘        └─────┬─────┘            └─────┬─────┘             │
│           │                    │                         │                   │
│           ▼                    ▼                         ▼                   │
│   [Access Dashboard]   [Show Pending Screen]    [Show Rejected Screen]      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 SIGNUP FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SIGNUP PAGE OPTIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │  📧 Google      │  │  👤 Email + Password    │  │  📱 Mobile + OTP    │  │
│  │  (One-Click)    │  │  + Business Name        │  │  + Business Name    │  │
│  └────────┬────────┘  └───────────┬─────────────┘  └──────────┬──────────┘  │
│           │                       │                           │              │
│           ▼                       ▼                           ▼              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      CREATE USER WITH:                                  │ │
│  │  • verification_status = 'pending'                                      │ │
│  │  • tenant_type = 'property_owner' (default for new signups)             │ │
│  │  • primary_property_id = NULL (will be set by Super Admin)              │ │
│  │  • role = 'pending' (not 'admin' until approved)                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  NOTIFICATIONS SENT:                                                    │ │
│  │  • WhatsApp to Super Admin: "New signup: John Doe - john@example.com"   │ │
│  │  • WhatsApp to User: "Your account is pending approval"                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  USER SEES: "Account Created - Pending Verification" Screen             │ │
│  │  • Cannot access dashboard                                              │ │
│  │  • Shown message: "Your account is under review. You'll be notified."   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 MOBILE + OTP LOGIN FLOW (Via Authkey.io WhatsApp)

```
STEP 1: User enters mobile number
        └→ Frontend: POST /api/auth/send-otp
        └→ Body: { phone: "+919876543210" }

STEP 2: Backend generates 6-digit OTP
        └→ Store in database: otp_tokens table
        └→ { phone, otp, expiresAt: now + 5 minutes }

STEP 3: Send OTP via Authkey.io WhatsApp
        └→ Template: "Your Hostezee login OTP is: {{OTP}}. Valid for 5 minutes."
        └→ API: POST to Authkey WhatsApp endpoint

STEP 4: User enters OTP on frontend
        └→ Frontend: POST /api/auth/verify-otp
        └→ Body: { phone: "+919876543210", otp: "123456" }

STEP 5: Backend verifies OTP
        └→ Check otp_tokens table
        └→ If valid: Create session, delete OTP
        └→ If invalid: Return error

STEP 6: Check verification_status
        └→ If 'verified': Redirect to dashboard
        └→ If 'pending': Show pending screen
        └→ If 'rejected': Show rejected screen
```

---

# PART 2: DATABASE SCHEMA UPDATES

## 2.1 USERS TABLE MODIFICATIONS

### Current Schema:
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  assignedPropertyIds: varchar("assigned_property_ids", { length: 255 }).array().default([]),
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 20 }),
  businessName: varchar("business_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### NEW Fields to Add:
```typescript
// ADD THESE NEW FIELDS:
verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
  // Values: 'pending', 'verified', 'rejected'

tenantType: varchar("tenant_type", { length: 30 }).notNull().default("property_owner"),
  // Values: 'super_admin', 'property_owner', 'staff'

primaryPropertyId: integer("primary_property_id").references(() => properties.id),
  // Main property this user belongs to (for tenant isolation)

rejectionReason: text("rejection_reason"),
  // If rejected, why?

approvedBy: varchar("approved_by").references(() => users.id),
  // Which super admin approved this user?

approvedAt: timestamp("approved_at"),
  // When was user approved?
```

## 2.2 NEW TABLE: OTP_TOKENS (For Mobile Login)

```typescript
export const otpTokens = pgTable("otp_tokens", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull().default("login"),
    // Values: 'login', 'signup', 'reset_password'
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## 2.3 PROPERTIES TABLE (Already Has owner_user_id)

```typescript
// EXISTING - No changes needed
ownerUserId: varchar("owner_user_id").references(() => users.id),
```

---

# PART 3: SUPER ADMIN PORTAL ENHANCEMENTS

## 3.1 CURRENT TABS

| Tab | Function | Status |
|-----|----------|--------|
| Users | View/manage all users | ✅ Existing |
| Properties | View all properties | ✅ Existing |
| Reports | Issue reports | ✅ Existing |
| Enquiries | Contact submissions | ✅ Existing |
| Errors | System errors | ✅ Existing |

## 3.2 NEW TABS TO ADD

| Tab | Function | Priority |
|-----|----------|----------|
| **Pending Users** | Approve/reject new signups | 🔴 HIGH |
| **Analytics** | System-wide metrics | 🟡 MEDIUM |

## 3.3 PENDING USERS TAB WORKFLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PENDING USERS TAB                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  FILTERS: [All] [Today] [This Week] [Search by name/email/phone]        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  📋 PENDING USER CARD                                                   │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐  │ │
│  │  │  👤 John Doe                                          📅 2 hrs ago │  │ │
│  │  │  📧 john@example.com                                               │  │ │
│  │  │  📱 +91 98765 43210                                                │  │ │
│  │  │  🏢 Business: "Mountain View Resort"                               │  │ │
│  │  │  🔑 Signup Method: Google                                          │  │ │
│  │  │                                                                    │  │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │ │
│  │  │  │ ✅ APPROVE   │  │ ❌ REJECT    │  │ 📞 CONTACT USER          │  │  │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │ │
│  │  └───────────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

APPROVE DIALOG:
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPROVE USER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: John Doe (john@example.com)                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  SELECT PROPERTY:                                                       │ │
│  │  ○ Create New Property                                                  │ │
│  │  ○ Assign to Existing Property                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  IF "Create New Property":                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Property Name: [Mountain View Resort____________]                      │ │
│  │  Location:      [Shimla, Himachal Pradesh________]                      │ │
│  │  Contact Phone: [+91 98765 43210_________________]                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  IF "Assign to Existing":                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Select Property: [▼ Beach Resort (ID: 10)_______]                      │ │
│  │                   [  Mountain Lodge (ID: 11)     ]                      │ │
│  │                   [  City Hotel (ID: 12)         ]                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  User Role: ○ Property Admin (Full Access)                                   │
│             ○ Manager (Limited Access)                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Send WhatsApp Notification: ☑ Yes                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐                                     │
│  │    CANCEL      │  │    APPROVE     │                                     │
│  └────────────────┘  └────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

REJECT DIALOG:
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REJECT USER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: John Doe (john@example.com)                                           │
│                                                                              │
│  Rejection Reason:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  [Please provide a reason for rejection...]                             │ │
│  │  [                                                                     ]│ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ☑ Send WhatsApp notification to user                                       │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐                                     │
│  │    CANCEL      │  │    REJECT      │                                     │
│  └────────────────┘  └────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 4: MULTI-TENANT DATA ISOLATION

## 4.1 ISOLATION RULES

| User Type | Can Access | Cannot Access |
|-----------|------------|---------------|
| Super Admin | ALL properties, ALL data | Nothing restricted |
| Property Owner | OWN property only | Other properties |
| Manager | Assigned property only | Other properties |
| Staff | Assigned property only | Other properties, admin features |
| Kitchen | Assigned property orders only | Bookings, billing |

## 4.2 BACKEND FILTERING (Every Query)

```typescript
// BEFORE (Current - DANGEROUS):
async getAllBookings() {
  return db.select().from(bookings); // Returns ALL bookings!
}

// AFTER (Safe - Tenant Filtered):
async getAllBookings(propertyIds: number[]) {
  return db.select().from(bookings)
    .where(inArray(bookings.propertyId, propertyIds)); // Only user's properties
}
```

## 4.3 API ROUTES TO UPDATE

| Endpoint | Current | After |
|----------|---------|-------|
| GET /api/bookings | All bookings | Filter by user's properties |
| GET /api/bills | All bills | Filter by user's properties |
| GET /api/orders | All orders | Filter by user's properties |
| GET /api/rooms | All rooms | Filter by user's properties |
| GET /api/guests | All guests | Filter by user's properties |
| GET /api/staff | All staff | Filter by user's properties |
| GET /api/menu | All menu items | Filter by user's properties |
| GET /api/analytics | All data | Filter by user's properties |

---

# PART 5: NEW API ENDPOINTS

## 5.1 AUTHENTICATION ENDPOINTS

```
POST /api/auth/send-otp
  Body: { phone: "+919876543210", purpose: "login" }
  Response: { success: true, message: "OTP sent via WhatsApp" }

POST /api/auth/verify-otp
  Body: { phone: "+919876543210", otp: "123456" }
  Response: { success: true, user: {...}, token: "..." }

POST /api/auth/register
  Body: { 
    email: "john@example.com",
    password: "SecurePass123!",
    phone: "+919876543210",
    firstName: "John",
    lastName: "Doe",
    businessName: "Mountain Resort"
  }
  Response: { success: true, message: "Account created. Pending approval." }

POST /api/auth/login
  Body: { email: "john@example.com", password: "SecurePass123!" }
  Response: { success: true, user: {...} } OR { error: "Account pending approval" }
```

## 5.2 SUPER ADMIN ENDPOINTS

```
GET /api/super-admin/pending-users
  Response: [{ id, email, phone, businessName, createdAt, signupMethod }]

POST /api/super-admin/approve-user/:userId
  Body: { 
    propertyId: 10,           // Existing property OR
    createProperty: {         // Create new property
      name: "Mountain Resort",
      location: "Shimla"
    },
    role: "admin",
    sendNotification: true
  }
  Response: { success: true, user: {...}, property: {...} }

POST /api/super-admin/reject-user/:userId
  Body: { reason: "Invalid business details", sendNotification: true }
  Response: { success: true }
```

---

# PART 6: WHATSAPP TEMPLATES (Authkey.io)

## 6.1 REQUIRED TEMPLATES

| Template Name | Purpose | Message |
|---------------|---------|---------|
| `hostezee_otp` | Login OTP | "Your Hostezee login OTP is {{1}}. Valid for 5 minutes. Do not share." |
| `hostezee_signup_pending` | New signup confirmation | "Welcome to Hostezee! Your account is pending approval. We'll notify you once verified." |
| `hostezee_account_approved` | Account approved | "Great news! Your Hostezee account is approved. You can now access {{1}}. Login at hostezee.in" |
| `hostezee_account_rejected` | Account rejected | "Your Hostezee account request was not approved. Reason: {{1}}. Contact support for help." |
| `hostezee_new_signup_admin` | Alert to Super Admin | "New signup: {{1}} ({{2}}) - Business: {{3}}. Login to approve at hostezee.in/super-admin" |

---

# PART 7: IMPLEMENTATION PHASES

## PHASE 1: DATABASE & SCHEMA ✅ COMPLETED
- [x] Add new fields to users table (verification_status, tenant_type, primary_property_id)
- [x] Create otp_tokens table with expiry and used tracking
- [x] Update types and schemas with Zod validation
- [x] Run safe migration with db:push

## PHASE 2: BACKEND AUTH ✅ COMPLETED
- [x] Create OTP send/verify endpoints (/api/auth/send-otp, /api/auth/verify-otp)
- [x] Update register endpoint for pending status
- [x] Update email-login to check verification_status
- [x] Add Super Admin approval/rejection endpoints

## PHASE 3: SUPER ADMIN PORTAL ✅ COMPLETED
- [x] Add Pending Users tab to super-admin.tsx
- [x] Create approval dialog with property creation/assignment
- [x] Create rejection dialog with reason field
- [x] Add WhatsApp notifications via Authkey.io

## PHASE 4: FRONTEND AUTH ✅ COMPLETED
- [x] Update login page with 3 options (Google, Email/Password, Mobile OTP)
- [x] Create OTP input component using shadcn InputOTP
- [x] Create pending verification screen
- [x] Create rejected screen with contact support message

## PHASE 5: TENANT ISOLATION ✅ COMPLETED
- [x] Create tenantIsolation.ts utility with TenantContext
- [x] Update properties route with filterPropertiesByAccess
- [x] Update rooms route with filterByPropertyAccess
- [x] Update bookings routes with tenant filtering
- [x] Super Admin has unlimited access (hasUnlimitedAccess: true)

## PHASE 6: TESTING 🔄 IN PROGRESS
- [ ] Test all login methods
- [ ] Test approval workflow
- [ ] Test data isolation
- [ ] Security audit

---

# PART 8: SECURITY CHECKLIST

## 8.1 AUTHENTICATION SECURITY
- [ ] Password hashing with bcrypt (10+ rounds)
- [ ] OTP expires after 5 minutes
- [ ] OTP can only be used once
- [ ] Rate limiting on OTP requests (max 3 per 10 minutes)
- [ ] Session timeout after 24 hours
- [ ] Secure HTTP-only cookies

## 8.2 AUTHORIZATION SECURITY
- [ ] Every API route checks authentication
- [ ] Every API route checks property access
- [ ] Super Admin routes have double verification
- [ ] Frontend never trusted for access control

## 8.3 DATA SECURITY
- [ ] No sensitive data in URLs
- [ ] No passwords in logs
- [ ] All queries filtered by tenant
- [ ] Audit log for sensitive operations

---

# APPROVAL

This plan has been reviewed and is ready for implementation.

Proceed with Phase 1: Database & Schema Updates.
