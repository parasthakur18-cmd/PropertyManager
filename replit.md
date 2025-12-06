# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it offers instant deployment and aims to be the easiest PMS globally to operate, targeting significant market share. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management.

## Recent Updates
- **December 6, 2025**: Integrated Agent Mail email service for transactional emails (bookings, payments, password resets, expense notifications, vendor payments). Database schema verified with all accounting tables (vendors, expenses, leases) now synced.
- **December 5, 2025**: Fixed property visibility issue - admin users now automatically get assigned to all properties on login. Mobile vendor form now scrollable for all screen sizes.

## User Preferences
Preferred communication style: Simple, everyday language. Wants showcase of all features on website with pricing comparison and app screenshots.

## System Architecture

### UI/UX Decisions
The UI leverages shadcn/ui, Tailwind CSS, and Radix UI primitives, featuring a custom mountain-themed color palette, light/dark modes, and mobile-first responsiveness. It includes premium landing and login pages with animated gradients, and mobile optimization for components like the room calendar and stacked tab layouts.

### Technical Implementations
The frontend is built with React 18, TypeScript (Vite), Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for validation. The backend uses Express.js on Node.js with TypeScript, adhering to a RESTful API design. PostgreSQL via Neon serverless is the primary database, managed with Drizzle ORM. Authentication is handled by Replit Auth with OpenID Connect (OIDC) via Passport.js, utilizing session-based, secure HTTP-only cookies.

### Feature Specifications

#### Core Management
-   **Multi-Property Management**: Supports unlimited resort properties.
-   **Booking & Guest Management**: Intelligent booking engine, guest tracking, advanced pricing, booking source, meal plan tracking, group bookings, and dormitory bed-level tracking. Includes an Airbnb-style visual room calendar with color-coded availability and direct booking.
-   **User & Enquiry Management**: Manages user roles, property assignments, and deletions with role-based access control. Handles the full lifecycle of individual and group enquiries.

#### AI & Intelligent Features
-   **AI-Powered Smart Notifications**: Intelligent notification system with 3-hour smart reminders for pending tasks (cleaning, payments, orders) and auto-dismissal. Includes task-specific intelligence and customizable intervals.
-   **Employee Performance Dashboard**: Tracks staff performance with individual, team-wide, and scoring metrics.
-   **24/7 AI Chatbot Assistant**: Provides user support via OpenAI GPT-4o-mini (Replit AI) on the landing page and within the app.

#### Restaurant & Operations
-   **Restaurant & Order Management**: Comprehensive kitchen management, QR ordering, menu system, quick order entry, real-time tracking, and room-specific QR codes.
-   **WhatsApp Food Order Alerts**: Real-time WhatsApp notifications for new food orders.

#### Financial Management
-   **Financial Tracking**: Manages property leases, payments, expenses, P&L reports, pending payments, detailed bill management, and Excel export.
-   **Email Notifications**: Transactional emails for bookings, payment confirmations, expense tracking, and vendor payment alerts via Agent Mail.
-   **RazorPay Payment Link Integration**: Facilitates direct payment collection via WhatsApp, with automatic payment confirmation and bill status updates.
-   **Split Payment System**: Simplifies payment collection with single cash input and one-click payment link generation for remaining balances.
-   **Dashboard Payment Notifications**: Real-time notifications for completed RazorPay payments.

#### Staff Management
-   **Attendance & Salary Management**: Tracks staff attendance, automates salary calculation with intelligent deductions, and allows for salary editing.
-   **Performance Tracking**: Integrates performance scores into salary calculations.

#### Advanced Controls
-   **Feature Settings Control Panel**: Provides 10 toggleable features for administrators, including notification types, auto-checkout, and performance analytics.
-   **OTA Integrations**: Supports multi-platform booking synchronization with 8 OTA platforms (e.g., Booking.com, Airbnb, OYO), including credential management, manual sync, and error tracking.

#### Analytics & Reporting
-   **Dashboard & Analytics**: Offers active bookings dashboard, quick actions, booking analytics, real-time "Active Users" count, occupancy tracking, and revenue reports.
-   **Super Admin Portal**: System-wide management dashboard for user management, property monitoring, issue tracking, and error reporting.

#### Guest Experience
-   **Guest Experience**: Includes WhatsApp notifications, guest ID proof upload (Replit Object Storage), guest self-check-in via QR, and WhatsApp payment links.

#### Security & Compliance
-   **Error Reporting**: Automatic crash reporting with stack trace capture.
-   **Enterprise Security**: ISO 27001 compliance, end-to-end encryption, SOC 2 certification, and role-based access control.

### System Design Choices
-   **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Express.js, Node.js, TypeScript, RESTful API.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Multi-method authentication supporting:
    - **Google OAuth**: Replit Auth with OpenID Connect via Passport.js
    - **Email/Password**: Local authentication with bcrypt password hashing
    - **Mobile OTP**: WhatsApp-based OTP login via Authkey.io (5-minute expiry, 60-second rate limit)
-   **User Verification**: Super Admin approval workflow with pending/verified/rejected status. New users default to 'pending' and require approval before access.
-   **Tenant Isolation**: Property-based data filtering on core routes (properties, rooms, bookings) using assignedPropertyIds. Super Admin has unlimited access. **Auto-assignment**: Admin users automatically get assigned to all properties on first login.
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security**: HTTPS-only cookies, environment variable-secured session secrets, CSRF protection, and tenant access verification on mutations.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication.
-   **Neon Serverless PostgreSQL**: Primary database.
-   **Authkey.io**: WhatsApp and SMS messaging.
-   **OpenAI GPT-4o-mini**: Chatbot assistant via Replit AI.
-   **RazorPay**: Payment processing and payment link generation with webhook support.
-   **Agent Mail**: Transactional email service for booking confirmations, payment notifications, expense alerts, and password reset emails.
