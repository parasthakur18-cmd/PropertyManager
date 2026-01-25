-- ============================================
-- QUICK FIX: Feature Settings Table
-- Run this to fix "relation feature_settings does not exist" error
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- Feature Settings table (for property-specific feature toggles)
CREATE TABLE IF NOT EXISTS feature_settings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  food_order_notifications BOOLEAN NOT NULL DEFAULT true,
  whatsapp_notifications BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  payment_reminders BOOLEAN NOT NULL DEFAULT true,
  auto_checkout BOOLEAN NOT NULL DEFAULT true,
  auto_salary_calculation BOOLEAN NOT NULL DEFAULT true,
  attendance_tracking BOOLEAN NOT NULL DEFAULT true,
  performance_analytics BOOLEAN NOT NULL DEFAULT true,
  expense_forecasting BOOLEAN NOT NULL DEFAULT true,
  budget_alerts BOOLEAN NOT NULL DEFAULT true,
  -- Advance Payment Settings
  advance_payment_enabled BOOLEAN NOT NULL DEFAULT true,
  advance_payment_percentage NUMERIC(5, 2) DEFAULT 30,
  advance_payment_expiry_hours INTEGER DEFAULT 24,
  -- Payment Reminder Settings
  payment_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_reminder_hours INTEGER DEFAULT 6,
  max_payment_reminders INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feature_settings_property_id ON feature_settings(property_id);

SELECT '✅ Feature settings table created successfully!' as status;
