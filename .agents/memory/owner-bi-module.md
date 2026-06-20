---
name: Owner BI Module
description: Phase 1 Owner Business Intelligence dashboards — architecture, field names, and gaps identified
---

## Location
- Backend: `server/owner-bi.ts` (standalone calculation module)
- Routes: Block-scoped `{ const { ... } = await import("./owner-bi"); ... }` inserted at line ~8187 in `server/routes.ts`
- Frontend: `client/src/pages/owner-dashboard.tsx` (single page, 7 tabs)
- Route: `/owner-dashboard` in `client/src/App.tsx`
- Sidebar: First item in `adminAnalyticsItems` in `client/src/components/app-sidebar.tsx`

## Key field name corrections (schema vs naive guesses)
- `orders.totalAmount` (NOT `totalPrice`) — critical
- `orders.paymentStatus` values: "paid" / "unpaid" (NOT "paid"/"pending")
- `bills.roomCharges`, `bills.foodCharges`, `bills.extraCharges`, `bills.totalAmount`
- `bookings.checkOutDate` (string date "YYYY-MM-DD"), `bookings.checkInDate` same
- Revenue "realized" via `bills` joined to `bookings` filtered by `bookings.checkOutDate`

## Identified gaps (not blocking Phase 1)
- OTA commission % not stored in DB — `commissionPct` and `commissionAmount` always 0
- Room target revenue not in DB — `targetRevenue` / `achievementPct` always 0

## OTA source classification
`classifySource()` in `server/owner-bi.ts` maps raw booking.source → ota/walk_in/website/corporate/direct

**Why:** Source strings vary ("booking.com", "BookingCom", etc.) — always use classifySource() for consistent category aggregation.
