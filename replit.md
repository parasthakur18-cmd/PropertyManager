# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for mountain resort properties. It offers capabilities for booking coordination, custom pricing, advance payments, guest tracking, restaurant operations, and complete checkout with bill generation. The system integrates a robust financial module for tracking property lease agreements, lease payments, and expenses with auto-categorization. It generates detailed P&L reports per property, providing a unified platform for operational and financial management. The project aims to provide a modern SaaS solution with a mountain resort-inspired, mobile-first design system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI design system leverages **shadcn/ui**, **Tailwind CSS**, and **Radix UI** primitives, styled with a custom mountain-themed color palette, supporting light/dark modes and mobile-first responsiveness.

### Technical Implementations
The frontend uses **React 18** with **TypeScript** (Vite), **Wouter** for routing, and **TanStack Query** for server state. Forms are built with **React Hook Form** and **Zod** for validation. The backend is built with **Express.js** on **Node.js** using **TypeScript**, following a RESTful API design. **PostgreSQL** via Neon serverless is the primary database, accessed using **Drizzle ORM**. Authentication is handled by **Replit Auth** with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Supports managing multiple resort properties.
-   **Booking & Guest Management**: Comprehensive booking coordination, guest tracking, and advanced pricing options with booking source and meal plan tracking. Includes filter tabs (All, Active, Completed, Cancelled) with real-time badge counts.
-   **Group Bookings**: Tabbed booking interface allows creating group bookings for multiple rooms under a single guest name and contact. Features checkbox-based room selection table with summary showing total price per night across all selected rooms. All rooms automatically blocked for chosen dates.
-   **Dormitory Room Support**: New room category "Dormitory" allows defining bed count for backpacker/solo traveler accommodation. Price displayed per bed per night. Supports bed-based booking management.
-   **Booking Deletion**: Safe deletion with protection - prevents deletion of bookings with bills or food orders to maintain financial integrity.
-   **Payment & Communication System**: Tracks advance payment status, sends messages to guests via WhatsApp/SMS using templates, and logs all communications.
-   **Restaurant & Order Management**: Integrates restaurant operations, order tracking, menu item management, and food orders reporting with status-based kitchen views (Active/Pending/Completed tabs).
-   **Room-Specific QR Codes**: Generate unique QR codes per property and room for contactless room service ordering. Guests scan and room number is auto-filled.
-   **Public Menu Ordering**: Public menu page supports both room service (with auto-filled room from QR) and walk-in café orders without authentication.
-   **In-House Guest Café Orders**: Staff can mark café customers as "In-House Guest" to automatically link orders to their room bill via booking ID.
-   **Café Bill Merge System**: Guests place café orders with name/phone; at checkout, staff search and merge these bills to room bookings. Supports walk-in customers who later check in.
-   **Auto-Merge Order Billing**: Both room service and in-house café orders automatically merge into the guest's final checkout bill.
-   **Detailed Food Bill Breakdown**: Checkout dialog shows item-wise food order breakdown with quantities and prices.
-   **Guest Name Billing Display**: Billing section displays guest names instead of invoice numbers for better readability.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses with auto-categorization, and generates P&L reports.
-   **Active Bookings Dashboard**: Real-time monitoring of checked-in guests with quick checkout.
-   **Room Availability Calendar**: Visual calendar for room availability and occupancy.
-   **Bill Management**: Detailed bill viewing, generation, and professional printing.
-   **Booking Editing**: Allows modification of existing reservations.
-   **Guest ID Proof Upload**: Requires guest ID proof upload using Replit Object Storage for new bookings.
-   **Booking Analytics**: Provides analytics on total bookings, revenue, top booking sources, and meal plan distribution.
-   **User Management**: Admin users can assign roles, manage property assignments, and delete users with safety checks (prevents self-deletion and last-admin removal).
-   **Property Display**: Users with assigned properties see their property name displayed in the sidebar for easy identification.
-   **Enhanced Enquiries Management**: Complete enquiry lifecycle management with edit dialog (placeholder), cancel functionality with confirmation, no advance payment requirement for confirmation, and improved room display showing actual room numbers and types. Supports group enquiry schema with roomIds array and isGroupEnquiry flag.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies. Auto-creates users on first login as admin.
-   **Authorization**: Role-based (admin, manager, staff, kitchen) with property-specific assignments. Managers and kitchen users have property-scoped data access.
-   **Property Filtering**: 
    - **Managers & Kitchen**: Only see and manage data from their assigned property (properties list, rooms, dashboard stats, menu items, bookings, active bookings, analytics, revenue)
    - **Property Enforcement**: Cannot create/modify/delete resources outside their assigned property. All property and booking endpoints filtered by assigned property.
    - **Security**: Returns empty array if no property assigned. Rejects stale sessions (deleted users) with 403 error
    - **Admin & Staff**: Full access to all properties (unchanged)
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security**: HTTPS-only cookies, environment variable-secured session secrets, CSRF protection, least-privilege access control.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication and identity management.
-   **Neon Serverless PostgreSQL**: Primary database service.
-   **Authkey.io**: (Optional) For WhatsApp and SMS messaging to guests.

### Key NPM Packages
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `react-hook-form`, `zod`, `date-fns`.
-   **UI/Styling**: `@radix-ui/react-*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.

### Environment Configuration
-   **Required**: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`.
-   **Optional**: `ISSUER_URL`, `REPLIT_DOMAINS`, `NODE_ENV`.
-   **Optional (for messaging)**: `AUTHKEY_API_KEY`, `AUTHKEY_WHATSAPP_NUMBER`.