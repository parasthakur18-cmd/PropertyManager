---
name: Customer menu premium UX
description: Phase 1 hotel dining homepage — navigation model, slot system, and key design decisions
---

## Navigation State Machine
`searchQuery` (highest) → `activeMealSlot` set → `selectedCategoryId !== "none"` → homepage

## Slot System
`MEAL_SLOTS` constant (top of file, outside component) maps each of the 5 periods to startKey/endKey (into menuTiming) and a gradient. `getSlotItems(items, slotKey)` is a switch-case that filters by availableBreakfast/Lunch/Snacks/Dinner/LateNight. Null-safe: `!== false` keeps items where flag is null (default enabled).

## Key computed values (inside component)
- `currentSlotKey` — which slot is active RIGHT NOW (menuTiming + local time)
- `itemsPerSlot` — pre-computed per slot, inherits High Load filter from visibleItems
- `activeMealByCategory` — groups activeMealItems by their category for inside-slot view

**Why:** slot-based navigation means guests land on what's actually being served, not a flat food-delivery catalog. Reuses all existing booleans with zero backend changes.

## Category detail view fix
Was previously computed (itemsInActiveCategory) but never rendered — now the third navigation state. Browse by Category tiles now correctly drill into items.

## High Load Banner
Copy: "Express Menu Currently Active". Uses Zap icon from lucide-react. Shown when isHighLoad (menuTiming.highLoadMode).

## Currently Serving Hero
Only shown when currentSlotKey && isKitchenOpen — correctly hidden when kitchen is closed or no slot is active.
