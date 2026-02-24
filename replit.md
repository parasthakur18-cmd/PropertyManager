# Hostezee Property Management System (PMS)

## Overview

Hostezee is a full-stack, multi-tenant property management system for hotels, homestays, and resorts. It offers end-to-end management for bookings, guests, billing, expenses, staff/salary, tasks, restaurant/food ordering, and operational dashboards. The system supports multiple properties per owner, role-based access control, and integrations with payment gateways, messaging, channel managers, and object storage. It is designed to run on Replit or self-hosted environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a monorepo structure:
- `client/`: React 18 SPA (Vite, Tailwind CSS, shadcn/ui)
- `server/`: Express API server (Node.js 20+, TypeScript)
- `shared/`: Drizzle ORM schema definitions for type safety
- `migrations/`: Drizzle Kit migration output

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State/Data Fetching**: TanStack React Query
- **UI Components**: shadcn/ui (New York style) based on Radix UI with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit
- **Theming**: Custom ThemeProvider (light/dark mode)
- **File Uploads**: Uppy with S3 plugin
- **Real-time**: Server-Sent Events (SSE)

### Backend Architecture
- **Runtime**: Node.js 20+ with ESM, TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ via Drizzle ORM, with automatic driver selection for Neon or standard `pg`.
- **Sessions**: `express-session` with `connect-pg-simple`
- **Authentication**: Dual system supporting Replit OIDC or email/password with bcrypt, plus Google OAuth.
- **Multi-tenancy**: Tenant isolation via `assignedPropertyIds` and property access guards.
- **Event System**: In-process EventBus for domain events (e.g., audit logging, SSE broadcasts).
- **Audit Logging**: Automatic audit trail.
- **Schema Validation**: Startup validation and auto-creation of optional tables.

### Database Schema
The schema covers comprehensive PMS functionalities including `users`, `properties`, `rooms`, `bookings`, `guests`, `bookingGuests`, `bills`, `orders`, `expenses`, `wallets`, `staffMembers`, `salary`, `leases`, `vendors`, `attendanceRecords`, `messageTemplates`, `communications`, `enquiries`, `travelAgents`, `notifications`, `featureSettings`, `auditLogs`, and `otaIntegrations`.

The `bookingGuests` table stores multiple guest ID proofs per booking with front/back images. It has: `bookingId`, `guestName`, `phone`, `email`, `idProofType`, `idProofNumber`, `idProofFront`, `idProofBack`, `isPrimary`.

### Key Design Patterns
- **Shared schema**: Single source of truth for DB schema.
- **Insert schemas**: Zod schemas for request validation.
- **Storage abstraction**: Data access layer over Drizzle.
- **Conditional drivers**: Automatic database driver selection.
- **Environment-based auth**: Dynamic authentication strategy.
- **Tenant Data Isolation**: Implemented `getAuthenticatedTenant` and property access checks across all endpoints to prevent cross-tenant data leakage.

## External Dependencies

### Database
- **PostgreSQL 14+**
- **Neon Serverless** (`@neondatabase/serverless`)

### Payment Gateway
- **Razorpay**

### Messaging & Communications
- **Authkey.io** (WhatsApp Business API, SMS)
- **AgentMail** (Email service via Replit Connector)

### Channel Manager
- **Beds24**
- **AioSell** (for inventory, rates, restrictions, and webhook-based reservation sync)

### Object/File Storage
- **Replit Object Storage** (Google Cloud Storage-based)
- **MinIO** (S3-compatible self-hosted storage)

### Authentication Providers
- **Replit OIDC**
- **Google OAuth 2.0** (via `passport-google-oauth20`)
- **Local auth** (bcrypt)

### Frontend Libraries
- **Recharts**
- **QRCode**
- **date-fns**
- **Uppy**

### Deployment
- **GitHub Actions**
- **esbuild**
- **Vite**