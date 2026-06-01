---
name: Aiosell inventory sync behavior
description: Key quirks, rate limits, debounce, concurrency fixes, and audit accuracy for the AioSell channel manager
---

## CRITICAL: Room-Type Matching Must Be EXACT MATCH ONLY (Fixed Jun 2026)

The `normaliseRoomType` fuzzy match in `autoSyncInventoryForProperty` previously used
bidirectional substring checks. Changed to **exact match only** (`normRoom === normMapped`).

**Why:** `"deluxe double room with balcony".includes("double room with balcony")` = TRUE.
This caused all 10 "Double Room with Balcony" rooms (2001-2012) to be pulled into the
"Deluxe Double Room with Balcony" mapping pool. With 4 Deluxe rooms fully booked but 10
Double rooms free, the sync pushed 5+ available — AioSell showed 5 even when calendar showed 0.

**How to apply:** Never revert to substring matching. normaliseRoomType already handles
hyphens/spaces/case so exact match is sufficient for all Woodpecker/Blue Mont room types.

## Aiosell "Update Rooms" Page Shows Last Pushed Value

When Hostezee pushes `available: N` to Aiosell, the "Update Rooms" page shows N.
It does NOT auto-subtract Aiosell's own OTA bookings in this view.
If Hostezee pushed wrong values, the page keeps showing them until Hostezee pushes again.

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
- **On failure: 6s backoff then CONTINUE** (don't break — remaining ranges still need pushing).
- **Retry backoff on 429: 15s → 30s → 60s** (3 attempts in callAiosellApi).

## Force Sync — Must Be Fire-and-Forget (Critical)
`/api/aiosell/force-sync` must NOT await `autoSyncInventoryForProperty()`.
- 26 ranges × 2.5s = ~65s minimum → nginx 60s timeout → 504 Gateway Timeout on live server.
- Fix: fire-and-forget (`.then().catch()`), return 200 immediately with "Sync started".
- User checks Sync Logs tab for result.
**Why:** Any long-running sync endpoint on a standard nginx proxy will 504. Always
  fire-and-forget for operations taking >30s.

## Stop-Sell Always Runs (Critical)
- Stop-sell restrictions are what actually BLOCK bookings on OTAs (available=0 alone is not enough).
- Never gate stop-sell on `stoppedEarly` — always run it even if some inventory ranges failed.

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

## Auto-Sync Silent Drop Bugs — FIXED (May 2026)

Two bugs caused syncWithRetry()'s 3-attempt retry loop to never fire:

**Bug 1 — Mutex silent drop** (_syncInProgress guard):
- OLD: autoSyncInventoryForProperty() returned NORMALLY when a sync was already running.
  syncWithRetry() saw no exception → logged [SYNC_SENT] → exited. New booking state lost.
- FIX: call scheduleSyncForProperty() instead of returning. It queues a 30s deferred retry
  that fires once the running push finishes, with timer deduplication.

**Bug 2 — Push failure not propagated**:
- OLD: outer catch swallowed all errors → returned normally → syncWithRetry() never retried.
- FIX A: throw after push loop if failCount > 0.
- FIX B: re-throw in outer catch so syncWithRetry()'s retry loop sees the failure.

**Why it matters:** With 40%+ failure rate on Blue Mont pushes, the old code meant every
failed push was permanent. Now syncWithRetry() retries 3× with 2s/4s backoff. All callers
(health job, manual sync-now) already have their own try/catch — the re-throw is safe.

**Circular call is safe:** autoSyncInventoryForProperty → (mutex) → scheduleSyncForProperty
→ (debounce timer) → autoSyncInventoryForProperty. scheduleSyncForProperty deduplicates
timers so no pile-up; mutex clears in finally block before deferred call executes.
