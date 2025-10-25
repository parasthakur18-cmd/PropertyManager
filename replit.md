# Hostezee Property Management System

## Overview

Hostezee is a comprehensive, multi-property management system designed for mountain resort properties. It offers capabilities for booking coordination with custom pricing, advance payments, guest tracking, restaurant operations, and complete checkout with bill generation. The system integrates a robust financial module for tracking property lease agreements, lease payments, and expenses with auto-categorization. It generates detailed P&L reports per property, providing a unified platform for operational and financial management. The project aims to provide a modern SaaS solution with a mountain resort-inspired, mobile-first design system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses **React 18** with **TypeScript**, built with **Vite**. **Wouter** handles routing, and **TanStack Query** manages server state. Forms are built with **React Hook Form** and **Zod** for validation. The UI design system leverages **shadcn/ui**, **Tailwind CSS**, and **Radix UI** primitives, styled with a custom mountain-themed color palette, supporting light/dark modes and mobile-first responsiveness.

### Backend

The backend is built with **Express.js** on **Node.js** using **TypeScript**, following a RESTful API design. It handles authentication, user management, CRUD operations for core resources (properties, rooms, bookings, etc.), and financial transactions. Key features include active booking dashboards, checkout processing with bill calculation, and comprehensive expense management. Development uses hot module replacement, and production builds combine client and server bundles.

### Data Storage

**PostgreSQL** via Neon serverless is the primary database, accessed using **Drizzle ORM** for type-safe queries and migrations. The schema includes tables for users (with role-based access), properties, rooms, guests, bookings, menu items, orders, bills, extra services, enquiries (with payment status tracking), message templates, communications (message history), property leases, lease payments, and property expenses with customizable categories and keyword-based auto-categorization. Data validation is enforced client-side with Zod and server-side using shared Zod schemas.

### Authentication & Authorization

Authentication is handled by **Replit Auth** with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies stored in PostgreSQL. Authorization is role-based (admin, manager, staff, kitchen) with property-specific assignments, ensuring granular access control. Security measures include HTTPS-only cookies, environment variable-secured session secrets, and CSRF protection.

### Core Features

- **Multi-Property Management**: Supports managing multiple resort properties from a single interface.
- **Booking & Guest Management**: Comprehensive booking coordination, guest tracking, and advanced pricing options.
- **Payment Status Tracking**: Track advance payment status (pending/received/refunded) for enquiries with one-click status updates.
- **Guest Communication System**: Send messages to guests via WhatsApp/SMS using predefined templates or custom messages. Includes message logging and history.
- **Restaurant & Order Management**: Integrates restaurant operations, order tracking, and kitchen workflow.
- **Financial Tracking**: Manages property lease agreements, payments, expenses with auto-categorization, and generates P&L reports.
- **Active Bookings Dashboard**: Real-time monitoring of checked-in guests with running totals and quick checkout.
- **Room Availability Calendar**: Visual calendar for room availability and occupancy across properties with direct enquiry creation.
- **Bill Management**: Detailed bill viewing, generation, and professional printing with itemized charges.
- **Booking Editing**: Allows staff to modify existing reservations, including dates, room assignments, and pricing.

## External Dependencies

### Third-Party Services

-   **Replit Auth OIDC**: User authentication and identity management.
-   **Neon Serverless PostgreSQL**: Primary database service.
-   **Authkey.io** (Optional): For WhatsApp and SMS messaging to guests. System works without it; messages are logged but not sent until configured. Preferred for Indian market with competitive pricing (₹0.35 per WhatsApp conversation, ₹0.90 per template) and ₹2,500 free startup credits.

### Key NPM Packages

-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `react-hook-form`, `zod`, `date-fns`.
-   **UI/Styling**: `@radix-ui/react-*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.

### Environment Configuration

-   **Required**: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`.
-   **Optional**: `ISSUER_URL`, `REPLIT_DOMAINS`, `NODE_ENV`.
-   **Optional (for messaging)**: 
    -   `AUTHKEY_API_KEY`: authkey.io API key for SMS/WhatsApp messaging
    -   `AUTHKEY_WHATSAPP_NUMBER`: Your registered WhatsApp Business number
    -   See `AUTHKEY_SETUP.md` for complete setup instructions

