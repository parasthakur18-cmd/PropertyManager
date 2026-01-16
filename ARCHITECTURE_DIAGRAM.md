# Hostezee PMS - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Dashboard      │  │   Bookings       │  │    Guests        │         │
│  │  - KPI Stats     │  │  - Active Book   │  │  - Guest List    │         │
│  │  - Quick Actions │  │  - Calendar View │  │  - ID Proofs     │         │
│  │  - Charts        │  │  - Analytics     │  │  - Profiles      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Rooms          │  │  Restaurant      │  │    Finance       │         │
│  │  - Room List     │  │  - Kitchen Ops   │  │  - Billing       │         │
│  │  - QR Codes      │  │  - Quick Orders  │  │  - Expenses      │         │
│  │  - Add-ons       │  │  - Menu Mgmt     │  │  - Salaries      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Admin          │  │    Settings      │  │  Notifications   │         │
│  │  - Users         │  │  - Profile       │  │  - Bell Sounds   │         │
│  │  - Enquiries     │  │  - Audit Logs    │  │  - Volume        │         │
│  │  - Travel Agents │  │  - Help          │  │  - Center        │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (TanStack Query)
                                  │
                    ┌─────────────▼──────────────┐
                    │   API Request Handler      │
                    │  (queryClient + axios)     │
                    └─────────────┬──────────────┘
                                  │
                                  │ (REST API Calls)
                                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js + Node.js)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────── API Routes ─────────────────────────┐         │
