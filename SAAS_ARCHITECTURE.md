# Hostezee SaaS Architecture & Production Readiness Plan

## Executive Summary
This document outlines the transformation of Hostezee from a multi-property PMS to a production-ready **SaaS platform** for hospitality businesses worldwide. The architecture focuses on proper workflows, automatic data propagation, scalability, and professional feature completeness.

---

## Current System Audit

### ✅ Implemented Features (28 Pages)
1. **Dashboard** - Key metrics and overview
2. **Properties** - Multi-property management
3. **Rooms** - Room inventory with dormitory support
4. **Bookings** - Single + Group + Dormitory bookings
5. **Active Bookings** - Real-time monitoring
6. **Guests** - Guest profiles with ID proof
7. **Enquiries** - Lead management with conversion
8. **Room Calendar** - Availability visualization
9. **Restaurant/Kitchen** - Order management with notifications
10. **Menu Management** - Menu items per property
11. **Food Orders Report** - Analytics and export
12. **Billing & Invoices** - Bill generation and merging
13. **Leases** - Property lease tracking
14. **Expenses** - Expense management with auto-categorization
15. **Financials** - P&L reports per property
16. **Analytics** - Business insights
17. **Booking Analytics** - Source and revenue analysis
18. **User Management** - Role-based access control
19. **Settings** - User preferences
20. **QR Codes** - Contactless ordering
21. **Add-on Services** - Extra services management
22. **Quick Order Entry** - Streamlined ordering
23. **New Enquiry** - Detailed enquiry form
24. **New Enquiry Calendar** - Calendar-based enquiry creation

### ✅ Current Strengths
- **Role-Based Access Control**: Admin, Manager, Staff, Kitchen
- **Property-Scoped Data**: Managers see only their assigned property
- **Multi-Property Support**: Multiple properties per system
- **Financial Tracking**: P&L, expenses, leases
- **Restaurant Integration**: POS-like order management
- **WhatsApp/SMS**: Guest communication
- **ID Verification**: Secure guest check-ins
- **Group Bookings**: Multi-room coordination
- **Dormitory Support**: Bed-level booking
- **Café Bill Merging**: Walk-in to booking integration

---

## 🚨 Critical Gaps for SaaS Launch

### 1. **Data Propagation** (HIGHEST PRIORITY)
**Current Problem**: Manual `queryClient.invalidateQueries()` scattered across 28 pages
- ❌ Inconsistent updates across modules
- ❌ Stale data in analytics and reports
- ❌ No real-time synchronization
- ❌ Manual tracking of dependencies

**Required Solution**: Event-Driven Architecture

### 2. **Multi-Tenancy Architecture**
**Current State**: Property-level isolation for managers
**SaaS Requirement**: Organization-level isolation
- Each hotel business = 1 Organization (Tenant)
- Each organization can have multiple properties
- Complete data isolation between tenants
- Shared infrastructure with tenant-specific customization

### 3. **Onboarding & Subscription**
**Missing**:
- New tenant registration workflow
- Property setup wizard
- Sample data generation
- Subscription plans (Free, Standard, Premium)
- Payment integration (Stripe/Razorpay)
- Trial period management

### 4. **Scalability & Performance**
**Missing**:
- Database connection pooling
- Query optimization
- Caching layer (Redis)
- Rate limiting
- CDN for static assets
- Database indexes on foreign keys

### 5. **Security & Compliance**
**Missing**:
- Audit logs (who did what, when)
- Data encryption at rest
- GDPR compliance (data export, deletion)
- Two-factor authentication (2FA)
- Session management improvements
- API rate limiting
- CORS configuration for production

### 6. **Operational Excellence**
**Missing**:
- Health check endpoints
- Error tracking (Sentry integration)
- Performance monitoring (APM)
- Backup automation
- Disaster recovery plan
- Database migration strategy
- Feature flags system

### 7. **Progressive Web App (PWA)**
**Missing**:
- Service worker for offline access
- App manifest
- Install prompts
- Background sync
- Push notifications
- Offline-first strategy

### 8. **Advanced Features**
**Missing**:
- Email notifications (booking confirmations, reminders)
- Calendar sync (Google Calendar, Outlook)
- Channel manager integration (Booking.com, Airbnb)
- Dynamic pricing engine
- Housekeeping management
- Maintenance scheduling
- Staff shift management
- Inventory management
- Commission tracking
- Multi-currency support
- Tax calculation engine
- Custom reports builder
- Webhooks for integrations
- Public API with documentation

---

