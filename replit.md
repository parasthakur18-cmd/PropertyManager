# Hostezee Property Management System

## Overview
Hostezee is a comprehensive, multi-property management system designed for hotels, resorts, and accommodations. Built natively on Replit, it offers instant deployment and aims to be the easiest PMS globally to operate, targeting significant market share. Key capabilities include an intelligent booking engine, guest management, dynamic pricing, advance payments, restaurant operations, financial tracking, complete checkout with bill generation, and attendance/salary management.

## Recent Updates
- **January 6, 2026**: Implemented Task Manager module for in-house staff task management. Features include: task creation with property assignment, priority levels (low/medium/high), due dates/times, staff assignment, WhatsApp reminder configuration (one-time or daily at 10 AM), custom recipient phone numbers for reminders, in-app notifications when tasks are assigned, filter/search by property/status/priority, tabs for different task views (all/pending/overdue/completed), status updates (pending/in_progress/completed). Background job checks every 15 minutes and sends WhatsApp reminders at 10 AM daily for pending tasks.
- **December 30, 2025**: Implemented SaaS subscription/billing system with Razorpay integration. Features include: 4 pricing tiers (Free, Starter ₹999/mo, Professional ₹2499/mo, Enterprise ₹4999/mo), monthly/yearly billing cycles with 17% yearly discount, subscription_plans and user_subscriptions database tables, Razorpay payment integration for subscriptions, Super Admin subscription analytics dashboard (revenue, active subscribers by plan), plan management (enable/disable plans), and user Settings page with subscription upgrade functionality.
- **December 28, 2025**: Added configurable automatic payment reminders. Features include: enable/disable reminders per property, configurable reminder interval (1-72 hours, default 6h), configurable max reminders (1-10, default 3), background job checks every 15 minutes, automatic WhatsApp reminders sent to guests with pending advance payments. Settings available in Feature Settings page under "Payment Reminder Settings" section.
- **December 28, 2025**: Implemented WhatsApp template control system for per-property message configuration. Features include: 5 pre-approved templates (pending_payment, payment_confirmation, checkin_message, addon_service, checkout_message), enable/disable toggles per template, send timing control (immediate or delayed), configurable delay hours (1-72h). WhatsApp messaging enabled by default for new properties. UI available in WhatsApp Settings page with tabs for Template Controls and General Settings.
- **December 28, 2025**: Implemented extended stay detection at checkout with conflict warnings. System automatically detects when guests stay beyond their original checkout date and offers three options: add calculated charges (room rate × extra nights), enter a custom amount, or mark as complimentary. Also detects and displays booking conflicts when another guest has already booked the same room during the extended period. Extended charges are added to room charges in the final bill.
- **December 25, 2025**: Implemented Beds24 Channel Manager integration with two-way booking sync. Features include: pull bookings from Beds24 API, webhook endpoint for real-time booking notifications, automatic guest creation, external booking ID tracking, and integration UI in OTA Integrations page with Property Key configuration and webhook URL display.
- **December 25, 2025**: Implemented complete advance payment booking confirmation system. Features include: configurable advance payment percentage (default 30%) and expiry hours (default 24h) per property, Razorpay payment link generation with auto-expiry, background job to auto-expire pending bookings every 15 minutes, WhatsApp notifications for payment requests, webhook auto-confirmation on payment, and admin UI with color-coded status badges (Awaiting Payment, Confirmed, Expired) plus manual actions (Resend Payment Link, Confirm Booking).
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
-   **Booking & Guest Management**: Intelligent booking engine, guest tracking, advanced pricing, booking source, meal plan tracking, group bookings, and dormitory bed-level tracking. Includes an Airbnb-style visual room calendar with color-coded availability and direct booking. Extended stay detection at checkout automatically calculates overstay charges with options for calculated amount, custom amount, or complimentary.
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
-   **SaaS Subscription System**: Monetization infrastructure with 4 pricing tiers (Free, Starter ₹999/mo, Professional ₹2499/mo, Enterprise ₹4999/mo), monthly/yearly billing with 17% yearly discount, Razorpay payment integration, and subscription analytics in Super Admin dashboard.

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
-   **Beds24**: Channel Manager API for OTA booking synchronization. Uses API v1 (JSON) with apiKey + propKey authentication. Webhook endpoint: `/api/beds24/webhook`.

## Beds24 Integration Setup Guide

### 4-Step Setup Process
1. **Select Property**: Choose the property you want to connect in OTA Integrations
2. **Connect Beds24**: Enter your Beds24 Property Key (found in Beds24: Settings → Properties → Access → Property Key)
3. **Map Room Types**: Go to "Room Mapping" tab and connect Beds24 room IDs to your Hostezee room types
4. **Sync Bookings**: Click "Sync Now" to import bookings. Set up Beds24 webhook for real-time updates

### Room Mapping System
- **Database Table**: `beds24_room_mappings` stores propertyId, beds24RoomId, beds24RoomName, roomType
- **Automatic Assignment**: When syncing, system finds available room of mapped type for booking dates
- **Fallback**: If no mapping exists or all rooms occupied, uses first available room of property
- **Example**: Beds24 room 637602 (Deluxe Double) → Hostezee "Deluxe Double" room type → assigns to room 101, 102

### Webhook Setup (Real-time Sync)
1. Copy webhook URL from integration card: `{domain}/api/beds24/webhook`
2. In Beds24: Settings → Notifications → Webhooks
3. Paste URL and enable for booking notifications

### API Endpoints
- `POST /api/beds24/sync/:integrationId` - Sync bookings from Beds24
- `GET /api/beds24/room-mappings/:propertyId` - Get room mappings
- `POST /api/beds24/room-mappings` - Create/update room mapping
- `DELETE /api/beds24/room-mappings/:id` - Delete room mapping
- `GET /api/rooms/types/:propertyId` - Get unique room types
