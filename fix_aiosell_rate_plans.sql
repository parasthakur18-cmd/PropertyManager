-- Fix aiosell_rate_plans table schema
-- Run this once against your live database if the server restart doesn't work,
-- or if you need to apply the fix manually without restarting.

DO $$
BEGIN
  -- Check if the table exists and has the OLD schema (missing config_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aiosell_rate_plans'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aiosell_rate_plans' AND column_name = 'config_id'
  ) THEN
    -- Old schema detected — drop and recreate with correct schema
    DROP TABLE IF EXISTS aiosell_rate_plans CASCADE;

    CREATE TABLE aiosell_rate_plans (
      id SERIAL PRIMARY KEY,
      config_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      room_mapping_id INTEGER NOT NULL,
      rate_plan_name VARCHAR(100) NOT NULL,
      rate_plan_code VARCHAR(100) NOT NULL,
      base_rate DECIMAL(10,2),
      occupancy VARCHAR(20) DEFAULT 'single',
      created_at TIMESTAMP DEFAULT NOW()
    );

    RAISE NOTICE 'aiosell_rate_plans rebuilt with correct schema.';
  ELSE
    RAISE NOTICE 'aiosell_rate_plans already has correct schema — no action taken.';
  END IF;
END $$;
