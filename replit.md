# Hostezee Property Management System (PMS)

## Overview

Hostezee is a comprehensive, multi-tenant property management system designed for hotels, homestays, and resorts. It provides end-to-end management for bookings, guests, billing, expenses, staff, tasks, and restaurant operations. Key capabilities include multi-property support, role-based access control, and integrations with payment gateways, messaging services, and channel managers. The system aims to streamline property operations and enhance guest experience, running efficiently on cloud environments.

## User Preferences

Preferred communication style: Simple, everyday language.

**Live server focus:** All changes, fixes, and feature requests are intended for the **live production server at hostezee.in**. Always develop and test here, then deploy with `git pull && pm2 restart propertymanager` on the live server. Do not treat this as a staging/test environment.

## System Architecture

Hostezee employs a monorepo structure with distinct `client/`, `server/`, `shared/`, and `migrations/` directories.

**Frontend:**
- **Framework**: React 18 with TypeScript.
- **UI/UX**: Utilizes `shadcn/ui` based on Radix UI with Tailwind CSS (New York style), supporting light/dark theming.
- **State Management**: TanStack React Query for data fetching and state management.
- **Forms**: React Hook Form with Zod for validation.
- **Routing**: Wouter.
- **Real-time**: Server-Sent Events (SSE).
- **File Uploads**: Uppy with S3 plugin for image compression and uploads.

