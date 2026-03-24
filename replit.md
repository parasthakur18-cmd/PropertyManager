# Hostezee Property Management System (PMS)

## Overview

Hostezee is a full-stack, multi-tenant property management system for hotels, homestays, and resorts. It offers end-to-end management for bookings, guests, billing, expenses, staff/salary, tasks, restaurant/food ordering, and operational dashboards. The system supports multiple properties per owner, role-based access control, and integrations with payment gateways, messaging, channel managers, and object storage. It is designed to run on Replit or self-hosted environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a monorepo structure:
- `client/`: React 18 SPA (Vite, Tailwind CSS, shadcn/ui)
- `server/`: Express API server (Node.js 20+, TypeScript)
- `shared/`: Drizzle ORM schema definitions for type safety
- `migrations/`: Drizzle Kit migration output

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State/Data Fetching**: TanStack React Query
- **UI Components**: shadcn/ui (New York style) based on Radix UI with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit
- **Theming**: Custom ThemeProvider (light/dark mode)
- **File Uploads**: Uppy with S3 plugin
- **Real-time**: Server-Sent Events (SSE)

### Backend Architecture
- **Runtime**: Node.js 20+ with ESM, TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ via Drizzle ORM, with automatic driver selection for Neon or standard `pg`.
- **Sessions**: `express-session` with `connect-pg-simple`
- **Authentication**: Dual system supporting Replit OIDC or email/password with bcrypt, plus Google OAuth.
- **Multi-tenancy**: Tenant isolation via `assignedPropertyIds` and property access guards.
- **Event System**: In-process EventBus for domain events (e.g., audit logging, SSE broadcasts).
- **Audit Logging**: Automatic audit trail.
- **Schema Validation**: Startup validation and auto-creation of optional tables.

### Database Schema
The schema covers comprehensive PMS functionalities including `users`, `properties`, `rooms`, `bookings`, `guests`, `bookingGuests`, `bills`, `orders`, `expenses`, `wallets`, `staffMembers`, `salary`, `leases`, `vendors`, `attendanceRecords`, `messageTemplates`, `communications`, `enquiries`, `travelAgents`, `notifications`, `featureSettings`, `auditLogs`, and `otaIntegrations`.

The `bookingGuests` table stores multiple guest ID proofs per booking with front/back images. It has: `bookingId`, `guestName`, `phone`, `email`, `idProofType`, `idProofNumber`, `idProofFront`, `idProofBack`, `isPrimary`.

The `bookingRoomStays` table stores one record per room for multi-room OTA bookings (e.g. AioSell). Fields: `bookingId`, `roomId` (nullable — null means TBS/To Be Assigned), `aiosellRoomCode`, `roomType`, `mealPlan`, `status` (confirmed/tbs), `amount` (per-room), `adults`, `children`. Webhook creates ONE booking + N room_stays. Inventory sync counts TBS stays (roomId=null) to reduce availability without double-counting assigned rooms.

### Extra Services (Add-ons)
- **Table**: `extra_services` — `bookingId`, `serviceType`, `serviceName`, `amount`, `serviceDate`, `description`, `isPaid`, `paymentMethod`, `propertyId`
- **Collect Now**: When `isPaid=true` on creation, server auto-records `extra_service_payment` wallet transaction; `paymentMethod` maps to the correct wallet (cash/upi/bank)
- **Mark Paid**: `POST /api/extra-services/:id/mark-paid` marks a service paid and records wallet transaction immediately
- **Checkout**: `alreadyCollectedServices` (sum of `isPaid=true` extras) is subtracted from balance due to avoid double-charging
- **Active bookings card balance**: `balanceAmount = total - advance - alreadyCollectedServices` (shows correct net balance)
- **Bill preview**: Extra services show "✓ collected" label for already-paid ones
- **Add Service from Active Bookings**: Each booking card has "Add Service" button (indigo outline) opening a dialog with service type, name, amount, date, Collect Now toggle, and payment method selector
- **Exports from addons.tsx**: `SERVICE_TYPES`, `PAYMENT_METHODS`, `serviceTypeLabels` — used in active-bookings.tsx
- **Wallet display**: `extra_service_payment` source shows indigo badge in wallets.tsx
- **Service Types** (20 total): taxi, airport_pickup, airport_drop, bonfire, laundry, extra_bed, local_tour, guide, adventure, trekking, cycling, boating, camping, spa, yoga, photoshoot, room_decoration, cake, partner_commission, other
- **Services Revenue Report**: `/services-report` page — summary cards, monthly bar chart (collected vs pending), service type breakdown with progress bars, day-wise table; API: `GET /api/extra-services/revenue?propertyId&year&month`
- **Monthly Income Report**: `/monthly-report` page — unified view of rooms + food + services + expenses + net profit for any month; API: `GET /api/monthly-income?propertyId&month=YYYY-MM`

