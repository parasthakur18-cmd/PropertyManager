---
name: Aiosell inventory sync behavior
description: Key quirks, rate limits, debounce, and fixes for the Aiosell channel manager integration
---

## Key Finding: Aiosell "Update Rooms" Page Shows NET Count

When Hostezee pushes `available: N` to Aiosell:
- Aiosell stores N as the "open" count
- Aiosell ALSO tracks its own OTA bookings internally
- The "Update Rooms" page may display: N minus Aiosell's own OTA bookings
- So pushing 4 when Aiosell has 1 OTA booking shows 3 on their screen

**Why:** This explains the "Synced" but different numbers gap. We pushed the right
number, but Aiosell displays differently.

## Reconciliation Page Limitation
- Compares Hostezee calculation vs "last pushed" from our sync logs
- Does NOT fetch live Aiosell data (no documented GET inventory endpoint)
- Two probe URLs tried: `/api/v2/cm/get-inventory/:pms` and `/api/v2/cm/read/:pms`
  (both returned nothing usable as of May 2026)

## No GET/Pull Reservations API
- Aiosell has no pull/GET reservations endpoint (all variations return 404).
- Reservations only arrive via webhook POST to `/api/aiosell/reservation`.

## Batch Push Risk (Fixed)
- Before fix: all 90-day date ranges sent in ONE API call → silent truncation
- After fix: each date range is its own API call (loop in autoSyncInventoryForProperty)

## Debug Endpoint
GET /api/admin/inventory/debug/:propertyId
Returns per-booking-per-date breakdown showing exactly which bookings cause each count.
UI at /inventory-debug.

**How to apply:** When investigating inventory mismatches, always check the debug
endpoint first to see which bookings are contributing to the Hostezee count before
assuming a sync bug.

## Wrong Room Code (Found May 2026)
- `deluxe-room-with-balcony` is INVALID on Blue Mont Aiosell account
- Correct code: `deluxe-double-room-with-balcony`
- Aiosell returns `success:true` + `warnings:["INVALID_ROOM_CODE : ..."]` for bad codes
- Our code was not checking `warnings[]` so bad pushes logged as SUCCESS silently

## Warning Detection Fix
makeAiosellRequest() in server/aiosell.ts now:
1. Reads `responseData.warnings[]`
2. If INVALID_ROOM_CODE present → logs status="warning", not "success"
3. Reconciliation page shows WARNING in amber color

## Rate Limiting — Safe Parameters (Updated May 2026)
- Aiosell enforces ~1 req/s rate limit; returns nginx 429 (HTML, not JSON) if exceeded.
- **Safe inter-call delay: 1200ms** between individual range pushes (was 300ms → too fast).
- **Retry backoff on 429: 3s → 6s → 10s** (3 attempts). Rate-limit window is ~10s so
  short backoffs (1s/2s) don't clear it in time.

## Debounce for Booking Webhooks (Added May 2026)
- Problem: burst of OTA webhooks (6 rapid bookings) each triggered a full 90-day sync
  → parallel calls → 429 flood.
- Fix: `scheduleSyncForProperty(propertyId, opts)` in `server/aiosell.ts`.
  10-second debounce window. Multiple calls for same property within 10s collapse to ONE sync.
- **Always use `scheduleSyncForProperty` for booking-event-triggered syncs.**
  Use `autoSyncInventoryForProperty` directly ONLY for manual/admin-initiated syncs.
- All 4 webhook callers in routes.ts use `scheduleSyncForProperty`.

## Stop-Sell Optimization (Added May 2026)
- Only push `stopSell` restrictions for date ranges where at least one room has `available === 0`.
  All-open ranges are skipped → cuts API calls roughly in half for typical occupancy.
- Auto stop-sell IS still needed: `available=0` alone doesn't block OTA rooms (Aiosell requires
  explicit stopSell restriction to prevent new bookings).

## Live Server Room Code Fix (Still Needed on Production)
SQL to run on hostezee.in DB:
  UPDATE aiosell_room_mappings SET aiosell_room_code = 'deluxe-double-room-with-balcony'
  WHERE aiosell_room_code = 'deluxe-room-with-balcony';
Then run Sync All Rooms from Inventory Reconciliation page.
