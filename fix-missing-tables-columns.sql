-- ============================================
-- Fix Missing Tables and Columns
-- Run this to fix database errors
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- 1. Add missing columns to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst_on_rooms BOOLEAN DEFAULT true;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst_on_food BOOLEAN DEFAULT false;

-- 1b. Add missing column to staff_members table
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  assigned_user_name VARCHAR(255),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  due_time VARCHAR(10),
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_type VARCHAR(20) DEFAULT 'daily',
  reminder_time VARCHAR(10) DEFAULT '10:00',
  reminder_recipients TEXT[],
  last_reminder_sent TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_id ON tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- 3. Create task_reminder_logs table
CREATE TABLE IF NOT EXISTS task_reminder_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_reminder_logs_task_id ON task_reminder_logs(task_id);

-- 4. Create daily_closings table
CREATE TABLE IF NOT EXISTS daily_closings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_collected NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_pending_receivable NUMERIC(12, 2) NOT NULL DEFAULT 0,
  wallet_balances JSONB NOT NULL DEFAULT '[]',
  revenue_breakdown JSONB DEFAULT '{}',
  collection_breakdown JSONB DEFAULT '{}',
  expense_breakdown JSONB DEFAULT '{}',
  bookings_count INTEGER DEFAULT 0,
  check_ins_count INTEGER DEFAULT 0,
  check_outs_count INTEGER DEFAULT 0,
  food_orders_count INTEGER DEFAULT 0,
  expense_entries_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  closed_by VARCHAR(255) REFERENCES users(id),
  closed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, closing_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_closings_property_id ON daily_closings(property_id);
CREATE INDEX IF NOT EXISTS idx_daily_closings_closing_date ON daily_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_daily_closings_status ON daily_closings(status);

-- 5. Create feature_settings table (for property-specific feature toggles)
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

CREATE INDEX IF NOT EXISTS idx_feature_settings_property_id ON feature_settings(property_id);

SELECT '✅ All missing tables and columns created successfully!' as status;
