# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system for mountain resort properties. It provides robust features for booking, custom pricing, advance payments, guest tracking, restaurant operations, and complete checkout with bill generation. The system includes a financial module for tracking property lease agreements, payments, and auto-categorized expenses, generating detailed P&L reports per property. Designed as a modern SaaS solution with a mobile-first, mountain resort-inspired aesthetic, it aims to streamline operational and financial management.

## User Preferences
Preferred communication style: Simple, everyday language.

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
-   **Dormitory Bed Capacity Tracking**: Full bed-level tracking for dormitory rooms. The `bedsBooked` field correctly saves to database (fixed by using `null` instead of `undefined` to avoid database defaults). Frontend booking form displays remaining beds (e.g., "3/6 beds available") and prevents overbooking by filtering unavailable rooms based on date-range availability.
-   **Booking Deletion**: Safe deletion prevents removal of bookings with associated bills or food orders.
-   **Payment & Communication System**: Tracks advance payments, sends guest messages, and logs communications.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, and food order reporting.
-   **My Rasoi Menu System**: Provides comprehensive menu management including categories (with drag-and-drop reordering), items (with images, descriptions, variants, and add-ons), and a staff interface for CRUD operations. Supports a mobile-optimized room service menu with QR code integration and full variant support.
-   **Room-Specific QR Codes**: Generates unique QR codes per room for contactless room service ordering, pre-filling room numbers.
-   **Public Menu Ordering**: Supports room service and walk-in café orders via a public menu page without authentication.
-   **In-House Guest Café Orders**: Links café orders to room bills for in-house guests.
-   **Café Bill Merge System**: Allows staff to search and merge café bills to room bookings at checkout.
-   **Auto-Merge Order Billing**: Automatically merges room service and in-house café orders into the final guest bill.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, and generates P&L reports.
-   **Active Bookings Dashboard**: Real-time monitoring of checked-in guests with quick checkout.
-   **Enhanced Dashboard with Quick Actions**: Mobile-optimized dashboard with quick action tabs for New Booking and New Enquiry, and live counts for check-ins, check-outs, and orders.
-   **Room Availability Calendar**: Visual calendar for occupancy.
-   **Bill Management**: Detailed bill viewing, generation, and professional printing.
-   **Booking Editing**: Modifies existing reservations.
-   **Guest ID Proof Upload**: Requires guest ID proof upload using Replit Object Storage.
-   **Booking Analytics**: Provides analytics on bookings, revenue, sources, and meal plans.
-   **User Management**: Admin users manage roles, property assignments, and user deletions with safety checks.
-   **Property Display**: Users see their assigned property name in the sidebar.
-   **Enhanced Enquiries Management**: Manages the complete enquiry lifecycle, supporting group enquiries and ensuring proper data transfer during conversion to booking.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation.
-   **Authorization**: Role-based (admin, manager, staff, kitchen) with multi-property assignments. Managers and kitchen users have property-scoped data access.
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