## 🎯 Event-Driven Data Propagation System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
│  (Booking, Payment, Cancellation, Order, Expense, etc.)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER (server/storage.ts)             │
│                                                                  │
│  1. Database Transaction ✓                                      │
│  2. Event Publisher → EventBus.publish(event)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EVENT BUS (server/eventBus.ts)                  │
│                                                                  │
│  • Centralized event dispatcher                                 │
│  • In-memory event queue                                        │
│  • Multiple subscribers per event type                          │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ▼                                ▼
┌────────────────────────┐       ┌──────────────────────────────┐
│  FRONTEND LISTENERS    │       │  BACKEND HANDLERS            │
│  (SSE Connection)      │       │  (Computed Data Updates)     │
├────────────────────────┤       ├──────────────────────────────┤
│ • Real-time UI updates │       │ • Analytics recalculation    │
│ • Cache invalidation   │       │ • P&L report refresh         │
│ • Toast notifications  │       │ • Revenue stats update       │
│ • Badge count updates  │       │ • Occupancy rate refresh     │
└────────────────────────┘       └──────────────────────────────┘
```

### Event Catalog

```typescript
// shared/events.ts

export const EventTypes = {
  // Bookings
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  
  // Payments
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Enquiries
  ENQUIRY_CREATED: 'enquiry.created',
  ENQUIRY_CONFIRMED: 'enquiry.confirmed',
  ENQUIRY_CANCELLED: 'enquiry.cancelled',
  
  // Orders
  ORDER_PLACED: 'order.placed',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Rooms
  ROOM_STATUS_CHANGED: 'room.status_changed',
  ROOM_BLOCKED: 'room.blocked',
  ROOM_UNBLOCKED: 'room.unblocked',
  
  // Financial
  EXPENSE_ADDED: 'expense.added',
  LEASE_PAYMENT_RECORDED: 'lease.payment_recorded',
  BILL_GENERATED: 'bill.generated',
  BILL_PAID: 'bill.paid',
  BILLS_MERGED: 'bills.merged',
  
  // Properties
  PROPERTY_CREATED: 'property.created',
  PROPERTY_UPDATED: 'property.updated',
  
  // Guests
  GUEST_CREATED: 'guest.created',
  GUEST_UPDATED: 'guest.updated',
} as const;

export interface DomainEvent {
  id: string;
  type: keyof typeof EventTypes;
  timestamp: string;
  userId: string;
  propertyId?: number;
  organizationId?: number;
  data: any;
  metadata?: Record<string, any>;
}
```

### Data Dependency Matrix

| **Trigger Event** | **Affected Modules** | **Actions Required** |
|-------------------|----------------------|----------------------|
| `BOOKING_CREATED` | • Bookings list<br>• Active bookings<br>• Room availability<br>• Analytics<br>• Dashboard stats<br>• Revenue reports | • Invalidate `/api/bookings`<br>• Invalidate `/api/bookings/active`<br>• Invalidate `/api/rooms`<br>• Recalculate analytics<br>• Update dashboard stats<br>• Refresh revenue |
| `PAYMENT_RECEIVED` | • Booking status<br>• Bills<br>• Financial reports<br>• P&L statements<br>• Analytics<br>• Dashboard | • Update booking payment status<br>• Invalidate `/api/bills`<br>• Recalculate P&L<br>• Update revenue stats<br>• Invalidate `/api/financials` |
| `BOOKING_CANCELLED` | • Bookings list<br>• Room availability<br>• Revenue stats<br>• Analytics<br>• Active bookings | • Free blocked rooms<br>• Update cancellation count<br>• Adjust revenue forecasts<br>• Remove from active bookings |
| `ORDER_PLACED` | • Guest bill<br>• Kitchen dashboard<br>• Revenue<br>• Restaurant analytics<br>• Active bookings | • Add to bill calculation<br>• Show in kitchen view<br>• Update F&B revenue<br>• Invalidate `/api/orders`<br>• Update order summary in active bookings |
| `ROOM_STATUS_CHANGED` | • Availability calendar<br>• Booking form<br>• Occupancy analytics<br>• Housekeeping board | • Update calendar display<br>• Refresh available rooms dropdown<br>• Recalculate occupancy rate |
| `EXPENSE_ADDED` | • Financial reports<br>• P&L statements<br>• Expense analytics<br>• Cash flow | • Add to expense category totals<br>• Recalculate P&L<br>• Update expense trends |
| `ENQUIRY_CONFIRMED` | • Enquiries list<br>• Bookings list<br>• Room availability | • Remove from enquiries (or mark converted)<br>• Add to bookings<br>• Block selected rooms |
| `BILL_PAID` | • Billing dashboard<br>• Revenue reports<br>• Analytics<br>• Booking status | • Mark bill as paid<br>• Update revenue<br>• Update booking payment status |
| `BILLS_MERGED` | • Billing dashboard<br>• Active bookings<br>• Guest checkout | • Consolidate bill view<br>• Update total amount<br>• Refresh checkout dialog |

---

## 🏗️ Multi-Tenancy Architecture

### Organization Hierarchy

```
Organization (Tenant)
  ├── Subscription Plan (Free/Standard/Premium)
  ├── Custom Branding (Logo, Colors)
  ├── Settings (Currency, Timezone, Tax Rates)
  └── Properties (Multiple)
        ├── Rooms
        ├── Bookings
        ├── Guests
        ├── Orders
        ├── Menu Items
        ├── Staff Assignments
        └── Financial Data