### Staff Disable / Exit Management
- **Schema**: `staffMembers` table has `isActive` (bool), `exitType` (varchar: "temporary"|"permanent"), `exitReason` (text)
- **Backend**: `POST /api/staff-members/:id/disable` (sets isActive=false, exitType, exitReason), `POST /api/staff-members/:id/enable` (re-enables, only if exitType="temporary")
- **Frontend**: Attendance page calendar — each active staff card has red "Disable" button; dialog asks for exit type + reason; Disabled Staff card at bottom shows inactive staff; "Re-enable" button for temporary only

### Property Disable / Closure Management
- **Schema**: `properties` table has `isActive` (bool, existing), `disableType` (varchar: "temporary"|"permanent"), `disableReason` (text), `closedAt` (timestamp)
- **Backend**: `POST /api/properties/:id/disable` (marks inactive, sets disableType/reason/closedAt — Super Admin only), `POST /api/properties/:id/enable` (re-enables if temporary — Super Admin only)
- **Frontend**: Properties page split into Active Properties + Disabled/Closed Properties sections; PowerOff button on each active card opens disable dialog with two-step choice (temporary/permanent → archive/delete); Disabled cards show Re-enable button for temporary only; permanently closed cards show historical data export only
- **Rules**: Temporary = under maintenance/construction, can re-enable; Permanent + archive = historical records kept; Permanent + delete = removes all data

### Vendor / Expense Design (Option A)
- **Expenses are the master** — every expense record goes to `property_expenses` table; wallet is debited immediately on creation
- **Vendors maintain their own payment records** — `vendors` + `vendorTransactions` track credit purchases and payments independently
- **Link**: `property_expenses.vendorId` (FK to `vendors.id`, nullable, ON DELETE SET NULL) — added via migration #18
- **Expense form**: has optional Vendor selector dropdown (fetches vendors for the selected property); when a vendor is chosen, `vendorId` + `vendorName` are both saved to the expense record
- **Expense list**: shows vendor name as a grey badge next to the category badge when linked
- **Vendor payments**: `paymentMethod` simplified to Cash / UPI only; payment transactions still debit the correct wallet
- **No double-counting**: vendor credit purchase does NOT create an expense record; the two systems are independent

### Key Design Patterns
- **Shared schema**: Single source of truth for DB schema.
- **Insert schemas**: Zod schemas for request validation.
- **Storage abstraction**: Data access layer over Drizzle.
- **Conditional drivers**: Automatic database driver selection.
- **Environment-based auth**: Dynamic authentication strategy.
- **Tenant Data Isolation**: Implemented `getAuthenticatedTenant` and property access checks across all endpoints to prevent cross-tenant data leakage.

### Branding & Logo
- **Logo file**: `attached_assets/hostezee_logo_transparent_1773119386285.png` — transparent PNG used everywhere via `@assets/` import
- **Brand Colors**: Primary Blue `#1E3A5F`, Teal `#2BB6A8`, Accent Yellow `#F2B705`
- **Tagline**: "Simplify Stays"
- **Logo placement**:
  - Website header: 32px mobile / 44px desktop (`h-8 md:h-[44px]`)
  - PMS sidebar: 36px (`h-9`)
  - Login page: Centered branding with large logo (80px/96px) + "Hostezee" + "Simplify Stays"
