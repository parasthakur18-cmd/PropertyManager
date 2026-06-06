---
name: Drizzle undefined column crash
description: Selecting a column that doesn't exist in the Drizzle schema causes a TypeError before any DB query, not a SQL error.
---

## The Rule

Never pass `undefined` as a column value in `db.select({...})`. If `table.columnName` does not exist in the Drizzle schema, it is `undefined` at runtime. Drizzle's `orderSelectedFields()` then calls `Object.entries(undefined)` → **TypeError: "Cannot convert undefined or null to object"** — thrown synchronously, before any DB query is sent.

**Why:** Drizzle builds the SQL query object by iterating the selection map. It recursively calls `Object.entries(field)` for any non-Column, non-SQL, non-Table value, which explodes on `undefined`.

**How to apply:**
- When a 500 error says "Cannot convert undefined or null to object" in a Drizzle query handler, suspect an undefined column reference.
- Cross-check every `table.columnName` in a `db.select({...})` call against `shared/schema.ts`.
- The `bookings` table in this codebase does NOT have a `room_type` column. Use `bookingRoomStays.roomType` (for TBS stays where `roomId IS NULL`) as the fallback source of room-type data for unassigned bookings.
- Confirmed missing: `bookings.roomType` (no `room_type` column in DB or schema as of June 2026).
