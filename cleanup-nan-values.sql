-- Clean up "NaN" string values in integer columns
-- This script safely handles cases where integer columns might contain invalid data

-- Note: If columns are INTEGER type, they shouldn't contain "NaN" strings.
-- However, if they do (due to previous data issues), we need to handle them carefully.

-- Fix bills table - only update if we can safely cast to text
DO $$
BEGIN
  -- Try to update booking_id if it's invalid
  BEGIN
    UPDATE bills 
    SET booking_id = NULL 
    WHERE booking_id IS NOT NULL 
      AND (booking_id::text = 'NaN' OR booking_id::text = '' OR booking_id::text !~ '^[0-9]+$');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update bills.booking_id: %', SQLERRM;
  END;
  
  -- Try to update guest_id if it's invalid
  BEGIN
    UPDATE bills 
    SET guest_id = NULL 
    WHERE guest_id IS NOT NULL 
      AND (guest_id::text = 'NaN' OR guest_id::text = '' OR guest_id::text !~ '^[0-9]+$');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update bills.guest_id: %', SQLERRM;
  END;
END $$;

-- Fix orders table
DO $$
BEGIN
  BEGIN
    UPDATE orders 
    SET booking_id = NULL 
    WHERE booking_id IS NOT NULL 
      AND (booking_id::text = 'NaN' OR booking_id::text = '' OR booking_id::text !~ '^[0-9]+$');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update orders.booking_id: %', SQLERRM;
  END;
END $$;

-- Verify cleanup (safe query that won't fail on invalid data)
SELECT 
  'bills' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE booking_id IS NULL) as null_booking_ids,
  COUNT(*) FILTER (WHERE guest_id IS NULL) as null_guest_ids
FROM bills
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE booking_id IS NULL) as null_booking_ids,
  0 as null_guest_ids
FROM orders;