**Backend:**
- **Runtime**: Node.js 20+ with Express.js and TypeScript.
- **Database**: PostgreSQL 14+ managed by Drizzle ORM, with automatic driver selection for Neon or standard `pg`.
- **Authentication**: Supports Replit OIDC, Google OAuth, and email/password with bcrypt for secure access.
- **Multi-tenancy**: Achieved through `assignedPropertyIds` and property access guards to ensure tenant data isolation.
- **Event System**: In-process EventBus for domain events like audit logging and SSE broadcasts.
- **Core Features**:
    - **Lease Module**: Advanced financial tracking for property leases, including year-wise summaries, monthly ledgers, and performance analysis.
    - **Staff Management**: Features for disabling/enabling staff with exit types (temporary/permanent) and reasons.
    - **Property Management**: Functionality to disable/enable properties with reasons and types (temporary/permanent), affecting data retention.
    - **Extra Services**: System for managing additional services provided to guests, including billing and integration with the wallet system for payment collection.
    - **Vendor/Expense Management**: Tracks property expenses and optionally links them to vendors, with separate vendor transaction records.
    - **Dynamic Pricing (add-on layer)**: Flight-style auto-pricing engine. Per-property control panel (`pricing_config`) with master toggle, emergency stop, factor toggles (occupancy/demand/day/festival/OTA/direct-booking), safety controls (min/max enforce, threshold %, frequency), and presets (conservative/balanced/aggressive). Per-room min/max + manual override (`room_pricing_settings`). Audit log (`pricing_history`). Cron heartbeat (`server/dynamic-pricing.ts`) re-reads config every minute so toggles + emergency stop apply instantly. Pushes to Aiosell via existing `pushRates()` only when `otaPushEnabled`. Does NOT modify any booking/inventory logic. UI at `/dynamic-pricing`.
    - **Cafe Mode**: `properties.property_type` ('hotel' | 'cafe', default 'hotel'). When ALL properties a user can access are `cafe`, the sidebar auto-switches to a slimmed café-only nav (Restaurant section + Expenses/Vendors/Wallets/P&L + Users/Audit/Settings); hotel sections (Bookings, Rooms, Guests, Channel Manager, Dynamic Pricing, Travel Agents, Calendar, Leases, Billing, Monthly Income, Services Report) are hidden. Super-admins and full-access owners with mixed properties keep the full hotel sidebar. Reo Cafe (id=8) is currently the only `cafe` property.
    - **Takeaway Orders**: `orders.order_mode` ('dine-in' | 'takeaway' | 'room', default 'dine-in'). Quick Order step 1 now offers a third option "Takeaway / Parcel" (🥡) that captures only name + phone (no table, no room) and submits as `orderType="restaurant"` + `orderMode="takeaway"` + selected property. Public order endpoint also accepts `orderMode` (will resolve from `tableNumber` presence if omitted). Kitchen card shows an orange 🥡 Takeaway badge instead of the generic Restaurant badge. Live Tables continues to ignore takeaway orders (they have no `tableNumber`). Reports / wallet / P&L treat takeaway exactly like any restaurant order.
    - **Table Reservations**: `table_reservations` (propertyId, tableId nullable, guestName, phone, partySize, reservationAt, durationMinutes, status: booked/seated/completed/cancelled/no-show, notes). CRUD at `/api/table-reservations` (auth + property guard). UI at `/reservations` (3-column board: Upcoming / Seated / Closed; day picker today→+6d; create dialog with optional table assignment). Live Tables shows a blue badge on any table that has an upcoming `booked` reservation in the next 3h so floor staff don't double-seat. Reservations are restaurant/cafe-only — sidebar entry sits inside the Restaurant section (visible to admin + cafe-mode).
    - **Z-Report**: GET `/api/reports/z-report?propertyId&date=YYYY-MM-DD` returns end-of-shift summary (totals, byMode, byPayment, top items, first/last order). Computed entirely from existing `orders` rows — no schema changes. Filters: `is_test=false`, `paymentStatus='paid'`, server-local day window. UI at `/z-report` with property + date picker, KPI cards, Sales-by-Mode, Cash-Drawer-by-Payment, Top Items table, and a Print button (clean print layout via `print:hidden` toolbar + `print:block` header).
    - **Kitchen Acceptance Escalation (Second-Level Alert)**: `orders.acceptance_alert_sent_at` (timestamp, NULL = not yet alerted) + `feature_settings.kitchen_acceptance_timeout_minutes` (int, default 10, 0 = disabled). Background job in `server/routes.ts` (`startKitchenAcceptanceEscalationJob`) runs every 60s, scans for orders where `status='pending' AND is_test=false AND acceptance_alert_sent_at IS NULL AND created_at < now()-Xmin` per property, then fires a one-shot warning: in-app notification (`type=order_unaccepted`, sound=warning) for admin/super-admin/kitchen, PWA push, and WhatsApp re-alert via the existing approved `food_order_staff_alert` template (guest name prefixed with `URGENT (Xm):` to convey escalation context — no new AuthKey approval needed). WhatsApp sends to BOTH alert-rule recipients AND Feature Settings extra phone numbers (mirrors first-level new-order alert), with dedup via normalized phone set. Stamps `acceptance_alert_sent_at` so each order is alerted exactly once. Configurable per property at `/feature-settings` (number input under "Notifications & Alerts"). Index `idx_orders_pending_escalation` makes the per-tick scan cheap.
    - **Kitchen Multi-Select Property Filter**: The restaurant/kitchen page (`/restaurant`) uses a custom multi-select checkbox dropdown (Popover + Checkbox) instead of the single-select PropertyScopePicker. All users (not just super-admin) can select "All Properties" or pick 2-3 specific properties via checkboxes. Selection persists in `localStorage` key `kitchen.propertyIds` (empty array = all). Stale IDs are auto-sanitized when available properties change. The single-select `selectedPropertyId` from `usePropertyFilter` remains synced for popup settings and test orders that require a single property.
    - **Test Order Mode**: `orders.is_test` flag (default false) for kitchen/notification verification. POST `/api/orders/test` creates a dummy order that triggers the full real-order notification flow (in-app, push, WhatsApp staff + extra numbers) and shows on KDS with a violet dashed border + "🧪 TEST ORDER" badge. DELETE `/api/orders/test/cleanup` removes only `is_test=true` rows. The `is_test` flag is server-stripped from POST `/api/orders` and PATCH `/api/orders/:id` so real orders can never be flagged as test. Test orders are excluded from all revenue queries (`getMonthlyPnL`, lease revenue), wallet recording, and the food-orders report.
    - **Early Checkout Billing Adjustment**: When a guest checks out before their scheduled date, the checkout dialog now detects the shortfall (`savedNights = scheduledCheckOut - today`) and shows a blue "Early Checkout" alert card (symmetric to the Extended Stay UX). Staff can choose: (a) "Charge X nights only" — deducts `savedNights × roomRate` from room charges and shows actual nights in the bill breakdown, or (b) "Keep Full N nights — No Reduction". An applied badge with a "Change" undo link confirms the choice. Entirely frontend-computed; no backend/schema changes needed.
- **Branding**: Uses a consistent brand identity with a specific logo (`hostezee_logo_transparent_1773119386285.png`), brand colors (Primary Blue `#1E3A5F`, Teal `#2BB6A8`, Accent Yellow `#F2B705`), and the tagline "Simplify Stays" across all interfaces and assets.
- **Performance**: Incorporates server-side caching with TTLs for frequently accessed data, client-side caching via TanStack Query, route optimization, image compression, and response compression.

## External Dependencies

-   **Databases**: PostgreSQL 14+, Neon Serverless.
-   **Payment Gateway**: Razorpay.
-   **Messaging & Communications**: Authkey.io (WhatsApp Business API, SMS), AgentMail (Email service via Replit Connector).
-   **Channel Managers**: AioSell (for inventory, rates, restrictions, and webhook-based reservation sync).
-   **Object/File Storage**: Replit Object Storage (Google Cloud Storage-based), MinIO (S3-compatible).
-   **Authentication Providers**: Replit OIDC, Google OAuth 2.0, Local (bcrypt).
-   **Frontend Libraries**: Recharts, QRCode, date-fns, Uppy.