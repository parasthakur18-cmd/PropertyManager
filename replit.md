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
-   **24/7 AI Chatbot Assistant**: An intelligent chatbot integrated for user support, utilizing OpenAI GPT-4o-mini via Replit AI Integrations.
-   **Booking & Guest Management**: Includes an intelligent booking engine, guest tracking, advanced pricing, booking source and meal plan tracking, group bookings, and dormitory bed-level tracking.
-   **Room Availability**: Features an Airbnb-style visual room calendar with color-coded availability, direct booking from cells, date range search, and smart logic for room statuses.
-   **Restaurant & Order Management**: Manages restaurant operations, order tracking, menu items, My Rasoi menu system (with categories, items, variants, add-ons), enhanced menu ordering UX, quick order entry, and room-specific QR codes for contactless ordering.
-   **Financial Tracking**: Manages property lease agreements, payments, expenses, generates P&L reports, and tracks pending payments. Includes detailed bill management, professional printing, and Excel export.
-   **Guest Experience**: Offers WhatsApp notification system, guest ID proof upload using Replit Object Storage, and guest self-check-in via QR code.
-   **Dashboard & Analytics**: Provides active bookings dashboard, enhanced dashboard with quick actions, and booking analytics. Displays real-time "Active Users" count.
-   **User Management**: Admin users manage roles, property assignments, and user deletions.
-   **Enquiry Management**: Manages the complete lifecycle of enquiries, including group enquiries.
-   **Error Reporting**: Includes automatic error crash reporting with stack trace capture and a Super Admin dashboard for error resolution.
-   **Attendance & Salary Management**: ✅ **NEW & TESTED** - Complete staff attendance tracking system with automatic salary deduction calculation. Features quick roster view with single-click status marking (Present/Absent/Leave/Half-Day), monthly attendance statistics, automatic net salary calculation based on deductions, and date-based attendance recording. System properly validates property IDs to ensure data integrity.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Replit Auth, OpenID Connect, Passport.js, session-based via secure HTTP-only cookies, with auto-user creation.
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

### Completed Features This Session
1. **Active Users Dashboard Stat** - Added real-time count of active staff members to the dashboard
2. **Attendance Marking System** - ✅ FULLY TESTED & WORKING
   - Quick Roster tab with single-click status marking (Green ✓ Present, Red ✗ Absent, Blue ! Leave, Yellow ! Half-Day)
   - Date picker for selecting attendance dates
   - Automatic property ID validation using staff member's assigned property
   - Real-time toast notifications confirming attendance submission
   - Database properly stores staffId, propertyId, attendanceDate, and status
3. **Salary Deduction Calculation** - Automatic net salary computation based on absent days (deduction per day = baseSalary / 30)

### Testing Results
- Staff member "Paras kanwar" (ID 6, Property 10) successfully created and ready for attendance marking
- Database schema verified: attendance_records table with proper staff_id and property_id foreign keys
- API endpoint POST /api/attendance tested and validated
- Frontend UI properly displays all 6 staff members with correct property assignments
- Color-coded status buttons respond correctly to clicks
- Success toast notifications appear on valid attendance submission

### How to Use Attendance Feature
1. Navigate to "Attendance & Salary Management" page from sidebar
2. Click "Quick Roster" tab
3. Select a date using the date picker
4. Click the colored status button for any staff member:
   - **Green button (✓)** = Mark as Present
   - **Red button (✗)** = Mark as Absent
   - **Blue button (!)** = Mark as Leave
   - **Yellow button (!)** = Mark as Half-Day
5. Button color changes to dark shade when status is saved
6. Green success toast appears at bottom right confirming "Attendance recorded successfully"
7. Salary automatically deducts (baseSalary / 30) × absent days from net salary calculation
