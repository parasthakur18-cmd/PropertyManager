-- ============================================
-- Fix Missing Tables and Columns
-- Run this to fix database errors
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- 1. Add missing columns to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst_on_rooms BOOLEAN DEFAULT true;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst_on_food BOOLEAN DEFAULT false;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_methods JSONB;

-- 1b. Add missing columns to staff_members table
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS leaving_date TIMESTAMP;

-- 1c. Add missing column to travel_agents table
ALTER TABLE travel_agents ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- 1d. Add missing columns to existing tables (if tables already exist)
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS advance_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE change_approvals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS lease_duration_years INTEGER;
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS base_yearly_amount NUMERIC(10, 2);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS yearly_increment_type VARCHAR(20);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS yearly_increment_value NUMERIC(10, 2);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS current_year_amount NUMERIC(10, 2);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN DEFAULT false;
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS carry_forward_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS template_type VARCHAR(50);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMP;

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

-- 6. Create staff_invitations table (invite staff users to a property)
CREATE TABLE IF NOT EXISTS staff_invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  invited_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_token VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_property_id ON staff_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_invite_token ON staff_invitations(invite_token);

-- 7. Create user_permissions table (for granular permission control)
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookings VARCHAR(20) NOT NULL DEFAULT 'none',
  calendar VARCHAR(20) NOT NULL DEFAULT 'none',
  rooms VARCHAR(20) NOT NULL DEFAULT 'none',
  guests VARCHAR(20) NOT NULL DEFAULT 'none',
  food_orders VARCHAR(20) NOT NULL DEFAULT 'none',
  menu_management VARCHAR(20) NOT NULL DEFAULT 'none',
  payments VARCHAR(20) NOT NULL DEFAULT 'none',
  reports VARCHAR(20) NOT NULL DEFAULT 'none',
  settings VARCHAR(20) NOT NULL DEFAULT 'none',
  tasks VARCHAR(20) NOT NULL DEFAULT 'none',
  staff VARCHAR(20) NOT NULL DEFAULT 'none',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- 8. Create attendance_records table (for staff attendance tracking)
CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  remarks TEXT,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_property_id ON attendance_records(property_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_date ON attendance_records(attendance_date);

-- 9. Create message_templates table (for WhatsApp/email templates)
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  template_type VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- 10. Create property_leases table (for property lease management)
CREATE TABLE IF NOT EXISTS property_leases (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  payment_frequency VARCHAR(50),
  landlord_name VARCHAR(255),
  landlord_contact VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  lease_duration_years INTEGER,
  base_yearly_amount NUMERIC(10, 2),
  yearly_increment_type VARCHAR(20),
  yearly_increment_value NUMERIC(10, 2),
  current_year_amount NUMERIC(10, 2),
  is_overridden BOOLEAN DEFAULT false,
  carry_forward_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_leases_property_id ON property_leases(property_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_is_active ON property_leases(is_active);

-- 11. Create lease_history table (for tracking lease changes)
CREATE TABLE IF NOT EXISTS lease_history (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES property_leases(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_history_lease_id ON lease_history(lease_id);

-- 12. Create lease_payments table (for tracking lease payments)
CREATE TABLE IF NOT EXISTS lease_payments (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES property_leases(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2),
  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_payments_lease_id ON lease_payments(lease_id);

-- 13. Create salary_advances table (for staff salary advances)
CREATE TABLE IF NOT EXISTS salary_advances (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  salary_id INTEGER REFERENCES staff_salaries(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  advance_date TIMESTAMP,
  reason TEXT,
  repayment_status VARCHAR(20),
  deducted_from_salary_id INTEGER,
  approved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  staff_member_id INTEGER REFERENCES staff_members(id) ON DELETE CASCADE,
  advance_type VARCHAR(20) DEFAULT 'regular'
);

CREATE INDEX IF NOT EXISTS idx_salary_advances_user_id ON salary_advances(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_staff_member_id ON salary_advances(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_salary_id ON salary_advances(salary_id);

-- 14. Create change_approvals table (for change request approvals)
CREATE TABLE IF NOT EXISTS change_approvals (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(255) REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_approvals_user_id ON change_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_change_approvals_status ON change_approvals(status);
CREATE INDEX IF NOT EXISTS idx_change_approvals_booking_id ON change_approvals(booking_id);

-- 15. Create employee_performance_metrics table (for staff performance tracking)
CREATE TABLE IF NOT EXISTS employee_performance_metrics (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_tasks_assigned INTEGER NOT NULL DEFAULT 0,
  tasks_completed_on_time INTEGER NOT NULL DEFAULT 0,
  tasks_completed_late INTEGER NOT NULL DEFAULT 0,
  average_completion_time_minutes INTEGER NOT NULL DEFAULT 0,
  performance_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_performance_metrics_staff_id ON employee_performance_metrics(staff_id);

-- 16. Create task_notification_logs table (for task reminder tracking)
CREATE TABLE IF NOT EXISTS task_notification_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(100) NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  completion_time INTEGER DEFAULT 0,
  last_reminded_at TIMESTAMP,
  all_tasks_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notification_logs_user_id ON task_notification_logs(user_id);

-- 17. Create subscription_plans table (if not exists)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10, 2),
  max_properties INTEGER NOT NULL DEFAULT 1,
  max_rooms INTEGER NOT NULL DEFAULT 10,
  max_staff INTEGER DEFAULT 2,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);

-- 18. Create user_subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  trial_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  razorpay_subscription_id VARCHAR(100),
  razorpay_customer_id VARCHAR(100),
  last_payment_at TIMESTAMP,
  next_billing_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 19. Create subscription_payments table (if not exists)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES user_subscriptions(id),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  razorpay_payment_id VARCHAR(100),
  razorpay_order_id VARCHAR(100),
  invoice_number VARCHAR(50),
  invoice_url TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

SELECT '✅ All missing tables and columns created successfully!' as status;
