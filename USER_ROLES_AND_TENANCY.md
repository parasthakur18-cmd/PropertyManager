# User Roles & Multi-Tenant Architecture

## CURRENT PROBLEM
- New users signing up via Google automatically appear in your admin panel
- No data isolation between property owners
- All admins can potentially see each other's properties
- No clear tenant separation

---

## SOLUTION: Role-Based Access Control + Multi-Tenancy

### 1. ROLE HIERARCHY

```
┌─ SUPER ADMIN (You - System Owner) ─────────────────────┐
│ • System-wide access to ALL properties                  │
│ • Can create new property owners                        │
│ • Can see billing, reports for all properties           │
│ • View audit logs across system                         │
│ • Manage feature flags                                  │
│ • NO DIRECT BOOKING/OPERATIONAL WORK                    │
│                                                         │
│  └─ PROPERTY ADMIN (New Owner - One Per Property)      │
│     • Full control of their OWN property only           │
│     • Can create staff, managers for their property     │
│     • View only their bookings, bills, guests           │
│     • Cannot see other properties                       │
│                                                         │
│     ├─ MANAGER (Property Staff)                        │
│     │  • Booking management for assigned property      │
│     │  • Staff supervision                             │
│     │  • Reports for their property                     │
│     │  • Cannot modify property settings                │
│     │  • Cannot create other admins                     │
│     │                                                   │
│     ├─ STAFF (Property Staff)                          │
│     │  • Limited operational tasks                      │
│     │  • Room cleaning, guest check-in                  │
│     │  • Cannot access financial data                   │
│     │  • Cannot modify bookings                         │
│     │                                                   │
│     └─ KITCHEN (Restaurant Staff)                      │
│        • Order management only                          │
│        • Cannot access bookings or financial data       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. DATA ISOLATION RULES

### Property Admin (New Owner) - STRICT ISOLATION:
```javascript
// Property Admin can ONLY see:
- Their own property ID in assignedPropertyIds
- Bookings where propertyId = their property
- Bills for bookings in their property
- Guests associated with their property
- Orders for their property only
- Staff assigned to their property
- Staff salaries for their property

// Property Admin CANNOT access:
- Other property admins' data
- Other property bookings
- Financial reports from other properties
- Staff data from other properties
```

### Super Admin - FULL ACCESS:
```javascript
// Super Admin can:
- See all properties, all bookings, all data
- Access admin panel for all properties
- View financial reports across system
- See all users and their assignments
- Modify property owner access
```

---

## 3. NEW USER FLOW

### Scenario: New Property Owner Registers

#### Step 1: Initial Login (Google)
```
User clicks "Sign Up with Google"
→ User created in database with:
  - id: UUID from Google
  - email: from Google
  - firstName, lastName: from Google
  - role: "pending_property_owner" (NEW STATUS)
  - assignedPropertyIds: [] (empty)
  - status: "pending_verification"
```

#### Step 2: Verification Required
```
User sees screen:
"Welcome! Your account is pending verification.
A super admin will review and assign you a property."

Button disabled - Cannot access system until verified
```

#### Step 3: Super Admin Approves (in Super Admin Portal)
```
Super Admin sees:
- [List of Pending Users]
- Name: John Doe
- Email: john@property.com
- Requested on: [Date]

Action:
1. Create or select Property: "Mountain View Resort"
2. Assign user as: "property_admin"
3. Click [Approve & Assign]

User gets WhatsApp: "Your access has been approved!"
```

#### Step 4: User Can Now Access
```
User logs in:
- Sees only "Mountain View Resort"
- Cannot see other properties
- Cannot view other admins' data
- Full control of their property only
```

---

## 4. DATABASE SCHEMA CHANGES

### Add to `users` table:

```sql
ALTER TABLE users ADD COLUMN primary_property_id INTEGER REFERENCES properties(id);
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending';
-- pending, verified, rejected, active
```

### Add to `properties` table:

```sql
ALTER TABLE properties ADD COLUMN owner_user_id VARCHAR(255) REFERENCES users(id);
-- This links property to its primary owner
```

---

## 5. ACCESS CONTROL LOGIC

### Backend Middleware - Data Filtering:

```typescript
// For every query, apply tenant filter based on user role:

