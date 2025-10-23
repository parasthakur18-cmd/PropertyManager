# Hostezee Property Management System

## Overview

A comprehensive property management system designed for mountain resort properties. The platform enables multi-property management, booking coordination with custom pricing and advance payments, guest tracking, restaurant operations, complete checkout functionality with bill generation, and complete financial tracking from a unified interface. The financial module tracks property lease agreements with automatic balance calculation, records lease payments, manages property expenses with customizable categories and keyword-based auto-categorization, and generates detailed P&L reports showing income, expenses, and profit/loss per property. Built with a modern SaaS architecture, it features a mountain resort-inspired design system with mobile-first responsiveness.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack**
- **React 18** with TypeScript for type-safe UI development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching
- **React Hook Form** with Zod validation for form handling

**UI Design System**
- **shadcn/ui** component library with custom theming
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Radix UI** primitives for accessible, unstyled components
- **CVA (Class Variance Authority)** for component variant management

**Design Approach**
- Implements a design system inspired by modern SaaS dashboards (Linear, Notion)
- Custom color palette featuring mountain-themed colors (Mountain Teal, Sky Blue, Deep Forest)
- Semantic color coding for room/booking statuses (Available, Occupied, Maintenance, Cleaning)
- Light and dark mode support with theme persistence
- Responsive sidebar navigation with collapsible states
- Font stack: Inter (primary), Poppins (headings), JetBrains Mono (data/numbers)

**State Management Pattern**
- Server state: TanStack Query with infinite stale time and disabled refetching
- Client state: React Context for theme and authentication
- Form state: React Hook Form with Zod schema validation
- Session state: Server-managed via express-session with PostgreSQL store

### Backend Architecture

**Server Framework**
- **Express.js** on Node.js with ESM modules
- **TypeScript** throughout for type safety
- RESTful API design pattern at `/api/*` endpoints

**API Structure**
- Authentication routes: `/api/auth/*` (login, user profile)
- User management routes: `/api/users` (GET all users, PATCH role updates) - admin only
- Resource CRUD routes: `/api/{properties|rooms|bookings|guests|orders|bills|leases|expenses}`
- Checkout route: `/api/bookings/checkout` (POST) - Server-side bill calculation and checkout processing
- Expense category routes: `/api/expense-categories` (GET all, POST create, PATCH update, DELETE) with default category seeding on startup
- Financial routes: `/api/leases/:id/payments`, `/api/financials/:propertyId`
- Aggregated data routes: `/api/dashboard/stats`, `/api/analytics`
- Status update routes: `/api/orders/:id/status` for workflow management

**Request/Response Handling**
- JSON body parsing with raw buffer capture (for potential webhook verification)
- URL-encoded form data support
- Custom request logging middleware for API routes (truncated at 80 chars)
- Error responses with status codes and descriptive messages

**Development Workflow**
- Hot module replacement in development via Vite middleware mode
- Production builds combine client (Vite) and server (esbuild) bundles
- Separate development (`tsx server/index.ts`) and production (`node dist/index.js`) entry points

### Data Storage

**Database**
- **PostgreSQL** via Neon serverless with WebSocket support
- **Drizzle ORM** for type-safe database queries and migrations
- Connection pooling via `@neondatabase/serverless`

**Schema Design**
- **Users**: Authentication profiles with role-based access (admin, manager, staff, kitchen)
- **Properties**: Multi-property support with location and contact details
- **Rooms**: Room inventory with status tracking, pricing, and amenities
- **Guests**: Guest profiles with stay history and preferences
- **Bookings**: Reservation management with check-in/out tracking and status workflow
- **Menu Items**: Restaurant catalog with pricing and availability
- **Orders**: Food order tracking with kitchen workflow statuses
- **Bills**: Invoicing and payment status tracking
- **Extra Services**: Additional billable services beyond room and food
- **Property Leases**: Lease agreements with landlord details, total amount, start/end dates, payment frequency
- **Lease Payments**: Individual lease payment records with amount, date, and method
- **Property Expenses**: Operating expense tracking with categoryId reference, amount, date, and property association
- **Expense Categories**: Customizable expense categories with keyword arrays for auto-categorization, property-specific or default categories
- **Bank Transactions**: Scaffolded for future bank statement import (uploadId, rawDescription, auto-categorization support)

