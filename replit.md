# Hostezee Property Management System (PMS)

## Overview

Hostezee is a full-stack, multi-tenant property management system designed for hotels, homestays, and resorts. It provides end-to-end management of bookings, guests, billing, expenses, staff/salary, tasks, restaurant/food ordering, and operational dashboards — all from a single platform. The system supports multiple properties per owner, role-based access control, and integrations with payment gateways, WhatsApp messaging, channel managers, and object storage.

The application is built as a monorepo with a React frontend and Express backend served from a single Node.js process. PostgreSQL is the database, accessed via Drizzle ORM. The system is designed to run on Replit (with OIDC auth) or on a VPS/local environment (with email/password auth).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

- **`client/`** — React 18 SPA (Vite as bundler, Tailwind CSS for styling, shadcn/ui component library based on Radix UI primitives)
- **`server/`** — Express API server that also serves the built frontend in production
- **`shared/`** — Drizzle ORM schema definitions (`schema.ts`) shared between server and client for type safety
- **`migrations/`** — Drizzle Kit migration output directory
- **`scripts/`** — Database backup/restore utilities and deployment helpers
- **`attached_assets/`** — Feature requirement documents and reference materials

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management with optimistic updates
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives with Tailwind CSS
- **Forms**: React Hook Form with Zod validation (via `@hookform/resolvers`)
- **Charts**: Recharts for analytics/dashboards
- **Drag & Drop**: dnd-kit for sortable interfaces
- **Theming**: Custom ThemeProvider supporting light/dark mode with CSS variables
- **File Uploads**: Uppy with AWS S3 plugin (supports Replit Object Storage, MinIO, or GCS)
- **Real-time**: Server-Sent Events (SSE) via custom event stream for live updates
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture

- **Runtime**: Node.js 20+ with ESM modules, TypeScript via tsx (dev) and esbuild (production build)
- **Framework**: Express.js with JSON body parsing
- **Database**: PostgreSQL 14+ via Drizzle ORM
  - Automatically detects Neon database URLs (`neon.tech`) and uses `@neondatabase/serverless` driver with WebSocket support
  - Uses standard `pg` (node-postgres) driver for local/VPS PostgreSQL
- **Sessions**: `express-session` with `connect-pg-simple` for PostgreSQL-backed sessions
- **Authentication**: Dual auth system:
  - **Replit OIDC**: OpenID Connect via Replit when running on Replit platform
  - **Local/VPS auth**: Email/password with bcrypt hashing when `DISABLE_REPLIT_AUTH=true`
  - **Google OAuth**: Passport.js Google strategy as additional option
- **Multi-tenancy**: Tenant isolation via `assignedPropertyIds` on users; `tenantIsolation.ts` provides context helpers and property access guards
- **Event System**: In-process EventBus (Node.js EventEmitter) for domain events like audit logging and real-time SSE broadcasts
- **Audit Logging**: Automatic audit trail via `AuditService` writing to `audit_logs` table
- **Schema Validation**: Startup validator (`db-validator.ts`) checks critical table columns exist and auto-creates optional tables

### Database Schema (shared/schema.ts)

The schema is extensive, covering the full PMS domain. Key tables include:

- **`users`** — Multi-tenant users with roles (super-admin, admin, manager, staff), verification status, subscription fields, geographic tracking
- **`properties`** — Hotel/property records with settings
- **`rooms`** — Rooms per property with status tracking
- **`bookings`** — Reservations with check-in/check-out, guest linking, payment tracking
- **`guests`** — Guest profiles with stay history
- **`bills`** — Billing with GST, service charges, payment status
- **`orders`** / **`menuItems`** / **`menuCategories`** — Restaurant/food ordering system with variants and add-ons
- **`extraServices`** — Add-on services for bookings
- **`propertyExpenses`** / **`expenseCategories`** — Expense tracking with categorization
- **`wallets`** / **`walletTransactions`** / **`dailyClosings`** — Multi-wallet financial management (cash, UPI, bank accounts)
- **`staffMembers`** / **`staffSalaries`** / **`salaryAdvances`** / **`salaryPayments`** — Staff and payroll management
- **`propertyLeases`** / **`leasePayments`** — Lease management
- **`vendors`** / **`vendorTransactions`** — Vendor management
- **`attendanceRecords`** — Staff attendance
- **`messageTemplates`** / **`communications`** — WhatsApp/SMS/email templates and logs
- **`enquiries`** — Booking enquiries
- **`travelAgents`** — Travel agent/OTA records
- **`notifications`** / **`featureSettings`** — In-app notifications and feature toggles
- **`auditLogs`** — Comprehensive audit trail
- **`otaIntegrations`** — Channel manager connections (Beds24)

Schema changes are managed via `drizzle-kit push` (direct push to DB) or migrations in `migrations/`.

### Build & Dev Scripts

- `npm run dev` — Starts dev server with Vite HMR middleware (tsx runs server/index.ts)
- `npm run build` — Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.js`
- `npm run start` — Runs production build (`node dist/index.js`)
- `npm run db:push` — Pushes Drizzle schema changes directly to database
- `npm run check` — TypeScript type checking

### Key Design Patterns

- **Shared schema**: Single source of truth for DB schema, used by both server (queries) and client (type imports)
- **Insert schemas**: Zod schemas auto-generated from Drizzle table definitions via `drizzle-zod` for request validation
- **Storage abstraction**: `server/storage.ts` provides a data access layer over Drizzle queries
- **Conditional drivers**: Database driver selection is automatic based on `DATABASE_URL` content
- **Environment-based auth**: Auth strategy switches between Replit OIDC and local password auth based on env vars

## External Dependencies

### Database
- **PostgreSQL 14+** — Primary data store, accessed via Drizzle ORM
- **Neon Serverless** (`@neondatabase/serverless`) — Used automatically when `DATABASE_URL` contains `neon.tech`

### Payment Gateway
- **Razorpay** — Payment link creation for guest payments (`server/razorpay.ts`). Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` env vars.