│  │                                                                │         │
│  │  /api/dashboard     →  Dashboard Stats & Analytics            │         │
│  │  /api/bookings      →  Create, Read, Update, Delete Bookings  │         │
│  │  /api/rooms         →  Room Management                         │         │
│  │  /api/guests        →  Guest Management & ID Proofs           │         │
│  │  /api/orders        →  Restaurant Orders                      │         │
│  │  /api/billing       →  Bill Generation & Management           │         │
│  │  /api/users         →  User Management                         │         │
│  │  /api/audit-logs    →  Activity Tracking                      │         │
│  │  /api/notifications →  Notification System                    │         │
│  │  /api/payments      →  Payment Processing (RazorPay)          │         │
│  │  /api/auth/*        →  Authentication & Sessions              │         │
│  │                                                                │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  ┌────────────────────────── Storage Layer ────────────────────┐           │
│  │                                                              │           │
│  │  ├─ Guests Storage                                          │           │
│  │  ├─ Bookings Storage                                        │           │
│  │  ├─ Rooms Storage                                           │           │
│  │  ├─ Orders Storage                                          │           │
│  │  ├─ Bills Storage                                           │           │
│  │  ├─ Users Storage                                           │           │
│  │  ├─ Notifications Storage                                   │           │
│  │  ├─ Audit Logs Storage                                      │           │
│  │  └─ Extra Services Storage                                  │           │
│  │                                                              │           │
│  └────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (SQL Queries)
                                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL / Neon)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  guests      │  │  bookings    │  │  rooms       │  │  properties  │  │
│  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │
│  │  - fullName  │  │  - roomId    │  │  - roomNum   │  │  - name      │  │
│  │  - email     │  │  - guestId   │  │  - roomType  │  │  - owner     │  │
│  │  - phone     │  │  - checkIn   │  │  - rate      │  │  - location  │  │
│  │  - idProof*  │  │  - checkOut  │  │  - status    │  │  - settings  │  │
│  │  - address   │  │  - totalAmt  │  │  - features  │  │  - config    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  orders      │  │  bills       │  │  users       │  │  audit_logs  │  │
│  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │
│  │  - roomId    │  │  - bookingId │  │  - email     │  │  - action    │  │
│  │  - bookingId │  │  - guestId   │  │  - role      │  │  - user      │  │
│  │  - items     │  │  - items     │  │  - password  │  │  - timestamp │  │
│  │  - status    │  │  - total     │  │  - properties│  │  - changes   │  │
│  │  - timestamp │  │  - status    │  │  - avatar    │  │  - status    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │notifications │  │  menu_items  │  │  enquiries   │  │  payments    │  │
│  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │  - id (PK)   │  │
│  │  - userId    │  │  - name      │  │  - guestName │  │  - bookingId │  │
│  │  - message   │  │  - price     │  │  - email     │  │  - amount    │  │
│  │  - type      │  │  - category  │  │  - message   │  │  - status    │  │
│  │  - read      │  │  - variants  │  │  - status    │  │  - method    │  │
│  │  - timestamp │  │  - addons    │  │  - date      │  │  - timestamp │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### 1. Guest Management Flow
```
User clicks "Add Guest" 
    ↓
Form Dialog Opens (useForm + Zod validation)
    ↓
User fills form + captures/uploads ID proof
    ↓
Submit Button → createMutation (apiRequest to POST /api/guests)
    ↓
Backend: validateRequest → storage.addGuest()
    ↓
Database: INSERT into guests table
    ↓
Response returned → TanStack Query invalidates cache
    ↓
Frontend re-fetches guests data → Guest appears in list
    ↓
Toast notification shows success
```

### 2. Booking Checkout Flow
```
Booking reaches checkout time (4 PM daily)
    ↓
Frontend: useEffect monitors time
    ↓
Auto-checkout trigger → POST /api/bookings/force-auto-checkout
    ↓
Backend: 
  - Gets all overdue bookings
  - Generates bills automatically
  - Updates booking status to CHECKED_OUT
  - Records audit log
    ↓
Database: UPDATE bookings, INSERT bills, INSERT audit_logs
    ↓
Response: sends checkout data
    ↓
Frontend: Shows notification + updates dashboard
```

### 3. Notification System Flow
```
Event occurs (payment, checkout, order, etc.)
    ↓
Backend creates notification → storage.addNotification()
    ↓
WebSocket/SSE broadcasts to connected clients
    ↓
Frontend: receives event
    ↓
Notification Center updates:
  - Badge count increments
  - Bell sound plays (volume controlled)
  - Toast appears
  - Notification added to center list
    ↓
User can:
  - Click to view details
  - Mark as read
  - Delete single / Clear All
```

### 4. Payment Integration Flow
```
User generates payment link (RazorPay)
    ↓
/api/payments → calls RazorPay API
    ↓
Payment link sent via WhatsApp (Authkey.io)
    ↓
Customer makes payment
    ↓
RazorPay Webhook → /api/webhooks/payment
    ↓
Backend:
  - Verifies webhook signature
  - Updates bill status to PAID
  - Records audit log
  - Creates notification
    ↓
Frontend polls for updates (5 sec intervals)
    ↓
Dashboard shows real-time payment notification
```

---

## Component Relationships

### Authentication Flow
```
Landing Page (login) 
    ↓
useAuth hook (Replit Auth OIDC)
    ↓
Backend: Passport.js + session-based auth
    ↓
Database: Store/retrieve user + roles
    ↓
App: Routes protected based on user role
    ↓
Sidebar: Menu items filtered by user role
```

### Role-Based Access
```
Admin → All features + Finance + User Management + Audit
Manager → Bookings + Rooms + Restaurant + Billing
Staff → Dashboard + Rooms + Active Bookings + Kitchen
Kitchen → Kitchen + Quick Orders only
Super-Admin → System-wide dashboard + settings
```

---

## Key Connections

| Frontend | Backend Route | Database | Function |
|----------|---------------|----------|----------|
| Dashboard | /api/dashboard/stats | bookings, rooms | Calculate KPIs, trending |
| Guests | /api/guests | guests table | CRUD operations + ID proofs |
| Bookings | /api/bookings | bookings table | Booking management |
| Bills | /api/bills | bills table | Bill generation & tracking |
| Payments | /api/payments, /webhooks | payments table | RazorPay integration |
| Notifications | /api/notifications | notifications table | Real-time updates |
| Audit Logs | /api/audit-logs | audit_logs table | Track all changes |
| Orders | /api/orders | orders table | Restaurant operations |
| Users | /api/users | users table | User management |

---

## External Services Integration

```
┌─────────────────────────────────────────────────────────┐
│             External Services Connections               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Replit Auth (OIDC)  ←→  User Login & Session Mgmt    │
│                                                         │
│  OpenAI (GPT-4o-mini) ←→  Chatbot Assistant           │
│                                                         │
│  RazorPay ←→  Payment Processing & Payment Links      │
│                  ├─ Create payment link                │
│                  ├─ Receive webhook confirmations      │
│                  └─ Update bill status                 │
│                                                         │
│  Authkey.io ←→  WhatsApp & SMS Notifications          │
│                  ├─ Payment links                      │
│                  ├─ Booking confirmations              │
│                  └─ OTP delivery                       │
│                                                         │
│  Replit Object Storage ←→  ID Proofs & Documents      │
│                  ├─ Store ID images                    │
│                  ├─ Retrieve for viewing               │
│                  └─ Download to admin device           │
│                                                         │
│  Neon PostgreSQL ←→  Primary Database                 │
│                  ├─ All data persistence               │
│                  └─ Transaction management             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## File Organization

```
client/src/
├── pages/
│   ├── dashboard.tsx          (Main stats dashboard)
│   ├── bookings.tsx           (Booking management)
│   ├── guests/
│   │   └── page.tsx           (Guest management + ID proofs)
│   ├── billing.tsx            (Bill generation)
│   ├── payments.tsx           (Payment processing)
│   ├── restaurant.tsx         (Order management)
│   ├── settings.tsx           (User settings + Audit Logs)
│   └── ... (other pages)
├── components/
│   ├── app-sidebar.tsx        (Navigation)
│   ├── notification-center.tsx (Notification UI)
│   ├── chatbot.tsx            (AI assistant)
│   └── ... (UI components)
└── lib/
    ├── queryClient.ts         (TanStack Query setup)
    ├── eventHandlers.ts       (WebSocket/SSE)
    └── ... (utilities)

server/
├── routes.ts                  (All API endpoints)
├── storage.ts                 (Database operations)
├── index.ts                   (Express setup)
└── vite.ts                    (Vite integration)

shared/
└── schema.ts                  (Drizzle ORM + Zod schemas)
```

---

## How to Use This Diagram

1. **Find a Feature**: Look at Frontend section to find the page you want
2. **Trace Data Flow**: Follow arrows to see what API route it calls
3. **Check Database**: See which table stores the data
4. **Understand Logic**: Read Data Flow Examples for step-by-step execution
5. **External Services**: Check integrations if feature uses 3rd party APIs

**Example**: Want to understand how guest ID proofs work?
- Find "Guests" page → Calls `/api/guests` → Data stored in `guests` table (idProofImage column) → Uses Replit Object Storage for image files
