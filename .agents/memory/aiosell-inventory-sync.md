---
name: Aiosell inventory sync behavior
description: How Aiosell's inventory system works and why Live page shows different numbers than what Hostezee pushes
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

## Rate Limiting
30+ back-to-back calls to Aiosell returns HTML (not JSON). Fixed: 300ms delay between range pushes in the for-loop.

## Live Server Fix SQL
UPDATE aiosell_room_mappings SET aiosell_room_code = 'deluxe-double-room-with-balcony'
WHERE aiosell_room_code = 'deluxe-room-with-balcony';
