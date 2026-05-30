-- Add available_all_day column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS available_all_day boolean DEFAULT false;

-- Items where ALL slots are true (the legacy default — no deliberate restriction was set)
-- → convert to All Day mode and clear individual slot flags
UPDATE menu_items
SET available_all_day = true,
    available_breakfast = false,
    available_lunch = false,
    available_snacks = false,
    available_dinner = false,
    available_late_night = false
WHERE available_breakfast = true
  AND available_lunch = true
  AND available_snacks = true
  AND available_dinner = true
  AND available_late_night = true;

-- Items that already had deliberate slot restrictions keep their slot flags;
-- available_all_day stays false (already the default above).