- **Favicon files**: `client/public/` — favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, apple-touch-icon.png (180x180), icon-512x512.png
- **Logo assets directory**: `client/public/assets/logo/` — hostezee-logo.png, hostezee-logo.svg, hostezee-icon.png, favicon.ico, icon-512x512.png
- **SEO**: Organization schema in `index.html` for Google brand recognition
- **PWA**: `client/public/site.webmanifest` with all icon sizes

### Performance Optimizations
- **Server-side caching**: In-memory caches with TTLs for frequently-read data:
  - `getAllBookings()`: 30s TTL, invalidated on create/update/delete/status-change
  - `getAllGuests()`: 60s TTL, invalidated on create/update/delete
  - `getAllBills()`: 45s TTL, invalidated on create/update
  - All direct `db.update/insert(bookings|guests)` calls in routes.ts also invalidate the respective caches.
- **Client-side caching**: TanStack Query staleTime set to 2-5 minutes for bookings/guests/rooms/orders; refetchInterval reduced to 5 min (from 30s) to prevent aggressive polling.
- **Route optimization**: `/api/bookings` tenant filtering uses `booking.propertyId` directly instead of fetching all rooms for O(N*M) lookup.
- **Image compression**: `compressImage()` in GuestIdUpload and guest-self-checkin reduces 5-8MB photos to 250-400KB before upload.
- **Response compression**: Express `compression` middleware enabled for gzip.

## External Dependencies

### Database
- **PostgreSQL 14+**
- **Neon Serverless** (`@neondatabase/serverless`)

### Payment Gateway
- **Razorpay**

### Messaging & Communications
- **Authkey.io** (WhatsApp Business API, SMS)
- **AgentMail** (Email service via Replit Connector)

### Channel Manager
- **Beds24**
- **AioSell** (for inventory, rates, restrictions, and webhook-based reservation sync)

### Object/File Storage
- **Replit Object Storage** (Google Cloud Storage-based)
- **MinIO** (S3-compatible self-hosted storage)

### Authentication Providers
- **Replit OIDC**
- **Google OAuth 2.0** (via `passport-google-oauth20`)
- **Local auth** (bcrypt)

### Frontend Libraries
- **Recharts**
- **QRCode**
- **date-fns**
- **Uppy**

### WhatsApp Template WIDs (Authkey.io)
All WIDs are set as env var fallbacks in `server/whatsapp.ts`. Add `AUTHKEY_WA_*` env vars to override.
- **Check-in** (WID 29292 all properties / 28769 Woodpecker Inn only) — `AUTHKEY_WA_CHECKIN_DETAILS` or isWoodpecker check
- **OTA Booking Alert to staff** (WID 28770) — `sendOtaBookingNotification`, routed via WhatsApp Alert Controls (resolveAlertRecipients)
- **Checkout** (WID 28968) — `AUTHKEY_WA_CHECKOUT_DETAILS`, controlled via WhatsApp Message Templates per property
- **Food order to guest** (WID 28983) — `AUTHKEY_WA_FOOD_ORDER_RECEIVED`
- **Booking confirmed** (WID 29294) — `AUTHKEY_WA_BOOKING_CONFIRMED`
- **Advance payment request** (WID 29410) — `AUTHKEY_WA_ADVANCE_PAYMENT`
- **Balance payment link** (WID 29412) — `AUTHKEY_WA_SPLIT_PAYMENT`
- **Food order staff alert** (WID 29652) — `AUTHKEY_WA_FOOD_ORDER_STAFF_ALERT`, routed via WhatsApp Alert Controls

**WhatsApp Alert Controls (staff alerts)**: Managed via `whatsapp_alert_configs` DB table. To add a new staff alert template, add it to `DEFAULT_WA_ALERT_CONFIGS` in `server/startup-migrations.ts` — it will auto-seed on next restart and appear in Feature Settings.

### Deployment
- **GitHub Actions**
- **esbuild**
- **Vite**