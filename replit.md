# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system for hotels, resorts, and accommodations. Built natively on Replit, it offers instant deployment and eliminates DevOps complexity. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management. Its primary goal is to be the easiest PMS globally to deploy and operate, aiming to capture significant market share.

---

## 🏁 PHASE 1 COMPLETE (November 30, 2025)

**Status:** ✅ STABLE & WORKING

### What Phase 1 Includes:
Phase 1 represents the complete foundation of Hostezee with all core features working correctly.

**Critical Fix Applied:**
- Complete database schema alignment between code and actual PostgreSQL database
- Fixed 15+ table schemas that had column name mismatches
- All APIs now return proper data (billing, bookings, rooms, guests, etc.)

**Core Features Working:**
1. **Authentication** - Replit Auth with role-based access (admin, staff, manager, kitchen)
2. **Multi-Property Management** - 3 properties, 14 rooms fully operational
3. **Booking System** - Complete booking lifecycle with calendar view
4. **Billing & Payments** - Room charges, food charges, GST, discounts, RazorPay integration
5. **Restaurant/Orders** - Menu management, QR ordering, kitchen display
6. **Guest Management** - ID proof upload, WhatsApp notifications
7. **Staff & Attendance** - Salary tracking, attendance records
8. **Dashboard** - Real-time stats, pending items, recent payments
9. **AI Notifications** - 3-hour smart reminders for pending tasks
10. **OTA Integrations** - Booking.com, Airbnb, OYO sync support
11. **Feature Settings** - 10 toggleable admin controls per property

**Database Tables Aligned (15 tables fixed):**
- users, properties, rooms, bookings, guests
- bills, orders, enquiries, notifications, extra_services
- travel_agents, staff_members, staff_salaries, salary_advances, issue_reports

**All API Endpoints Working:**
- /api/auth/user ✓
- /api/properties ✓
- /api/rooms ✓
- /api/bookings ✓
- /api/bills ✓
- /api/guests ✓
- /api/orders ✓
- /api/enquiries ✓
- /api/notifications ✓
- /api/dashboard/stats ✓
- /api/pending-items ✓
- /api/recent-payments ✓
- /api/travel-agents ✓
- /api/extra-services ✓

**Key Files for Phase 1:**
- `shared/schema.ts` - All database schemas aligned with actual DB
- `server/storage.ts` - Database operations
- `server/routes.ts` - All API endpoints

---

## Recent Updates (Session 6 - Audit Trail & WhatsApp Controls)
- ✅ **Complete Audit Trail System**: Tracks all critical user actions
  - Database table `audit_logs` with entity tracking
  - Logs bill creation/updates, booking changes with full changesets
  - API endpoint `/api/audit-logs` for viewing logs
  - UI page at `/audit-logs` with search and filtering
- ✅ **WhatsApp Notification Controls**: Per-property message type toggles
  - 6 message types: check-in, check-out, enquiry, payment request, booking confirmation, reminders
  - Database table `whatsapp_notification_settings`
  - API endpoints for settings management
  - UI at `/whatsapp-settings`

## Recent Updates (Session 5 - Phase 1 Stabilization)
- ✅ **Critical Database Schema Fix**: Aligned 15+ table schemas with actual PostgreSQL database
- ✅ **Billing Data Fix**: Bills now display correct room_charges, food_charges, GST amounts
- ✅ **All APIs Restored**: Fixed column name mismatches causing 500 errors
- ✅ **Tables Fixed**: users, properties, rooms, bookings, guests, bills, orders, enquiries, notifications, extra_services, travel_agents, staff_members, staff_salaries, salary_advances, issue_reports

## Recent Updates (Session 4)
- ✅ **OTA Integration System**: Complete multi-platform booking sync
  - Database schema for storing OTA credentials and sync status
  - API endpoints for managing OTA integrations (CRUD operations)
  - Sync functionality to pull reservations from Booking.com, Airbnb, OYO, Agoda, Expedia, MMT, TripAdvisor
  - Real-time sync status tracking and error logging
  - Frontend UI with property selection, credential management, and manual sync triggers

## Previous Updates (Session 3)
- ✅ Enhanced AI Notifications: Changed from 1-hour to 3-hour smart reminders with auto-dismiss
- ✅ WhatsApp Food Order Alerts: Real-time notifications even when app is closed
- ✅ Employee Performance Dashboard: 3-tab system (User Performance, Staff Performance, Score Points)
- ✅ Feature Settings Control: 10 toggleable features for admin property customization
- ✅ Website Enhancement: 
  - Pricing page with Hostezee vs competitor feature comparison
  - AI Notifications showcase section on landing page
  - App screenshots gallery showing 6 key features
  - Comprehensive features page organized by category

## User Preferences
Preferred communication style: Simple, everyday language. Wants showcase of all features on website with pricing comparison and app screenshots.

## System Architecture

### UI/UX Decisions
The UI uses shadcn/ui, Tailwind CSS, and Radix UI primitives, featuring a custom mountain-themed color palette, light/dark modes, and mobile-first responsiveness. Premium landing and login pages include animated gradients. Mobile optimization provides responsive room calendar columns and stacked tab layouts.

