-- ============================================
-- Fix All Missing Database Tables and Columns
-- Run this script on your VPS PostgreSQL database
-- ============================================

-- Step 1: Add missing columns to existing tables
-- ============================================

-- Add monthly_rent to properties table (if not already added)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(10, 2);

-- Add all cancellation-related columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_charges NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255);

-- Step 2: Create missing tables
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sound_type VARCHAR(50),
  related_id INTEGER,
  related_type VARCHAR(50),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- User Sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255),
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(50),
  location VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  resource_name VARCHAR(255),
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  property_name VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_property_id ON activity_logs(property_id);

-- Issue Reports table
CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  reported_by_user_id VARCHAR(255) REFERENCES users(id),
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  severity VARCHAR(20),
  screenshot TEXT,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_reports_reported_by ON issue_reports(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_property_id ON issue_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);

-- Contact Enquiries table
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status ON contact_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created_at ON contact_enquiries(created_at);

-- Subscription Plans table
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

-- User Subscriptions table
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Subscription Payments table
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

-- ============================================
-- Verification Queries
-- ============================================

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' AND column_name = 'monthly_rent';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name IN (
    'cancellation_date',
    'cancellation_type',
    'cancellation_charges',
    'refund_amount',
    'cancellation_reason',
    'cancelled_by'
  )
ORDER BY column_name;

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'notifications',
    'user_sessions',
    'activity_logs',
    'issue_reports',
    'contact_enquiries',
    'subscription_plans',
    'user_subscriptions',
    'subscription_payments'
  )
ORDER BY table_name;
