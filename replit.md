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