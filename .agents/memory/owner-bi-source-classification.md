---
name: Owner BI source classification fix
description: classifySource() was missing travel_agent/group/other branches, causing ₹8.4L+ to be misattributed to "direct" bucket. Raw DB source values confirmed via SQL audit.
---

## The Rule
`classifySource()` in `server/owner-bi.ts` must handle all raw source strings that actually appear in the `bookings.source` column. Check the DB before adding new OTA or channel strings.

## Confirmed Raw Source Values in DB (as of audit)
| Raw value         | Correct bucket  | Notes                              |
|-------------------|-----------------|------------------------------------|
| Booking.com       | ota             | capital B — lowercased before check|
| booking.com       | ota             | ✅                                 |
| aiosell-booking.com | ota           | matches "aiosell" substring        |
| aiosell-airbnb    | ota             | ✅                                 |
| aiosell-expedia   | ota             | ✅                                 |
| MMT               | ota             | matches "mmt"                      |
| Airbnb            | ota             | ✅                                 |
| OTA / ota         | ota             | ✅                                 |
| Online            | ota             | added to OTA_SOURCES               |
| Travel Agent      | travel_agent    | FIXED — was falling to "direct"    |
| Walk-in / walk-in | walk_in         | ✅                                 |
| Others            | other           | FIXED — was falling to "direct"    |
| phone             | direct          | intentional                        |

## What Changed
Added to `server/owner-bi.ts` (lines ~60–78):
- `TRAVEL_AGENT_SOURCES = ["travel agent", "travel_agent", "travelagent"]`
- `GROUP_SOURCES = ["group booking", "group_booking"]`
- `"online"` added to `OTA_SOURCES`
- `classifySource` now checks travel_agent BEFORE website/corporate fallback
- Added `if (s === "others" || s === "other") return "other"` before final "direct" fallback

**Why:** Without travel_agent branch, 121 bookings (₹8.4L paid bills) were shown as "Direct" revenue — the entire Travel Agent source bucket was invisible in Source Intel, OTA Analysis, Monthly Sales, and all modules using classifySource.

## Data Quality Issues (not code bugs)
Duplicate travel agent records exist in DB — needs manual merge by owner:
- JustWravel (id=1) and "JustWravel " (id=20, trailing space)
- Capture A Trip (id=3) and "Capture a Trip" (id=10, case difference)
- Wildly Leo (id=27) and "Wildy Leo" (id=18, typo)

## Consistency Verified
- `getSourceIntelligence` already selects `travelAgentId` directly (not via getBillsInRange) — TA drill-down was already correct for agentMap
- Room nights: `checkOut - checkIn` with midnight normalization = correct, no +1 bug
- `getBillsInRange` uses `bills.createdAt + paymentStatus='paid'` consistently across all modules