```

### Database Schema Changes Required

```typescript
// Add to shared/schema.ts

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  
  // Subscription
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull().default("free"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).notNull().default("active"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  
  // Branding
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }),
  
  // Settings
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
  dateFormat: varchar("date_format", { length: 20 }).notNull().default("DD/MM/YYYY"),
  
  // Contact
  ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add organizationId to all existing tables
export const properties = pgTable("properties", {
  // ... existing fields
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const users = pgTable("users", {
  // ... existing fields  
  organizationId: integer("organization_id").references(() => organizations.id),
});
```

---

## 📋 Professional Workflows

### 1. New Tenant Onboarding

```
Step 1: Registration
  → Collect: Business name, Owner email, Phone
  → Create: Organization record
  → Auto-login: Create first admin user

Step 2: Property Setup
  → Guided form: Property details, Location, Contact
  → Create: First property record
  
Step 3: Room Configuration
  → Add rooms: Bulk upload CSV or manual entry
  → Set: Pricing, Room types, Amenities
  
Step 4: Team Invitation
  → Invite: Staff members via email
  → Assign: Roles and property access
  
Step 5: Integration Setup
  → Connect: WhatsApp, SMS provider
  → Configure: Payment gateway
  
Step 6: Sample Data (Optional)
  → Generate: Test bookings, guests, orders
  → Tutorial: Quick tour of features
  
Step 7: Go Live
  → Checklist: Complete all setup steps
  → Activate: Subscription plan
```

### 2. Booking Lifecycle Workflow

```
ENQUIRY STAGE
  └→ Create Enquiry (New Enquiry page)
      ├→ Select Property + Rooms + Dates
      ├→ Add Guest Info (Name, Phone, Email)
      ├→ Quote Price + Meal Plan
      ├→ Send WhatsApp/SMS Message
      └→ EVENT: ENQUIRY_CREATED
          └→ Updates: Enquiries list, Analytics

CONFIRMATION STAGE
  └→ Confirm Enquiry (Enquiries page)
      ├→ Convert to Booking
      ├→ Optional: Collect Advance Payment
      ├→ Block Rooms for Dates
      ├→ Create Guest Record
      ├→ Send Confirmation Message
      └→ EVENT: ENQUIRY_CONFIRMED + BOOKING_CREATED
          └→ Updates: 
              - Enquiries (remove/mark converted)
              - Bookings (add new)
              - Rooms (block availability)
              - Dashboard (update stats)
              - Analytics (new booking count)

CHECK-IN STAGE
  └→ Guest Arrives (Bookings or Active Bookings page)
      ├→ Verify Guest Identity
      ├→ Upload ID Proof (if not done)
      ├→ Collect Remaining Payment
      ├→ Assign Room Keys
      ├→ Update Status: "checked-in"
      └→ EVENT: BOOKING_CHECKED_IN + PAYMENT_RECEIVED (if any)
          └→ Updates:
              - Active Bookings (add to list)
              - Bookings (status change)
              - Rooms (mark occupied)
              - Dashboard (active count++)
              - Bills (create initial bill)

IN-HOUSE STAGE
  └→ Guest Services (Active Bookings, Restaurant pages)
      ├→ Food Orders (Room Service/Café)
      │   ├→ Kitchen receives order
      │   ├→ Status: Pending → Preparing → Ready → Delivered
      │   └→ EVENT: ORDER_PLACED + ORDER_UPDATED
      │       └→ Updates:
      │           - Kitchen Dashboard
      │           - Guest Bill (auto-add items)
      │           - Revenue stats
      │           - Active Bookings (order summary)
      │
      ├→ Add-on Services (Taxi, Guide, etc.)
      │   └→ EVENT: SERVICE_ADDED
      │       └→ Updates: Guest Bill
      │
      └→ Additional Payments
          └→ EVENT: PAYMENT_RECEIVED
              └→ Updates: Booking, Bills, Revenue

CHECK-OUT STAGE
  └→ Guest Departs (Active Bookings page)
      ├→ Generate Final Bill
      │   ├→ Include: Room charges, Food orders, Services, Taxes
      │   ├→ Subtract: Advance payments
      │   └→ Calculate: Balance due
      │
      ├→ Merge Café Bills (if walk-in orders exist)
      │   ├→ Search by Guest Name/Phone
      │   └→ Add to final bill
      │
      ├→ Collect Payment
      │   └→ EVENT: PAYMENT_RECEIVED + BILL_PAID
      │
      ├→ Update Status: "completed"
      │   └→ EVENT: BOOKING_CHECKED_OUT
      │
      └→ Updates:
          - Active Bookings (remove)
          - Bookings (status completed)
          - Rooms (mark available/cleaning)
          - Bills (mark paid)
          - Revenue (finalize)
          - Analytics (occupancy, revenue trends)
          - Financial Reports (P&L update)

POST-CHECKOUT
  └→ Housekeeping
      ├→ Room Status: "cleaning"
      ├→ EVENT: ROOM_STATUS_CHANGED
      └→ After cleaning: "available"
          └→ EVENT: ROOM_STATUS_CHANGED
              └→ Updates: Room Calendar, Availability
```

### 3. Financial Workflow

```
REVENUE TRACKING
  └→ Auto-calculated from:
      ├→ Room Revenue (Bookings)
      ├→ F&B Revenue (Orders)
      ├→ Services Revenue (Add-ons)
      └→ EVENT: PAYMENT_RECEIVED (for any)
          └→ Updates: Revenue reports, Analytics, P&L

EXPENSE TRACKING
  └→ Add Expense (Expenses page)
      ├→ Manual Entry
      │   ├→ Amount, Category, Date, Description
      │   └→ EVENT: EXPENSE_ADDED
      │
      └→ Bank Import (CSV)
          ├→ Auto-categorize using keywords
          ├→ Bulk create expenses
          └→ EVENT: EXPENSE_ADDED (per item)
          
      └→ Updates:
          - Expenses list
          - Category totals
          - P&L report
          - Financial analytics

LEASE MANAGEMENT
  └→ Property Lease Agreement
      ├→ Total Amount, Payment Schedule
      ├→ Record Payments
      │   └→ EVENT: LEASE_PAYMENT_RECORDED
      └→ Updates:
          - Lease dashboard
          - Expenses (if lease is expense)
          - P&L report

P&L GENERATION
  └→ Auto-calculated when:
      ├→ Filter: Property + Date Range
      ├→ Income: Room + F&B + Services
      ├→ Expenses: By category
      ├→ Net Profit/Loss: Income - Expenses
      └→ Listens to:
          - PAYMENT_RECEIVED
          - EXPENSE_ADDED
          - LEASE_PAYMENT_RECORDED
          - BOOKING_CANCELLED (refunds)
```

---

## 🎨 User Workflows by Role

### Admin User

```
Dashboard → Overview of all properties
  ↓
Manage Properties
  ├→ Add/Edit/Delete properties
  └→ View property performance
  
Manage Users
  ├→ Invite staff
  ├→ Assign roles & property access
  └→ Deactivate users
  
View Financial Reports
  ├→ P&L per property
  ├→ Revenue trends
  └→ Expense breakdown
  
System Settings
  ├→ Organization branding
  ├→ Subscription management
  └→ Integration setup
```

### Manager User (Property-Scoped)

```
Dashboard → Stats for assigned property ONLY
  ↓
Manage Bookings
  ├→ View enquiries
  ├→ Confirm bookings
  ├→ Check-ins/Check-outs
  └→ Cancel bookings
  
Manage Rooms
  ├→ Update room status
  ├→ Block/unblock rooms
  └→ Set pricing
  
View Analytics
  ├→ Occupancy rate
  ├→ Revenue stats
  └→ Booking sources
  
Financial Management
  ├→ View P&L for their property
  ├→ Add expenses
  └→ Track lease payments
```

### Staff User

```
Reception Operations
  ├→ Create bookings
  ├→ Check-ins (with ID proof upload)
  ├→ Check-outs (bill generation)
  └→ Guest management
  
Restaurant Operations
  ├→ Take orders (room service + café)
  ├→ View order history
  └→ Merge café bills to bookings
  
View-Only Access
  └→ Cannot manage properties, users, or financial settings
```

### Kitchen User (Property-Scoped)

```
Kitchen Dashboard → Orders for assigned property ONLY
  ↓
Order Management
  ├→ View pending orders
  ├→ Update status (Preparing → Ready → Delivered)
  ├→ Edit order items (if mistakes)
  └→ Real-time notifications for new orders
  
Menu Management
  ├→ Update item availability
  └→ Set preparation times
  
Restricted Access
  └→ Cannot access bookings, financial data, or other modules
```

---

## 🚀 Implementation Roadmap

### Phase 1: Event-Driven Data Propagation (Week 1-2)
**Priority: CRITICAL**

**Files to Create/Modify:**
1. `shared/events.ts` - Event type definitions
2. `server/eventBus.ts` - Event bus implementation
3. `server/storage.ts` - Add event publishing to all mutations
4. `server/routes.ts` - Add SSE endpoint `/api/events/stream`
5. `client/src/contexts/EventBusProvider.tsx` - Frontend event listener
6. `client/src/lib/cacheEvents.ts` - Map events to cache invalidations

**Deliverables:**
- [x] Centralized event system
- [x] Real-time UI updates via SSE
- [x] Automatic cache invalidation
- [x] Zero manual `invalidateQueries` calls in page components
- [x] Backend listeners for computed data (analytics, P&L)

### Phase 2: Multi-Tenancy (Week 3-4)
**Priority: HIGH**

**Files to Create/Modify:**
1. `shared/schema.ts` - Add `organizations` table
2. `server/migrations/` - Database migration scripts
3. `server/middleware/tenancy.ts` - Tenant isolation middleware
4. `server/routes.ts` - Add organization context to all routes
5. `client/src/pages/onboarding.tsx` - New tenant signup flow

**Deliverables:**
- [x] Organization-level data isolation
- [x] Subscription plan tracking
- [x] Custom branding per tenant
- [x] Multi-currency support

### Phase 3: Onboarding & Subscription (Week 5-6)
**Priority: HIGH**

**Files to Create/Modify:**
1. `client/src/pages/signup.tsx` - Registration form
2. `client/src/pages/property-setup.tsx` - Property wizard
3. `client/src/pages/subscription.tsx` - Plan selection
4. `server/routes.ts` - Subscription endpoints
5. Integration with Stripe/Razorpay

**Deliverables:**
- [x] Self-service registration
- [x] Guided property setup
- [x] Payment integration
- [x] Trial period management

### Phase 4: PWA & Mobile Optimization (Week 7-8)
**Priority: MEDIUM**

**Files to Create/Modify:**
1. `public/manifest.json` - App manifest
2. `public/sw.js` - Service worker
3. `client/index.html` - PWA meta tags
4. `client/src/hooks/useInstallPrompt.ts` - Install prompt logic

**Deliverables:**
- [x] Offline access
- [x] Install to home screen
- [x] Background sync
- [x] Push notifications

### Phase 5: Advanced Features (Week 9-12)
**Priority: MEDIUM**

**Features:**
- [x] Email notifications
- [x] Audit logging
- [x] Data export/import
- [x] Webhooks
- [x] Public API
- [x] Advanced analytics
- [x] Custom reports

### Phase 6: Production Hardening (Week 13-14)
**Priority: HIGH**

**Tasks:**
- [x] Error tracking (Sentry)
- [x] Performance monitoring
- [x] Database optimization (indexes, pooling)
- [x] Security audit
- [x] Load testing
- [x] Backup automation
- [x] CDN setup

---

## 📊 Success Metrics

### Technical Metrics
- **Data Consistency**: 100% automatic propagation (zero stale data)
- **Real-time Updates**: < 500ms latency for UI updates
- **API Response Time**: < 200ms for p95
- **Uptime**: 99.9% SLA
- **Error Rate**: < 0.1%

### Business Metrics
- **Tenant Onboarding**: < 10 minutes to go live
- **User Activation**: 80% complete setup wizard
- **Subscription Conversion**: 30% trial → paid
- **Monthly Churn**: < 5%
- **NPS Score**: > 40

---

## 🎯 Next Steps

**Immediate Actions:**
1. ✅ Review and approve this architecture document
2. 🚧 Implement Event-Driven Data Propagation (Phase 1)
3. 🔜 Add Multi-Tenancy (Phase 2)
4. 🔜 Build Onboarding Flow (Phase 3)

**Questions for Stakeholder:**
1. Preferred subscription pricing model? (Monthly/Annual, INR pricing tiers)
2. Payment gateway preference? (Stripe, Razorpay, both?)
3. Target launch date for public beta?
4. Any specific channel manager integrations needed? (Booking.com, Airbnb, etc.)

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2025  
**Status**: Ready for Implementation
