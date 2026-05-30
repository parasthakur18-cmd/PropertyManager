---
name: Aiosell inventory sync behavior
description: Key quirks, rate limits, debounce, concurrency fixes, and audit accuracy for the AioSell channel manager
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
- **Safe inter-call delay: 2500ms** between individual range pushes.
- **Retry backoff on 429: 15s → 30s → 60s** (3 attempts in callAiosellApi).

## Concurrency Bug Fixed (Phase 4, May 2026)
`scheduleSyncForProperty` deleted its debounce timer BEFORE the sync ran.
A new booking event mid-push would spawn a parallel sync → burst of simultaneous HTTP calls → 429.
Fix: `_syncInProgress = new Set<number>()` — autoSyncInventoryForProperty sets/clears it in try/finally.
`scheduleSyncForProperty` now defers 30s if property is in-progress instead of spawning parallel.
**Always use `scheduleSyncForProperty` for booking-event-triggered syncs.**

## Stop-Sell Optimization (Added May 2026)
- Only push `stopSell` restrictions for date ranges where at least one room has `available === 0`.
  All-open ranges are skipped → cuts API calls roughly in half for typical occupancy.

## DEV/LIVE Isolation Guard (Added May 2026)
- Preview and live share the same Aiosell hotelCode → preview test pushes corrupt live inventory.
- Fix: `AIOSELL_PUSH_ENABLED=true` must be set on the LIVE server; dev has it "false".

## Daily Health Job (Phase 4, May 2026)
`startInventoryHealthJob()` in server/aiosell.ts — called at bottom of routes.ts.
Runs every 24h, first run 3min after startup. Staggered 60s between properties.
Pushes inventory for properties where last_sync_at is null or >23h old.
**Prevents staleness at low-activity properties (Woodpecker) that get no booking events.**

## Audit False Positives Fixed (Phase 4, May 2026)
- SANDBOX hotel_code ("SANDBOX-PMS") previously passed `!!hotelCode.trim()` → now explicitly fails
- `is_sandbox=true` now adds "fail" check + deducts 4pts from Section 1 score
- Duplicate `aiosell_room_code` across mappings → Section 2 now catches and penalises
- HTTP 500 from testConnection counted as connectivity pass for sandbox → overridden in Section 6

## Property State (as of 2026-05-30)
- **Woodpecker (id=1):** Production, 9 mappings, 2 dorm types missing rate plans (mapping_id=4,5)
- **Forest Pinnacle (id=2):** SANDBOX (hotel_code=SANDBOX-PMS, is_sandbox=true), all 3 room
  types use code "EXECUTIVE" (needs real AioSell codes), last_sync_at=null (never pushed to prod)
- **Blue Mont (id=7):** Production, 7 mappings with correct AioSell codes, zero rate plans in DB
  (need AioSell dashboard codes to add)

## Live Server Room Code Fix (Still Needed on Production)
SQL to run on hostezee.in DB:
  UPDATE aiosell_room_mappings SET aiosell_room_code = 'deluxe-double-room-with-balcony'
  WHERE aiosell_room_code = 'deluxe-room-with-balcony';
