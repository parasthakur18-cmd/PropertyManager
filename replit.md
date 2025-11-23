# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it eliminates traditional infrastructure complexity, offering instant deployment and zero DevOps burden. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, and complete checkout with bill generation. It aims to be the easiest PMS to deploy and operate globally.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI design system utilizes shadcn/ui, Tailwind CSS, and Radix UI primitives. It features a custom mountain-themed color palette, light/dark mode support, and mobile-first responsiveness. Premium landing and login pages include animated gradients and Replit-first messaging.

### Technical Implementations
The frontend is built with React 18, TypeScript (Vite), Wouter for routing, and TanStack Query for server state management. Forms are handled by React Hook Form with Zod for validation. The backend uses Express.js on Node.js with TypeScript, following a RESTful API design. PostgreSQL via Neon serverless serves as the primary database, accessed using Drizzle ORM. Authentication is managed by Replit Auth with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Manages multiple resort properties.
-   **24/7 AI Chatbot Assistant**: An intelligent chatbot integrated for user support, utilizing OpenAI GPT-4o-mini via Replit AI Integrations.
-   **Booking & Guest Management**: Includes an intelligent booking engine, guest tracking, advanced pricing, booking source and meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Features an Airbnb-style visual room calendar with color-coded availability, direct booking from cells, date range search, and smart logic for room statuses (e.g., cleaning status blocks rooms only for the current day).
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, My Rasoi menu system (with categories, items, variants, add-ons), enhanced menu ordering UX, quick order entry, and room-specific QR codes for contactless ordering. Supports public menu ordering and in-house guest café orders.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, generates P&L reports, and tracks pending payments. Includes detailed bill management, professional printing, and Excel export for financial data.
-   **Guest Experience**: Offers WhatsApp notification system, guest ID proof upload using Replit Object Storage, and guest self-check-in via QR code.
-   **Dashboard & Analytics**: Provides an active bookings dashboard, enhanced dashboard with quick actions, and booking analytics.
-   **User Management**: Admin users manage roles, property assignments, and user deletions.
-   **Enquiry Management**: Manages the complete lifecycle of enquiries, including group enquiries.
-   **Error Reporting**: Includes automatic error crash reporting with stack trace capture and a Super Admin dashboard for error resolution.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation.
-   **Authorization**: Role-based (admin, super-admin, manager, staff, kitchen) with multi-property assignments and least-privilege access control. Managers have view-only access to specific financial data.
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security**: HTTPS-only cookies, environment variable-secured session secrets, and CSRF protection.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication.
-   **Neon Serverless PostgreSQL**: Primary database.
-   **Authkey.io**: (Optional) For WhatsApp and SMS messaging.
-   **OpenAI GPT-4o-mini**: Integrated via Replit AI for the chatbot assistant.

### Key NPM Packages
-   **Backend**: `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
-   **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `wouter`, `react-hook-form`, `zod`, `date-fns`.
-   **UI/Styling**: `@radix-ui/react-*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.