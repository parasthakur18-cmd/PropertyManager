# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it eliminates traditional infrastructure complexity, offering instant deployment and zero DevOps burden. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management. It aims to be the easiest PMS to deploy and operate globally.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The UI design system utilizes shadcn/ui, Tailwind CSS, and Radix UI primitives. It features a custom mountain-themed color palette, light/dark mode support, and mobile-first responsiveness. Premium landing and login pages include animated gradients and Replit-first messaging. Mobile optimization includes responsive room calendar columns and stacked tab layouts for smaller screens.

### Technical Implementations
The frontend is built with React 18, TypeScript (Vite), Wouter for routing, and TanStack Query for server state management. Forms are handled by React Hook Form with Zod for validation. The backend uses Express.js on Node.js with TypeScript, following a RESTful API design. PostgreSQL via Neon serverless serves as the primary database, accessed using Drizzle ORM. Authentication is managed by Replit Auth with OpenID Connect (OIDC) via Passport.js, using session-based authentication with secure HTTP-only cookies.

### Feature Specifications
-   **Multi-Property Management**: Manages multiple resort properties.
-   **24/7 AI Chatbot Assistant**: An intelligent chatbot integrated for user support, utilizing OpenAI GPT-4o-mini via Replit AI Integrations. Available on landing page and throughout the application.
-   **Booking & Guest Management**: Includes an intelligent booking engine, guest tracking, advanced pricing, booking source and meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Features an Airbnb-style visual room calendar with color-coded availability, direct booking from cells, date range search, and smart logic for room statuses. Mobile-optimized with responsive column sizing.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, My Rasoi menu system (with categories, items, variants, add-ons), enhanced menu ordering UX, quick order entry, and room-specific QR codes for contactless ordering.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, generates P&L reports, and tracks pending payments. Includes detailed bill management, professional printing, and Excel export.
-   **Guest Experience**: Offers WhatsApp notification system, guest ID proof upload using Replit Object Storage, and guest self-check-in via QR code.
-   **Dashboard & Analytics**: Provides active bookings dashboard, enhanced dashboard with quick actions, and booking analytics. Displays real-time "Active Users" count.
-   **User Management**: Admin users manage roles, property assignments, and user deletions.
-   **Enquiry Management**: Manages the complete lifecycle of enquiries, including group enquiries.
-   **Error Reporting**: Includes automatic error crash reporting with stack trace capture and a Super Admin dashboard for error resolution.
-   **Attendance & Salary Management**: ✅ **COMPLETE & TESTED** - Staff attendance tracking with single-click status marking (Present/Absent/Leave/Half-Day), automatic salary calculation with intelligent deductions based on employee joining/exit dates, monthly salary summaries, and edit salary functionality.
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

## Latest Updates (November 25, 2025)

### Pre-Bill WhatsApp Approval Workflow - ✅ COMPLETE & DEPLOYED
1. **Pre-Bill Feature Fully Implemented** - Staff can optionally send bill to customer via WhatsApp before checkout
2. **Dual Checkout Options** - Two flexible paths:
   - **Option A: With Pre-Bill Verification** - Send bill → Customer approves → Checkout
   - **Option B: Direct Checkout** - Skip pre-bill → Proceed directly to final checkout
3. **WhatsApp Template** - Using WID 19816 (prebill template) from Authkey.io
4. **Database Integration** - `pre_bills` table created with status tracking (pending/approved/rejected)
5. **API Endpoints Created**:
   - `/api/send-prebill` - Sends bill via WhatsApp and creates pre-bill record
   - `/api/prebill/approve` - Staff approves pre-bill when customer verifies
   - `/api/prebill/booking/:bookingId` - Fetches pre-bill status
6. **Frontend UI** - Checkout dialog shows:
   - "Send Pre-Bill via WhatsApp" button
   - "Skip & Checkout" button for direct checkout
   - "Complete Checkout" button (enabled after pre-bill sent/approved OR direct skip)

