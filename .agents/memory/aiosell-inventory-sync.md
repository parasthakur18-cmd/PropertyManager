---
name: AioSell inventory sync behavior
description: How AioSell pull/push/stop-sell works, and known quirks with the push count calculation
---

## Stop-sell restriction clearing
**Rule:** Push `stopSell=false` for ALL sync ranges — even "all-open" ones where every room has availability > 0.

**Why:** AioSell can have external stop-sell restrictions set via its own dashboard (e.g. a property manager blocks dates manually in AioSell). If Hostezee only pushes `stopSell=true` for 0-availability dates and skips fully-open ranges, that external restriction is NEVER cleared — rooms remain invisible on OTAs indefinitely. Property 7 dorm rooms were stuck at 0 because of exactly this pattern.

**Fix (applied):** `const needsStopSellUpdate = inventoryUpdates;` — no filter, all ranges always pushed.

## AioSell availability count — push value is ABSOLUTE, not adjusted

**Rule:** AioSell displays EXACTLY what Hostezee pushes. It does NOT subtract its own OTA bookings from the pushed value.

**Why:** Confirmed live: Jun 26-27 showed 1 and 0 in AioSell's "Update Rooms" grid, and there were ZERO active bookings for those dates in Hostezee's DB — meaning those values are what Hostezee last pushed, not AioSell doing any internal deduction. The earlier "OTA deduction fix" that excluded `source='aiosell-*'` bookings from the push count was based on the WRONG assumption that AioSell subtracts its own bookings. That exclusion caused inventory to reopen after every OTA webhook booking (Hostezee would push `available=2` as if no booking existed, and AioSell would display 2 — the room never closed).

**Fix (applied):** Removed the OTA exclusion entirely. `directBookings = activeBookings` — all bookings count toward reducing the push value regardless of source. Dorm and regular-room loops both use `activeBookings` now.

## Debug endpoint
`/inventory-debug?propertyId=7` shows per-date per-room availability breakdown with booking IDs.

## Dev mode suppression
`AIOSELL_PUSH_ENABLED=false` in dev `.env.local` — all pushes are suppressed and logged as "🚫 DEV MODE". Set to `true` on the live server.