**Data Relationships**
- Properties → Rooms (one-to-many)
- Properties → Leases (one-to-many)
- Properties → Expenses (one-to-many)
- Properties → Expense Categories (one-to-many, optional property-specific categories)
- Expense Categories → Expenses (one-to-many)
- Leases → Payments (one-to-many)
- Guests → Bookings (one-to-many)
- Rooms → Bookings (one-to-many)
- Bookings → Bills (one-to-one)
- Orders linked to bookings/guests for consolidated billing

**Validation Strategy**
- Drizzle Zod integration generates insert schemas from table definitions
- Client-side validation via React Hook Form + Zod resolvers
- Server-side validation using the same Zod schemas (shared via `@shared/schema`)
- Date coercion via `z.coerce.date()` for timestamp fields in leases, payments, and expenses
- Backend validates all financial data with Zod schemas before database insertion

### Authentication & Authorization

**Authentication Provider**
- **Replit Auth** with OpenID Connect (OIDC)
- Passport.js strategy integration
- Session-based authentication with secure HTTP-only cookies

**Session Management**
- PostgreSQL-backed sessions via `connect-pg-simple`
- 7-day session TTL with secure cookie configuration
- Session table separate from application data

**Authorization Levels**
- Role-based access control (admin, manager, staff, kitchen)
- **Admin**: Full system access including user management
- **Manager**: Operations, billing, reporting, and property management
- **Staff**: Basic access to rooms, bookings, and kitchen
- **Kitchen**: Kitchen order management only
- Property-specific staff assignments (`assignedPropertyId`)
- Route protection via `isAuthenticated` middleware
- UI adapts navigation based on user role
- User Management page (admin-only) for role assignment and property allocation

**Security Measures**
- HTTPS-only cookies in production
- Session secret via environment variable
- CSRF protection via session-based tokens
- Restricted file system access in development

## External Dependencies

### Third-Party Services

**Authentication**
- **Replit Auth OIDC** - User authentication and identity management
- Discovery endpoint: `process.env.ISSUER_URL` (defaults to replit.com/oidc)

**Database**
- **Neon Serverless PostgreSQL** - Primary data store
- Connection string via `process.env.DATABASE_URL`
- WebSocket support for serverless environments

**Development Tools**
- **Replit Vite Plugins** - Runtime error overlay, cartographer, dev banner
- Conditional loading based on `REPL_ID` environment variable

### Key NPM Packages

**Core Dependencies**
- `express` - Web server framework
- `drizzle-orm` - Type-safe ORM
- `@neondatabase/serverless` - PostgreSQL client
- `react` + `react-dom` - UI framework
- `@tanstack/react-query` - Server state management
- `wouter` - Client-side routing

**UI Component Libraries**
- `@radix-ui/react-*` - 25+ accessible component primitives
- `tailwindcss` - Utility-first CSS
- `class-variance-authority` - Component variant management
- `lucide-react` - Icon library

**Form & Validation**
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod integration
- `drizzle-zod` - Schema generation from Drizzle tables

**Date Handling**
- `date-fns` - Date formatting and manipulation

**Build Tools**
- `vite` - Frontend build tool and dev server
- `esbuild` - Backend bundler
- `typescript` - Type checking
- `tsx` - TypeScript execution for development

**Session & Auth**
- `express-session` - Session middleware
- `connect-pg-simple` - PostgreSQL session store
- `passport` - Authentication middleware
- `openid-client` - OIDC client implementation
- `memoizee` - OIDC config caching

### Environment Configuration

**Required Variables**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit workspace identifier
- `ISSUER_URL` - OIDC provider URL (optional, defaults provided)
- `REPLIT_DOMAINS` - Allowed domains for OIDC redirect

**Optional Variables**
- `NODE_ENV` - Environment mode (development/production)