if (user.role === "super_admin") {
  // Return ALL data
  const data = await db.query(...);
} else if (user.role === "property_admin") {
  // Filter by assignedPropertyIds only
  const data = await db.query(...)
    .where(propertyId in user.assignedPropertyIds);
} else if (user.role === "manager") {
  // Filter by primary_property_id
  const data = await db.query(...)
    .where(propertyId === user.primary_property_id);
} else if (user.role === "staff") {
  // Limited to their assigned tasks for their property
  const data = await db.query(...)
    .where(propertyId === user.primary_property_id);
}
```

### Example: GET /api/bookings

```typescript
// OLD (BROKEN):
const bookings = await db.select().from(bookings);

// NEW (SECURE):
const user = getCurrentUser(req);
let query = db.select().from(bookings);

if (!user.is_super_admin) {
  // Non-super-admin can only see bookings for their properties
  query = query.where(
    inArray(booking.propertyId, user.assignedPropertyIds)
  );
}

const bookings = await query;
```

---

## 6. COMPLETE USER FLOW (For New Property Owner)

```
NEW PROPERTY OWNER JOURNEY:
═════════════════════════════════════════════════════════

1. SIGNUP
   ┌─ Google Login ─────────────────────┐
   │ Sign in with Google                 │
   │ [Google OAuth]                      │
   └─ ✓ Account Created ─────────────────┘
   
   Backend:
   - Create user record
   - role: "pending_property_owner"
   - status: "pending_verification"
   - Send email to Super Admin

2. PENDING STATE
   ┌─ Your Account ─────────────────────┐
   │ ⏳ Pending Verification             │
   │                                     │
   │ Your account is awaiting approval   │
   │ by a system administrator.          │
   │                                     │
   │ You'll receive a notification once  │
   │ your account is verified.           │
   │                                     │
   │ [Dashboard Disabled]                │
   └─────────────────────────────────────┘

3. SUPER ADMIN APPROVES
   ┌─ Super Admin Portal ───────────────┐
   │ Pending Users                       │
   │ ───────────────────────────────────│
   │ Name: John Doe                      │
   │ Email: john@property.com            │
   │ Date: Dec 2, 2025                   │
   │                                     │
   │ Action:                             │
   │ Property: [Mountain View Resort ▼] │
   │ Role: [Property Admin ▼]            │
   │                                     │
   │ [Reject] [Approve & Assign]         │
   └─────────────────────────────────────┘
   
   Backend:
   - Update user.role: "property_admin"
   - Set user.assignedPropertyIds: [10]
   - Set user.status: "verified"
   - Create audit log
   - Send WhatsApp notification

4. PROPERTY OWNER LOGS IN
   ┌─ Dashboard ────────────────────────┐
   │ Welcome, John!                      │
   │                                     │
   │ Mountain View Resort                │
   │ • 24 Rooms                          │
   │ • 8 Active Bookings                 │
   │ • ₹15000 Today's Revenue            │
   │                                     │
   │ [Can ONLY see Mountain View Resort] │
   │ [Cannot see other properties]       │
   └─────────────────────────────────────┘
   
   Frontend Filter:
   - Only shows properties in user.assignedPropertyIds
   - If user tries to access other property: Error 403

5. PROPERTY OWNER CREATES STAFF
   ┌─ Users → Invite Staff ─────────────┐
   │ Invite new staff member             │
   │                                     │
   │ Email: staff@property.com           │
   │ Role: [Manager ▼]                   │
   │                                     │
   │ [Invite]                            │
   └─────────────────────────────────────┘
   
   Backend:
   - Create user with role: "manager"
   - Set primary_property_id: 10 (LOCKED)
   - Send invite email/WhatsApp
   - Manager can ONLY access property ID 10