## Recent Feature Updates

### Menu Management (October 2024)
- **Menu Item Management**: New comprehensive page for managing restaurant menu items
  - View all menu items grouped by category (Appetizers, Main Course, Desserts, Beverages, Snacks, Breakfast)
  - Search functionality to filter items by name or category
  - Add new menu items with full details: name, category, price, description, preparation time, property assignment
  - Edit existing items with instant price updates and other modifications
  - Toggle availability: Enable/disable menu items when out of stock or unavailable
  - Delete menu items with confirmation dialog
  - Real-time availability switch visible on each menu card
  - Form validation using React Hook Form and Zod schemas
  - Route: `/menu-management`, accessible to admin, manager, and staff roles
  - Navigation: Added to sidebar with BookOpen icon
  - Database field: `isAvailable` boolean controls whether items appear on guest-facing menu

### Food Orders Report (October 2024)
- **Sales Reporting**: New comprehensive food orders report page with date range filtering and analytics
  - Date range options: Today, Last 7 days, Last 30 days, and Custom range
  - Accurate date calculations: "Last 7 days" = today + 6 days back (exactly 7 days), "Last 30 days" = today + 29 days back (exactly 30 days)
  - Custom range validation: Requires both start and end dates; shows error message and disables calculations/exports when incomplete
  - Sales summary displays: Total orders count, total revenue, average order value
  - Status breakdown: Visual distribution of pending, preparing, completed, and cancelled orders
  - Detailed orders table: Shows date/time, room number, guest name, items ordered, total amount, and status
  - CSV export functionality with all order details (disabled when custom range incomplete or no data available)
  - Guest name resolution: Automatically fetches guest names from bookings when orders are linked to rooms
  - Route: `/food-orders-report`, accessible to admin and manager roles
  - Navigation: Added to sidebar with FileBarChart icon

### Payment & Messaging System (December 2024 - Updated October 2025)
- **Payment Status Tracking**: Added `paymentStatus` field to enquiries table with values: pending, received, refunded. Displayed with color-coded badges in the UI.
- **Message Templates**: Created 6 default message templates for common scenarios (payment reminders, booking confirmations, check-in details, payment confirmations, check-out reminders, welcome messages). Templates support variable substitution like {guestName}, {advanceAmount}, etc.
- **Communication Logging**: All messages are logged in `communications` table with recipient details, message content, delivery status, and timestamps.
- **Enquiries Page Enhancements**:
  - Added "Confirm Enquiry" button for enquiries with pending payments (renamed from "Mark as Received")
  - Button now automatically converts enquiry to booking via POST /api/enquiries/:id/confirm endpoint
  - Added "Send Message" button that opens dialog with template selection or custom message capability
  - Payment status badges displayed next to price information
  - Real-time message preview with variable substitution
- **API Enhancements**: New endpoints for enquiry confirmation (`POST /api/enquiries/:id/confirm`), payment status updates (`PATCH /api/enquiries/:id/payment-status`), message templates (`GET /api/message-templates`), sending messages (`POST /api/communications`), viewing communication history (`GET /api/enquiries/:id/communications`, `GET /api/bookings/:id/communications`), and delivery status webhook (`POST /api/webhooks/authkey/delivery-status`).
- **Authkey.io Integration**: Full integration with authkey.io for actual SMS and WhatsApp message delivery
  - Service module (`server/authkey-service.ts`) handles WhatsApp template messages and SMS
  - Automatic message sending when credentials are configured
  - Falls back to logging-only mode when credentials are not set
  - Delivery status tracking with webhook support
  - Template-based WhatsApp messaging for compliance
  - DLT-compliant SMS for Indian regulations
  - See `AUTHKEY_SETUP.md` for complete setup guide

