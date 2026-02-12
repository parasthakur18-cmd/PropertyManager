-- fix-schema-drift.sql
-- Run against your database to fix validator-reported drift. Safe to run multiple times.

BEGIN;

-- 1. message_templates: add template_type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN template_type VARCHAR(50) DEFAULT 'email';
    UPDATE message_templates SET template_type = 'email' WHERE template_type IS NULL;
  END IF;
END $$;

-- 2. bookings: change check_out_date from timestamp to date (if currently timestamp)
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'bookings' AND column_name = 'check_out_date';

  IF col_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
    ALTER TABLE bookings
      ALTER COLUMN check_out_date TYPE date
      USING (check_out_date::date);
  END IF;
END $$;

-- 3. activity_logs: allow user id changes without FK violation (e.g. Google merge)
-- If any code ever updates users.id, activity_logs.user_id will follow instead of erroring
DO $$
BEGIN
  ALTER TABLE activity_logs
    DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
  ALTER TABLE activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Constraint may already exist with different definition, skip
END $$;

COMMIT;
