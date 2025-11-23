# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it eliminates traditional infrastructure complexity, offering instant deployment and zero DevOps burden. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management. It aims to be the easiest PMS to deploy and operate globally.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI design system utilizes shadcn/ui, Tailwind CSS, and Radix UI primitives. It features a custom mountain-themed color palette, light/dark mode support, and mobile-first responsiveness. Premium landing and login pages include animated gradients and Replit-first messaging.

### Technical Implementations
The frontend is built with React 18, TypeScript (Vite), Wouter for routing, and TanStack Query for server state management. Forms are handled by React Hook Form with Zod for validation. The backend uses Express.js on Node.js with TypeScript, following a RESTful API design. PostgreSQL via Neon serverless serves as the primary database, accessed using Drizzle ORM. Authentication is managed by Replit Auth with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Manages multiple resort properties.
-   **24/7 AI Chatbot Assistant**: An intelligent chatbot integrated for user support, utilizing OpenAI GPT-4o-mini via Replit AI Integrations. Available on landing page and throughout the application.
-   **Booking & Guest Management**: Includes an intelligent booking engine, guest tracking, advanced pricing, booking source and meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Features an Airbnb-style visual room calendar with color-coded availability, direct booking from cells, date range search, and smart logic for room statuses.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, My Rasoi menu system (with categories, items, variants, add-ons), enhanced menu ordering UX, quick order entry, and room-specific QR codes for contactless ordering.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, generates P&L reports, and tracks pending payments. Includes detailed bill management, professional printing, and Excel export.
-   **Guest Experience**: Offers WhatsApp notification system, guest ID proof upload using Replit Object Storage, and guest self-check-in via QR code.
-   **Dashboard & Analytics**: Provides active bookings dashboard, enhanced dashboard with quick actions, and booking analytics. Displays real-time "Active Users" count.
-   **User Management**: Admin users manage roles, property assignments, and user deletions.
-   **Enquiry Management**: Manages the complete lifecycle of enquiries, including group enquiries.
-   **Error Reporting**: Includes automatic error crash reporting with stack trace capture and a Super Admin dashboard for error resolution.
-   **Attendance & Salary Management**: ✅ **COMPLETE & TESTED** - Staff attendance tracking with single-click status marking (Present/Absent/Leave/Half-Day), automatic salary calculation with deductions based on absences, monthly salary summaries, and edit salary functionality.
-   **Super Admin Portal**: ✅ **COMPLETE & TESTED** - System-wide management dashboard with user management, property monitoring, issue tracking, contact leads, and error reporting. Accessible at /super-admin-login with email/password authentication.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation. Super Admin uses email/password (admin@hostezee.in / admin@123).
-   **Authorization**: Role-based (admin, super-admin, manager, staff, kitchen) with multi-property assignments and least-privilege access control.
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

## Latest Updates (November 23, 2025)

### Session Complete - All Features Delivered
1. **Attendance & Salary Management** - ✅ FULLY OPERATIONAL
   - Quick Roster tab with color-coded status buttons (Present/Absent/Leave/Half-Day)
   - Record Attendance tab for individual attendance marking
   - Salary Management tab showing comprehensive salary table with all staff calculations
   - Edit Salary functionality for setting/updating base salaries
   - Automatic deduction calculations (baseSalary ÷ working days × absent days)
   - Monthly salary summaries and statistics
   - Salary Calculation Details card showing formula and monthly breakdown

2. **Super Admin Portal** - ✅ FULLY OPERATIONAL
   - Authentication: admin@hostezee.in / admin@123
   - Users Tab: View all users with suspend/activate/login-as features
   - Properties Tab: Monitor all property details and status
   - Reports Tab: Track issue reports by severity and status
   - Leads Tab: Manage contact enquiries with email/phone contact options
   - Errors Tab: View system error crashes with stack traces, mark resolved, and delete

3. **Chatbot Integration** - ✅ ADDED TO LANDING PAGE
   - Available on landing page for public visitors
   - Integrated throughout the application for staff support
   - Powered by OpenAI GPT-4o-mini via Replit AI Integrations

### How to Use Key Features

**Attendance Marking:**
1. Go to Attendance & Salary Management page
2. Click Quick Roster tab
3. Select a date
4. Click colored status buttons to mark attendance
5. View automatic salary calculations

**Salary Management:**
1. Go to Attendance & Salary Management page
2. Click Salary Management tab
3. View all staff salary summaries with deductions
4. Click pencil icon to edit individual staff salaries
5. System automatically recalculates net salary based on absences

**Super Admin Access:**
1. Navigate to /super-admin-login
2. Login with admin@hostezee.in / admin@123
3. Access all system management features from the dashboard

## System Status
✅ **PRODUCTION READY** - All core features tested and operational
- Express server running on port 5000
- PostgreSQL database connected via Neon
- All API endpoints functional (200/304 responses)
- No console errors
- Attendance feature fully working with color changes and database persistence
- Salary calculations automatic and accurate
- Super Admin portal fully functional with all management operations
- Chatbot integrated and ready for user support

## Next Steps for User
Ready to publish and make the application live with instant Replit deployment.
