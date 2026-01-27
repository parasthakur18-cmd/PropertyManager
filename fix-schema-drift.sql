-- Fix schema drift issues (safe & idempotent)
-- Run this on your VPS: psql $DATABASE_URL -f fix-schema-drift.sql

-- 1. Fix message_templates
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS template_type VARCHAR(50);

UPDATE message_templates
SET template_type = category
WHERE template_type IS NULL;

-- 2. Fix bills numeric expectations (only if columns are numeric/decimal)
-- Check first: SELECT data_type FROM information_schema.columns WHERE table_name = 'bills' AND column_name IN ('subtotal', 'total_amount', 'balance_amount');
-- Only run if they're numeric/decimal, not integer
DO $$
BEGIN
  -- Only alter if columns are numeric/decimal type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' 
    AND column_name = 'subtotal' 
    AND data_type IN ('numeric', 'decimal')
  ) THEN
    ALTER TABLE bills
    ALTER COLUMN subtotal TYPE INTEGER USING CASE 
      WHEN subtotal IS NULL THEN NULL
      WHEN subtotal::text ~ '^[0-9]+\.?[0-9]*$' THEN subtotal::numeric::integer
      ELSE NULL
    END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' 
    AND column_name = 'total_amount' 
    AND data_type IN ('numeric', 'decimal')
  ) THEN
    ALTER TABLE bills
    ALTER COLUMN total_amount TYPE INTEGER USING CASE 
      WHEN total_amount IS NULL THEN NULL
      WHEN total_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN total_amount::numeric::integer
      ELSE NULL
    END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' 
    AND column_name = 'balance_amount' 
    AND data_type IN ('numeric', 'decimal')
  ) THEN
    ALTER TABLE bills
    ALTER COLUMN balance_amount TYPE INTEGER USING CASE 
      WHEN balance_amount IS NULL THEN NULL
      WHEN balance_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN balance_amount::numeric::integer
      ELSE NULL
    END;
  END IF;
END $$;

-- 3. Fix bookings date logic (only if check_out_date is timestamp)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'check_out_date' 
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE bookings
    ALTER COLUMN check_out_date TYPE DATE USING check_out_date::DATE;
  END IF;
END $$;

-- Verify changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('bills', 'bookings', 'message_templates', 'orders')
  AND column_name IN ('subtotal', 'total_amount', 'balance_amount', 'check_out_date', 'template_type', 'booking_id')
ORDER BY table_name, column_name;
