# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system for mountain resort properties. It provides robust features for booking, custom pricing, advance payments, guest tracking, restaurant operations, and complete checkout with bill generation. The system includes a financial module for tracking property lease agreements, payments, and auto-categorized expenses, generating detailed P&L reports per property. Designed as a modern SaaS solution with a mobile-first, mountain resort-inspired aesthetic, it aims to streamline operational and financial management.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (Nov 23, 2025)
- **Guest Self Check-in System**: Built complete contactless check-in feature at `/guest-self-checkin`. Guests can scan QR code or enter booking ID, verify identity via email, upload ID proof, and complete check-in without staff assistance. Includes 2 backend endpoints (GET /api/guest-self-checkin/booking/:id, POST /api/guest-self-checkin) with audit logging.
- **Super Admin Dashboard**: Complete implementation with 8 backend endpoints including user management, property oversight, suspend/activate users, login-as-user functionality, and system reports. All endpoints integrated with audit logging.
- **Password Recovery System**: 3 complete endpoints (forgot-password, verify-otp, reset-password) with email/SMS OTP dual-channel support.
- **Database Schema Complete**: All required columns added (phone, status, business_name, owner_user_id) with proper foreign key references. Schema synchronized with database.

## Previous Updates (Nov 19, 2025)
- **Airbnb-Style Room Calendar**: Built new visual calendar with horizontal date grid and vertical room list. Features color-coded availability (green/red/orange), dormitory bed-level tracking, direct booking from cells, date range search, and available rooms summary panel. Uses new `/api/calendar/availability` endpoint with proper date-overlap logic.
- **Room Status Smart Logic**: Rooms in "cleaning", "maintenance", or "out-of-order" status are blocked ONLY for today. Future dates ignore room status and only check booking overlaps, allowing advance bookings for rooms currently being cleaned.
- **Removed Check Availability Page**: Deprecated old buggy availability checker. Users now use the Room Calendar for all availability searches and bookings.

## System Architecture

### UI/UX Decisions
The UI design system utilizes **shadcn/ui**, **Tailwind CSS**, and **Radix UI** primitives, featuring a custom mountain-themed color palette, light/dark mode support, and mobile-first responsiveness.