### Guest ID Proof Upload & Enquiry Conversion (October 2024)
- **Mandatory ID Upload**: All new bookings now require guest ID proof upload using Replit Object Storage
  - ObjectUploader component integrated with Uppy v3 for file uploads
  - Presigned URL upload flow with private ACL policies for secure document storage
  - Upload endpoints: POST /api/objects/upload, PUT /api/guest-id-proofs, GET /objects/:objectPath
  - Form validation prevents booking creation without ID proof
  - Upload button shows "Upload Guest ID" (changes to "ID Uploaded ✓" when complete)
- **Automated Enquiry-to-Booking Conversion**: "Confirm Enquiry" button now creates bookings automatically
  - POST /api/enquiries/:id/confirm endpoint handles the conversion
  - Finds or creates guest from enquiry data
  - Creates booking with "confirmed" status
  - Updates enquiry status to "confirmed" and payment status to "received"
  - Invalidates both enquiries and bookings cache for real-time UI updates

### Real-Time Updates Fix (October 2025)
- **Active Bookings Cache Invalidation**: Fixed critical real-time update issues for Active Bookings dashboard
  - All booking create/update mutations now invalidate `/api/bookings/active` cache for instant UI updates
  - Order status changes (especially "delivered") now trigger Active Bookings refresh to update running totals
  - Enquiry confirmation mutation properly invalidates Active Bookings cache when converting to booking
  - Cache invalidation pattern ensures seamless real-time updates across bookings, orders, and enquiries
  - No page refresh needed - all changes reflect immediately on Active Bookings dashboard

### Booking Analytics & Source Tracking (October 2025)
- **Booking Source Tracking**: Added `source` field to bookings table with 7 channel options
  - Channels: Booking.com, Airbnb, Walk-in, Phone, Self Generated, Online, OTA (Other)
  - Captured during booking creation and edit
  - Enables revenue attribution by booking channel
- **Meal Plan Tracking**: Added `mealPlan` field to bookings table with 4 options
  - Plans: EP (Room Only), CP (Room + Breakfast), MAP (Breakfast + Dinner), AP (All Meals)
  - Helps track guest preferences and package types
- **Booking Analytics Dashboard**: New comprehensive analytics page (`/booking-analytics`)
  - Date filtering: Today, Last 7 days, Last 30 days, Custom range
  - Summary cards: Total bookings, total revenue, top booking source
  - Revenue by Source: Visual breakdown with percentage bars and booking counts
  - Meal Plan Distribution: Booking count analysis by meal plan type
  - Property filtering: Filter analytics by specific property or all properties
  - CSV Export: Download detailed booking data with all metrics
  - Route accessible to admin and manager roles
  - Navigation: Added to sidebar with BarChart3 icon
- **API Endpoint**: New `/api/bookings/with-details` endpoint provides enriched booking data with guest, room, and property information for analytics

### Authkey.io SMS & WhatsApp Integration (October 2025)
- **Service Module**: Created `server/authkey-service.ts` for authkey.io API integration
  - WhatsApp template messaging with parameter substitution
  - SMS messaging with DLT compliance support
  - Delivery status tracking
  - Graceful fallback when credentials not configured
- **Updated Communications Endpoint**: Enhanced `/api/communications` to send real messages
  - Automatically sends via authkey.io when credentials are configured
  - Supports both SMS and WhatsApp channels
  - Logs delivery status and message IDs
  - Falls back to logging-only mode without credentials
- **Delivery Status Webhook**: New `/api/webhooks/authkey/delivery-status` endpoint
  - Receives delivery status updates from authkey.io
  - Updates message status in database (sent, delivered, failed)
  - Tracks error messages for failed deliveries
- **Environment Variables**: 
  - `AUTHKEY_API_KEY`: API key for authkey.io authentication
  - `AUTHKEY_WHATSAPP_NUMBER`: Registered WhatsApp Business number
- **Setup Documentation**: Complete setup guide in `AUTHKEY_SETUP.md`
  - Account creation and verification steps
  - WhatsApp Business API setup
  - DLT registration for SMS in India
  - Template creation and approval process
  - Pricing guide and cost optimization tips
  - Troubleshooting common issues