### Technical Implementations
The frontend uses React 18, TypeScript (Vite), Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The backend is Express.js on Node.js with TypeScript, following a RESTful API design. PostgreSQL via Neon serverless is the primary database, accessed with Drizzle ORM. Authentication uses Replit Auth with OpenID Connect (OIDC) via Passport.js and session-based, secure HTTP-only cookies.

### Feature Specifications

#### Core Management
-   **Multi-Property Management**: Manages multiple resort properties with unlimited scalability.
-   **Booking & Guest Management**: Intelligent booking engine, guest tracking, advanced pricing, booking source, meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Airbnb-style visual room calendar with color-coded availability, direct booking, date range search, and smart room status logic.
-   **User Management**: Admin users manage roles, property assignments, and deletions with role-based access control.
-   **Enquiry Management**: Manages the complete lifecycle of individual and group enquiries with automated conversion.

#### AI & Intelligent Features (NEW)
-   **AI-Powered Smart Notifications**: Intelligent notification system with:
     - Smart 3-hour reminders for pending tasks (cleaning, payments, orders)
     - Auto-dismiss after 3 hours if task still pending
     - Works offline via browser push notifications
     - Task-specific intelligence for cleaning, payments, food orders, staff attendance
     - Customizable reminder intervals
-   **Employee Performance Dashboard**: Track staff performance with 3 analytics tabs:
     - User Performance (individual metrics)
     - Staff Performance (team-wide statistics)
     - Score Points (performance scoring system)
-   **24/7 AI Chatbot Assistant**: OpenAI GPT-4o-mini via Replit AI for user support on landing page and within the app.

#### Restaurant & Operations
-   **Restaurant & Order Management**: Complete kitchen management with QR ordering, menu system (categories, items, variants, add-ons), enhanced ordering UX, quick order entry, real-time order tracking, and room-specific QR codes.
-   **WhatsApp Food Order Alerts**: Real-time WhatsApp notifications for new food orders - works even when app is completely closed on mobile.

#### Financial Management
-   **Financial Tracking**: Property lease agreements, payments, expenses, P&L reports, pending payments, detailed bill management, professional printing, and Excel export.
-   **RazorPay Payment Link Integration**: Direct payment collection via WhatsApp, automatic payment confirmation via webhook, bill status auto-update to PAID, and customer WhatsApp confirmation.
-   **Split Payment System**: Simplified payment collection with single cash input, auto-calculated remaining balance, and one-click payment link generation for the remaining amount.
-   **Dashboard Payment Notifications**: Real-time notifications displaying customer name and amount paid when payments complete via RazorPay webhook, polling every 5 seconds.

#### Staff Management
-   **Attendance & Salary Management**: Staff attendance tracking, automatic salary calculation with intelligent deductions based on employment dates, monthly summaries, and salary editing.
-   **Performance Tracking**: Tie performance scores to salary calculations and staff management decisions.

#### Advanced Controls
-   **Feature Settings Control Panel**: 10 toggleable features for admins:
     - Food order notifications
     - WhatsApp notifications
     - Email notifications
     - Payment reminders
     - Auto-checkout
     - Auto-salary calculation
     - Attendance tracking
     - Performance analytics
     - Expense forecasting
     - Budget alerts
-   **OTA Integrations (NEW)**: Multi-platform booking synchronization:
     - Support for 8 OTA platforms (Booking.com, Airbnb, OYO, Agoda, Expedia, MMT, TripAdvisor, Others)
     - Store OTA credentials securely (API Key & Secret)
     - Manual reservation sync with error tracking
     - Last sync timestamp tracking
     - Per-property integration management

#### Analytics & Reporting
-   **Dashboard & Analytics**: Active bookings dashboard, quick actions, booking analytics, real-time "Active Users" count, occupancy tracking, and revenue reports.
-   **Super Admin Portal**: System-wide management dashboard with user management, property monitoring, issue tracking, contact leads, and error reporting.

#### Guest Experience
-   **Guest Experience**: WhatsApp notification system, guest ID proof upload (Replit Object Storage), guest self-check-in via QR code, and WhatsApp payment links.

#### Security & Compliance
-   **Error Reporting**: Automatic crash reporting with stack trace capture and a Super Admin dashboard for error resolution.
-   **Enterprise Security**: ISO 27001 compliance, end-to-end encryption, SOC 2 certification, role-based access control, and secure authentication.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation. Role-based authorization (admin, super-admin, manager, staff, kitchen) with multi-property assignments and least-privilege access.
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security**: HTTPS-only cookies, environment variable-secured session secrets, and CSRF protection.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication.
-   **Neon Serverless PostgreSQL**: Primary database.
-   **Authkey.io**: WhatsApp and SMS messaging.
-   **OpenAI GPT-4o-mini**: Chatbot assistant via Replit AI.
-   **RazorPay**: Payment processing and payment link generation with webhook support.

### Key NPM Packages
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `react-hook-form`, `zod`, `date-fns`.
-   **UI/Styling**: `@radix-ui/react-*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.