### Technical Implementations
The frontend is built with **React 18**, **TypeScript** (Vite), **Wouter** for routing, and **TanStack Query** for server state management. Forms are handled by **React Hook Form** with **Zod** for validation. The backend uses **Express.js** on **Node.js** with **TypeScript**, following a RESTful API design. **PostgreSQL** via Neon serverless serves as the primary database, accessed using **Drizzle ORM**. Authentication is managed by **Replit Auth** with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Manages multiple resort properties.
-   **Booking & Guest Management**: Coordinates bookings, tracks guests, offers advanced pricing, and tracks booking sources and meal plans.
-   **WhatsApp Notifications System**: Guest notifications for check-in and checkout via authkey.io, with Indian phone number normalization and configurable templates. Booking confirmation and payment notifications are available but currently disabled (can be re-enabled in code).
-   **Travel Agent Management**: Tracks and manages travel agents with full CRUD operations, property-scoped databases, and data integrity validation.
-   **Date-Based Room Availability**: Determines room availability by checking booking date overlaps across active bookings, supporting multiple bookings for different date ranges for the same room. Frontend booking form now integrates with availability API to show only available rooms and display remaining bed counts for dormitory rooms in real-time.
-   **Group Bookings**: Allows creating group bookings for multiple rooms under a single guest.
-   **Dormitory Bed Capacity Tracking**: Simplified bed-level tracking for dormitory rooms using new `/api/rooms/:id/bed-inventory` endpoint. The booking form now has a dedicated "Dormitory" tab (alongside "Single Room" and "Group Booking") that shows only dormitory rooms, making it easier to find and book dorm beds. When a dormitory room is selected, the system fetches real-time bed availability (totalBeds, reservedBeds, remainingBeds) and displays clear status (e.g., "2 of 6 beds occupied • 4 beds available"). Users select the number of beds to book via a numeric input that auto-clamps to prevent overbooking. Edit mode automatically opens the correct tab based on booking type (dormitory, single, or group).
-   **Booking Deletion**: Safe deletion prevents removal of bookings with associated bills or food orders.
-   **Payment & Communication System**: Tracks advance payments, sends guest messages, and logs communications.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, and food order reporting.
-   **My Rasoi Menu System**: Provides comprehensive menu management including categories (with drag-and-drop reordering), items (with images, descriptions, variants, and add-ons), and a staff interface for CRUD operations. Supports a mobile-optimized room service menu with QR code integration and full variant support.
-   **Enhanced Menu Ordering UX**: Both public and staff menu pages feature live search filtering (by item name and description) with clearable input, and inline quantity controls. Simple items show +/- buttons directly on the menu when in cart; complex items (with variants/add-ons) display total quantity badges and reopen customization sheets for editing. Search results update category counts dynamically and show an empty state when no items match.
-   **Quick Order Entry System**: Staff-facing 3-step wizard for creating room service and restaurant orders with the same search and quantity control features as the public menu, streamlining order entry workflow.
-   **Room-Specific QR Codes**: Generates unique QR codes per room for contactless room service ordering, pre-filling room numbers.
-   **Public Menu Ordering**: Supports room service and walk-in café orders via a public menu page without authentication.
-   **In-House Guest Café Orders**: Links café orders to room bills for in-house guests.
-   **Café Bill Merge System**: Allows staff to search and merge café bills to room bookings at checkout.
-   **Auto-Merge Order Billing**: Automatically merges room service and in-house café orders into the final guest bill.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, and generates P&L reports.
-   **Active Bookings Dashboard**: Real-time monitoring of checked-in guests with quick checkout.
-   **Enhanced Dashboard with Quick Actions**: Mobile-optimized dashboard with quick action tabs for New Booking and New Enquiry, and live counts for check-ins, check-outs, and orders.
-   **Airbnb-Style Room Calendar**: Visual calendar with horizontal dates and vertical room grid. Color-coded availability (green=available, red=booked, orange=partial for dorms). Supports direct booking from calendar cells, date range search, property filtering, and shows available rooms summary with Book/Enquiry actions. Smart room status handling: cleaning/maintenance blocks only today, not future dates.
-   **Bill Management**: Detailed bill viewing, generation, and professional printing. Billing page UI hides "Total Revenue" from managers (frontend-only) - only admins see revenue totals.
-   **Booking Editing**: Modifies existing reservations.
-   **Guest ID Proof Upload**: Requires guest ID proof upload using Replit Object Storage.
-   **Booking Analytics**: Provides analytics on bookings, revenue, sources, and meal plans.
-   **User Management**: Admin users manage roles, property assignments, and user deletions with safety checks.
-   **Property Display**: Users see their assigned property name in the sidebar.
-   **Enhanced Enquiries Management**: Manages the complete enquiry lifecycle, supporting group enquiries and ensuring proper data transfer during conversion to booking.
-   **Pending Payments Tracking**: Comprehensive system for tracking unpaid bills with payment status selection during checkout (paid/pending), optional due dates and reasons, agent-wise summary dashboard, and mark-as-paid functionality with payment method recording.
-   **Excel Export for Financial Data**: Admin-only comprehensive CSV export of complete booking and financial data from the Financials page. Export includes: guest details (name, phone, email), property name, room information (numbers, type, category), booking type, dates (check-in, check-out, nights), status, booking source, travel agent, meal plan, complete pricing breakdown (base room price, custom price, room charges total, food charges, extra charges, subtotal, GST rate & amount, service charge rate & amount, discount amount), total bill amount, advance paid, balance due, payment status, payment method, special requests, and metadata. Provides complete financial visibility for accounting and analysis. Restricted to admins only to protect sensitive financial data.
-   **Guest Self Check-in**: Contactless check-in system with QR code scanning. Guests scan booking QR code, verify identity via email, upload ID proof, and complete check-in without staff assistance. Public route at `/guest-self-checkin` accessible to all guests. Supports both QR code scanning and manual booking ID entry.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation.
-   **Authorization**: Role-based (admin, super-admin, manager, staff, kitchen) with multi-property assignments. Managers have **view-only access** to financial data (Billing, Pending Payments, Expenses) for their assigned properties and cannot access Leases, Financials/P&L, Analytics, or Salaries (admin-only). Backend enforces admin-only role checks on all bill modification endpoints (POST /api/bills, PATCH /api/bills/:id, POST /api/bills/merge, POST /api/bills/:id/mark-paid).
-   **Multi-Property Assignment System**: Users can be assigned to multiple properties via an integer array, with all filtering logic updated to support array-based authorization and property ownership enforcement on all mutations.
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security**: HTTPS-only cookies, environment variable-secured session secrets, CSRF protection, and least-privilege access control.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication.
-   **Neon Serverless PostgreSQL**: Database.
-   **Authkey.io**: (Optional) For WhatsApp and SMS messaging.

### Key NPM Packages
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `react-hook-form`, `zod`, `date-fns`.
-   **UI/Styling**: `@radix-ui/react-*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.

### Environment Configuration
-   **Required**: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`.
-   **Optional**: `ISSUER_URL`, `REPLIT_DOMAINS`, `NODE_ENV`.
-   **Optional (for WhatsApp notifications)**: 
    - `AUTHKEY_API_KEY`: Your authkey.io API key for WhatsApp messaging
    - `AUTHKEY_WA_TEMPLATE_ID`: Booking confirmation template (default: 18491)
    - `AUTHKEY_WA_PAYMENT_TEMPLATE_ID`: Payment confirmation template (default: 18649)
    - `AUTHKEY_WA_CHECKIN_TEMPLATE_ID`: Check-in notification template (default: 18652)
    - `AUTHKEY_WA_CHECKOUT_TEMPLATE_ID`: Checkout notification template (default: 18652)
    - `AUTHKEY_WA_PENDING_PAYMENT_TEMPLATE_ID`: Pending payment reminder template (optional)
    - `AUTHKEY_WA_ENQUIRY_TEMPLATE_ID`: Enquiry confirmation template (optional)
