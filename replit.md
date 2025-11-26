# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system for hotels, resorts, and accommodations. Built natively on Replit, it offers instant deployment and eliminates DevOps complexity. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management. Its primary goal is to be the easiest PMS globally to deploy and operate, aiming to capture significant market share.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI uses shadcn/ui, Tailwind CSS, and Radix UI primitives, featuring a custom mountain-themed color palette, light/dark modes, and mobile-first responsiveness. Premium landing and login pages include animated gradients. Mobile optimization provides responsive room calendar columns and stacked tab layouts.

### Technical Implementations
The frontend uses React 18, TypeScript (Vite), Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The backend is Express.js on Node.js with TypeScript, following a RESTful API design. PostgreSQL via Neon serverless is the primary database, accessed with Drizzle ORM. Authentication uses Replit Auth with OpenID Connect (OIDC) via Passport.js and session-based, secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Manages multiple resort properties.
-   **24/7 AI Chatbot Assistant**: OpenAI GPT-4o-mini via Replit AI for user support on landing page and within the app.
-   **Booking & Guest Management**: Intelligent booking engine, guest tracking, advanced pricing, booking source, meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Airbnb-style visual room calendar with color-coded availability, direct booking, date range search, and smart room status logic.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, My Rasoi menu system (categories, items, variants, add-ons), enhanced ordering UX, quick order entry, and room-specific QR codes.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, P&L reports, pending payments, detailed bill management, professional printing, and Excel export.
-   **Guest Experience**: WhatsApp notification system, guest ID proof upload (Replit Object Storage), and guest self-check-in via QR code.
-   **Dashboard & Analytics**: Active bookings dashboard, quick actions, booking analytics, real-time "Active Users" count, and real-time RazorPay payment notifications.
-   **User Management**: Admin users manage roles, property assignments, and deletions.
-   **Enquiry Management**: Manages the complete lifecycle of individual and group enquiries.
-   **Error Reporting**: Automatic crash reporting with stack trace capture and a Super Admin dashboard for error resolution.
-   **Attendance & Salary Management**: Staff attendance tracking, automatic salary calculation with intelligent deductions based on employment dates, monthly summaries, and salary editing.
-   **Super Admin Portal**: System-wide management dashboard with user management, property monitoring, issue tracking, contact leads, and error reporting.
-   **RazorPay Payment Link Integration**: Direct payment collection via WhatsApp, automatic payment confirmation via webhook, bill status auto-update to PAID, and customer WhatsApp confirmation.
-   **Split Payment System**: Simplified payment collection with single cash input, auto-calculated remaining balance, and one-click payment link generation for the remaining amount.
-   **Dashboard Payment Notifications**: Real-time notifications displaying customer name and amount paid when payments complete via RazorPay webhook, polling every 5 seconds.

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