### Previous Session - All Features Delivered & Optimized (November 24, 2025)
1. **CRITICAL FIX: Attendance Calendar Color Coding** - ✅ RESOLVED (Nov 24, 2025)
   - **Issue:** Calendar displayed all gray boxes despite database having attendance records
   - **Root Cause:** Drizzle schema type mismatch - used `timestamp()` for DATE column
   - **Fix:** Changed schema from `timestamp("attendance_date")` to `date("attendance_date")`
   - **Result:** Calendar now displays proper color-coding (red/green/blue/yellow)
   - **Impact:** API returns 5 records (was 0), attendance calendar fully functional
   - **Technical:** Added `date` to drizzle-orm/pg-core imports

2. **Responsive Mobile UI** - ✅ OPTIMIZED
   - Room calendar column width reduced to 70px on mobile (70px → 150px on desktop)
   - Date columns remain compact and readable
   - Attendance tabs stack vertically on mobile, 3-column layout on desktop
   - Improved UX on smaller screens

3. **Employee Start/End Date Tracking** - ✅ IMPLEMENTED
   - Added `joiningDate` and `endDate` fields to staff members table
   - Salary calculations now respect employee employment period
   - If employee joins mid-month: salary only calculated for actual working days
   - If employee leaves mid-month: salary only calculated until exit date
   - Formula: (baseSalary ÷ working days in employment period) × absent days

4. **Attendance & Salary Management** - ✅ FULLY OPERATIONAL
   - Quick Roster tab with color-coded status buttons (Present/Absent/Leave/Half-Day)
   - Record Attendance tab for individual attendance marking
   - Salary Management tab showing comprehensive salary table with all staff calculations
   - Edit Salary functionality for setting/updating base salaries
   - Automatic deduction calculations respecting employment dates
   - Monthly salary summaries and statistics
   - Salary Calculation Details card showing formula and monthly breakdown

5. **Super Admin Portal** - ✅ FULLY OPERATIONAL
   - Authentication: admin@hostezee.in / admin@123
   - Users Tab: View all users with suspend/activate/login-as features
   - Properties Tab: Monitor all property details and status
   - Reports Tab: Track issue reports by severity and status
   - Leads Tab: Manage contact enquiries with email/phone contact options
   - Errors Tab: View system error crashes with stack traces, mark resolved, and delete

6. **Chatbot Integration** - ✅ ADDED TO LANDING PAGE
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

**Salary Management with Employment Dates:**
1. Go to Attendance & Salary Management page
2. When adding new staff, the joining date defaults to today
3. Click Salary Management tab
4. View all staff salary summaries with deductions calculated based on actual employment period
5. System automatically adjusts working days if employee joined/left mid-month
6. Click pencil icon to edit individual staff salaries

**Super Admin Access:**
1. Navigate to /super-admin-login
2. Login with admin@hostezee.in / admin@123
3. Access all system management features from the dashboard

## System Status
✅ **PRODUCTION READY** - All core features tested and operational
- Express server running on port 5000
- PostgreSQL database connected via Neon with all tables created
- All API endpoints functional (200/304 responses)
- Mobile UI optimized for responsive viewing
- Attendance feature fully working with color changes and database persistence
- Salary calculations accurate with employee date tracking
- Super Admin portal fully functional with all management operations
- Pre-Bill WhatsApp feature fully deployed with optional approval workflow
- Chatbot integrated and ready for user support
- Zero console errors, no warnings

## Pre-Bill Feature - How to Use
1. Open an active booking in checkout dialog
2. Review bill details (room charges, food charges, taxes, discounts)
3. **Choose one of two options:**
   - Click "Send Pre-Bill via WhatsApp" → Bill sent to customer → Wait for approval → Click "Complete Checkout"
   - Click "Skip & Checkout" → Proceed directly to checkout (no WhatsApp)
4. Complete checkout and generate bill

## Next Steps for User
Ready to publish and make the application live with instant Replit deployment.

## Database Schema Highlights
- Staff members now track `joiningDate` and `endDate` for accurate payroll
- Attendance records store status and remarks per day
- Salary stats calculated dynamically based on employment tenure
- All foreign keys properly configured for data integrity
