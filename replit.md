# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it offers instant deployment and aims to be the easiest PMS globally to operate. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, attendance/salary management, SaaS subscription/billing, and channel manager integrations. The project targets significant market share by offering a user-friendly and feature-rich solution.

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
-   **Booking & Guest Management**: Intelligent booking engine, guest tracking, advanced pricing, booking source, meal plan tracking, group bookings, dormitory bed-level tracking, and an Airbnb-style visual room calendar. Includes extended stay detection at checkout with conflict warnings and automated charge calculation.
-   **User & Enquiry Management**: Manages user roles, property assignments, and deletions with role-based access control, and handles individual/group enquiries.
-   **Task Management**: Module for in-house staff task management with property assignment, priority levels, due dates, staff assignment, WhatsApp reminders, in-app notifications, and status updates.

#### AI & Intelligent Features
-   **AI-Powered Smart Notifications**: Intelligent notification system with smart reminders for pending tasks and auto-dismissal.
-   **Employee Performance Dashboard**: Tracks staff performance with individual, team-wide, and scoring metrics.
-   **24/7 AI Chatbot Assistant**: Provides user support via OpenAI GPT-4o-mini (Replit AI) on the landing page and within the app.

#### Restaurant & Operations
-   **Restaurant & Order Management**: Comprehensive kitchen management, QR ordering, menu system, quick order entry, real-time tracking, room-specific QR codes, and WhatsApp food order alerts.

#### Financial Management
-   **Financial Tracking**: Manages property leases, payments, expenses, P&L reports, pending payments, detailed bill management, and Excel export.
-   **Payment Systems**: RazorPay integration for payment links, split payments, and real-time dashboard notifications. Includes configurable advance payment booking confirmation with auto-expiry and WhatsApp notifications.
-   **SaaS Subscription System**: Monetization infrastructure with 4 pricing tiers, monthly/yearly billing, Razorpay integration, and subscription analytics in Super Admin dashboard.

#### Staff Management
-   **Staff Invitation System**: Admins can invite new staff members via email with role pre-assignment. Invitations expire in 7 days and can be cancelled before acceptance.
-   **Granular Permission Matrix**: 11-module permission system (bookings, calendar, rooms, guests, food orders, menu management, payments, reports, settings, tasks, staff) with 'none', 'view', or 'edit' access levels.
-   **User Status Control**: Admins can activate/deactivate staff accounts without deleting them, preserving history while restricting access.
-   **Enhanced Salary Management**: 
    -   **Carry-Forward Tracking**: Automatically calculates and tracks pending salary amounts from previous months.
    -   **Advance Type Classification**: Supports "Regular" and "Extra" advance types for better tracking.
    -   **Attendance-Based Deductions**: Leave = no deduction (paid leave), Absent = full day deduction, Half-day = 0.5 day deduction.
    -   **Payment Tracking**: Tracks payments made within each salary period.
    -   **Detailed Salary Breakup**: Shows base salary, attendance deductions, regular/extra advances, previous pending, and total payable.
    -   **Summary Dashboard**: Six summary cards showing Base Salary, Deductions, Advances, Previous Pending, Paid This Month, and Total Payable.
-   **Attendance Tracking**: Tracks staff attendance with status options: Present, Absent, Leave, Half-day.
-   **Performance Tracking**: Integrates performance scores into salary calculations.

#### Advanced Controls
-   **Feature Settings Control Panel**: Provides 10 toggleable features for administrators (e.g., notification types, auto-checkout).
-   **OTA Integrations**: Supports multi-platform booking synchronization with 8 OTA platforms, including credential management, manual sync, and error tracking (e.g., Beds24 two-way sync).
-   **WhatsApp Template Control System**: Configurable per-property WhatsApp message templates for various events (e.g., pending payment, check-in, checkout) with send timing controls.
-   **Automatic Payment Reminders**: Configurable automatic WhatsApp reminders for guests with pending advance payments.

#### Analytics & Reporting
-   **Dashboard & Analytics**: Offers active bookings dashboard, quick actions, booking analytics, real-time "Active Users" count, occupancy tracking, and revenue reports.
-   **Super Admin Portal**: System-wide management dashboard for user management, property monitoring, issue tracking, and error reporting, including subscription analytics.

#### Guest Experience
-   **Guest Experience**: Includes WhatsApp notifications, guest ID proof upload, guest self-check-in via QR, and WhatsApp payment links.

#### Security & Compliance
-   **Error Reporting**: Automatic crash reporting with stack trace capture.
-   **Enterprise Security**: ISO 27001 compliance, end-to-end encryption, SOC 2 certification, and role-based access control.
-   **Authentication**: Multi-method authentication (Google OAuth, Email/Password, Mobile OTP via WhatsApp). Separated login flows for Super Admin and Regular Admin.
-   **User Verification**: Super Admin approval workflow for new users.
-   **Tenant Isolation**: Property-based data filtering with Super Admin having unlimited access. Admin users are auto-assigned to all properties on login.
-   **Data Validation**: Client-side with Zod, server-side using shared Zod schemas.
-   **Security Measures**: HTTPS-only cookies, environment variable-secured session secrets, CSRF protection, and tenant access verification on mutations.

## External Dependencies

### Third-Party Services
-   **Replit Auth OIDC**: User authentication.
-   **Neon Serverless PostgreSQL**: Primary database.
-   **Authkey.io**: WhatsApp and SMS messaging for OTP and notifications.
-   **OpenAI GPT-4o-mini**: Chatbot assistant via Replit AI.
-   **RazorPay**: Payment processing, payment link generation, and webhook support for subscriptions and advance payments.
-   **Agent Mail**: Transactional email service for booking confirmations, payment notifications, expense alerts, and password resets.
-   **Beds24**: Channel Manager API for two-way OTA booking synchronization using API v1 (JSON) with webhooks.