-- ============================================
-- Complete Schema Verification Script
-- This script checks all tables from schema.ts
-- Run this on VPS to see what's missing
-- ============================================

-- List all tables that should exist (from schema.ts)
-- This query will show which tables exist and which don't

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'users',
      'otp_tokens',
      'password_reset_otps',
      'properties',
      'rooms',
      'guests',
      'travel_agents',
      'bookings',
      'menu_categories',
      'menu_items',
      'menu_item_variants',
      'menu_item_add_ons',
      'orders',
      'extra_services',
      'bills',
      'enquiries',
      'message_templates',
      'communications',
      'property_leases',
      'lease_history',
      'lease_payments',
      'property_expenses',
      'expense_categories',
      'bank_transactions',
      'staff_members',
      'staff_salaries',
      'salary_advances',
      'salary_payments',
      'vendors',
      'vendor_transactions',
      'attendance_records',
      'feature_settings',
      'whatsapp_notification_settings',
      'food_order_whatsapp_settings',
      'issue_reports',
      'ota_integrations',
      'beds24_room_mappings',
      'notifications',
      'contact_enquiries',
      'pre_bills',
      'audit_logs',
      'employee_performance_metrics',
      'task_notification_logs',
      'whatsapp_template_settings',
      'subscription_plans',
      'user_subscriptions',
      'subscription_payments',
      'activity_logs',
      'user_sessions',
      'tasks',
      'task_reminder_logs',
      'user_permissions',
      'staff_invitations',
      'wallets',
      'wallet_transactions',
      'daily_closings'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for missing tables (comprehensive list)
SELECT 
  'MISSING TABLE: ' || table_name as issue
FROM (
  VALUES 
    ('users'),
    ('otp_tokens'),
    ('password_reset_otps'),
    ('properties'),
    ('rooms'),
    ('guests'),
    ('travel_agents'),
    ('bookings'),
    ('menu_categories'),
    ('menu_items'),
    ('menu_item_variants'),
    ('menu_item_add_ons'),
    ('orders'),
    ('extra_services'),
    ('bills'),
    ('enquiries'),
    ('message_templates'),
    ('communications'),
    ('property_leases'),
    ('lease_history'),
    ('lease_payments'),
    ('property_expenses'),
    ('expense_categories'),
    ('bank_transactions'),
    ('staff_members'),
    ('staff_salaries'),
    ('salary_advances'),
    ('salary_payments'),
    ('vendors'),
    ('vendor_transactions'),
    ('attendance_records'),
    ('feature_settings'),
    ('whatsapp_notification_settings'),
    ('food_order_whatsapp_settings'),
    ('issue_reports'),
    ('ota_integrations'),
    ('beds24_room_mappings'),
    ('notifications'),
    ('contact_enquiries'),
    ('pre_bills'),
    ('audit_logs'),
    ('employee_performance_metrics'),
    ('task_notification_logs'),
    ('whatsapp_template_settings'),
    ('subscription_plans'),
    ('user_subscriptions'),
    ('subscription_payments'),
    ('activity_logs'),
    ('user_sessions'),
    ('tasks'),
    ('task_reminder_logs'),
    ('user_permissions'),
    ('staff_invitations'),
    ('wallets'),
    ('wallet_transactions'),
    ('daily_closings')
) AS expected_tables(table_name)
WHERE NOT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = expected_tables.table_name
);

-- Verify critical columns in bookings table
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN (
      'cancellation_date', 'cancellation_type', 'cancellation_charges',
      'refund_amount', 'cancellation_reason', 'cancelled_by',
      'actual_check_in_time', 'payment_link_id', 'payment_link_url',
      'payment_link_expiry', 'advance_payment_status', 'reminder_count',
      'last_reminder_at', 'external_booking_id', 'external_source'
    ) THEN '✓'
    ELSE ''
  END as verified
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY column_name;

-- Verify monthly_rent in properties
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'properties' 
  AND column_name = 'monthly_rent';
