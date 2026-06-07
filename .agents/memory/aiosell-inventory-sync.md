---
name: AioSell inventory sync behavior
description: How AioSell pull/push/stop-sell works, and known quirks with property 7 (Blue Mont Sojha)
---

## Stop-sell restriction clearing
**Rule:** Push `stopSell=false` for ALL sync ranges — even "all-open" ones where every room has availability > 0.

**Why:** AioSell can have external stop-sell restrictions set via its own dashboard (e.g. a property manager blocks dates manually in AioSell). If Hostezee only pushes `stopSell=true` for 0-availability dates and skips fully-open ranges, that external restriction is NEVER cleared — rooms remain invisible on OTAs indefinitely. Property 7 dorm rooms were stuck at 0 because of exactly this pattern.

**Fix (applied):** `const needsStopSellUpdate = inventoryUpdates;` — no filter, all ranges always pushed.

## AioSell availability count mismatch
**Rule:** AioSell's displayed count = Hostezee pushed count MINUS AioSell's own OTA bookings.

**Why:** AioSell deducts its own OTA-sourced reservations from the pushed count. Hostezee excludes `source='aiosell'` bookings when computing push count. So both sides should agree, but AioSell shows lower if it has OTA bookings that are NOT imported into Hostezee.

**Fix:** Run "Pull Reservations from AioSell" in Channel Manager to import OTA bookings into Hostezee so they're reflected in the availability grid.

## Debug endpoint
`/inventory-debug?propertyId=7` shows per-date per-room availability breakdown with booking IDs.

## Dev mode suppression
`AIOSELL_PUSH_ENABLED=false` in dev `.env.local` — all pushes are suppressed and logged as "🚫 DEV MODE". Set to `true` on the live server.