### Messaging & Communications
- **Authkey.io** — WhatsApp Business API and SMS messaging (`server/whatsapp.ts`, `server/authkey-service.ts`). Requires `AUTHKEY_API_KEY`. Supports template-based WhatsApp messages for booking confirmations, payment receipts, check-in/checkout notifications.
- **AgentMail** — Email service via Replit Connector (`server/email-service.ts`). Used for transactional emails.

### Channel Manager
- **Beds24** — OTA/channel manager integration (`server/beds24.ts`, `scripts/sync-beds24-bookings.ts`). Pulls bookings from OTA platforms and pushes availability updates.

### Object/File Storage
- **Replit Object Storage** — Google Cloud Storage-based, used when running on Replit (`server/objectStorage.ts`)
- **MinIO** — S3-compatible self-hosted storage for VPS deployments (`server/minioStorage.ts`). Configured via `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` env vars.

### Authentication Providers
- **Replit OIDC** — OpenID Connect for Replit-hosted deployments
- **Google OAuth 2.0** — Via `passport-google-oauth20`
- **Local auth** — bcrypt-hashed passwords with express-session

### Frontend Libraries
- **Recharts** — Data visualization for analytics dashboards
- **QRCode** — Guest self-check-in QR code generation
- **date-fns** — Date manipulation throughout the app
- **Uppy** — File upload UI with S3 multipart support

### Deployment
- **GitHub Actions** — CI/CD workflows for VPS deployment (`.github/workflows/`)
- **esbuild** — Server bundling for production
- **Vite** — Frontend build tooling

## Recent Changes

### Payment System Simplification (Feb 2026)
- Merged 10+ payment modes (Cash, UPI, Card, Bank Transfer, Cheque, Online, etc.) into just 2: **Cash** and **UPI**
- UPI now covers ALL digital/non-cash payments (bank transfers, cards, cheques, online, etc.)
- Updated all payment dropdowns across: billing, bookings, expenses, salaries, vendors, leases, pending-payments
- Wallets page shows only Cash and UPI types; legacy "bank" wallets are treated as UPI at runtime
- `getWalletBalance()` in vendors/expenses/salaries pages aggregates both `upi` and legacy `bank` wallet types
- Server-side `/api/reports/bank-book` endpoint includes both UPI and legacy bank wallets
- No destructive data migration — backward compatibility via runtime `type === 'upi' || type === 'bank'` checks

### Billing Page Enhancements (Feb 2026)
- Added property dropdown filter and search by guest/invoice/booking
- Improved pending calculations based on actual balance amounts

### Lease Management Enhancements (Feb 2026)
- **Schema**: Added `lease_year_overrides` table (id, lease_id, year_number, amount, reason, created_by), `payment_mode` on salary_advances, `applies_to_month`/`applies_to_year` on lease_payments
- **Backend**: Lease year override CRUD routes (GET/POST/DELETE `/api/leases/:id/year-overrides`), enhanced PATCH `/api/leases/:id` with field-level change history and reason tracking
- **Backend**: POST `/api/attendance/mark-all-present`, salary advance payment mode support, GET `/api/salary-export` CSV endpoint
- **Frontend Lease Page**: Edit lease dialog (with reason tracking), year-wise override UI (Set Custom/Reset to Auto), enhanced ledger with pro-rata first/last month calculations, carry-forward tracking, payment allocation by month/year, tabbed summary (Summary/Ledger/History)
- **Frontend Salary Page**: Mark All Present button, advance payment mode selector (Cash/UPI), CSV salary export
- **Role Permissions**: `canEditLease` = admin/super-admin/manager; `canOverrideYears` = admin/super-admin only
- **Pro-rata calculation**: First partial month = (monthlyRent / daysInMonth) * daysRemaining; Last partial month = (monthlyRent / daysInMonth) * daysUsed

### Vendor Dialog Fix (Feb 2026)
- Save/Cancel buttons moved outside ScrollArea for always-visible sticky behavior

### Performance Optimizations (Feb 2026)
- **Response logging**: Removed expensive `JSON.stringify` of full API response bodies in request logger; now only logs error messages for 4xx/5xx responses
- **Compression**: Added gzip compression via `compression` middleware for all API and static responses
- **Polling intervals**: Reduced food-orders-report from 10s to 30s; notification polling at 30s; restaurant orders at 15s; pending-items at 60s; AI summary at 5 minutes
- **Database indexes**: Added indexes on frequently queried columns: bookings (property_id, status, room_id, guest_id), rooms (property_id), orders (status, property_id), menu_items (property_id, category_id), bills (booking_id, guest_id, payment_status), notifications (user_id, is_read), audit_logs (user_id)
- **Request timeouts**: Increased frontend API timeout from 3s to 15s for data queries; added 1 retry for failed queries
- **Verbose logging**: Removed per-request console.log from rooms endpoint tenant filtering