```

---

## 7. ACCESS CONTROL TABLE

| Action | Super Admin | Property Admin | Manager | Staff | Kitchen |
|---|---|---|---|---|---|
| View Own Property | ✅ All | ✅ Their Property | ✅ Their Property | ✅ Their Property | ✅ Their Property |
| View Other Properties | ✅ All | ❌ | ❌ | ❌ | ❌ |
| Create Property | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Bookings | ✅ All | ✅ Their Property | ✅ Their Property | ✅ Limited | ❌ |
| View Bills/Finance | ✅ All | ✅ Their Property | ✅ Their Property | ❌ | ❌ |
| View Reports | ✅ All | ✅ Their Property | ✅ Their Property | ❌ | ❌ |
| Modify Property Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 8. SCHEMA DEFINITION

### User Roles (Valid Values):
```
"super_admin" - System owner (you)
"property_admin" - Property owner
"manager" - Property manager/supervisor
"staff" - General staff
"kitchen" - Kitchen/restaurant staff
"pending_property_owner" - New user awaiting approval
```

### User Status (Verification):
```
"pending_verification" - New user, not approved yet
"verified" - Approved by super admin, active
"active" - Can login and access
"inactive" - Disabled but not deleted
"rejected" - Rejected during verification
```

---

## 9. IMPLEMENTATION CHECKLIST

Frontend:
- [ ] Update login page to show "Pending Verification" for new users
- [ ] Add Super Admin Portal → "Pending Users" section
- [ ] Update property selector dropdown - only show assigned properties
- [ ] Add 403 error handling for unauthorized property access
- [ ] Update user invitation flow - set primary_property_id

Backend:
- [ ] Add primary_property_id to users table
- [ ] Add is_super_admin flag
- [ ] Add verification_status field
- [ ] Add owner_user_id to properties table
- [ ] Add tenant filtering middleware to ALL queries
- [ ] Create approval endpoint: POST `/api/super-admin/verify-user`
- [ ] Create rejection endpoint: POST `/api/super-admin/reject-user`
- [ ] Update user creation to set pending status
- [ ] Update all GET endpoints with property filtering

Endpoints Needed:
- [ ] POST `/api/super-admin/verify-user/:userId` - Approve user
- [ ] POST `/api/super-admin/reject-user/:userId` - Reject user
- [ ] GET `/api/super-admin/pending-users` - List pending users
- [ ] PATCH `/api/users/:id/assign-property` - Assign property to user

Database:
- [ ] Run migrations for new columns
- [ ] Update existing admin users: set is_super_admin = true for you
- [ ] Backfill primary_property_id for existing managers

---

## 10. SECURITY NOTES

⚠️ **CRITICAL CHECKS:**

1. **Every query must filter by property:**
   ```typescript
   // BAD - Anyone can see all data
   const bills = await db.select().from(bills);
   
   // GOOD - Only their property's bills
   const bills = await db.select().from(bills)
     .where(inArray(propertyId, user.assignedPropertyIds));
   ```

2. **Frontend cannot be trusted:**
   - Always check user permissions on backend
   - Frontend filtering is for UX only
   - Backend must enforce access control

3. **Test Access Control:**
   - Try accessing property ID 999 as different user
   - Should get 403 Forbidden
   - Try accessing endpoint directly with wrong property
   - Should fail silently

---

## 11. EXAMPLE: Property Admin Cannot Cross-Access

```
Property Admin for "Mountain View Resort" (ID: 10)
tries to access booking for "Sunset Hotel" (ID: 11):

Request: GET /api/bookings/50
(Booking 50 belongs to property 11)

Backend Check:
- User role: "property_admin"
- User assignedPropertyIds: [10]
- Booking propertyId: 11
- 11 NOT IN [10] → ACCESS DENIED
- Response: 403 Forbidden

Frontend: User sees nothing, cannot discover other properties
```

---

**This ensures complete data isolation and prevents cross-property access.**

**Ready to implement this architecture?** 
1️⃣ Approve the design?
2️⃣ Any changes needed?
3️⃣ Start implementation?
