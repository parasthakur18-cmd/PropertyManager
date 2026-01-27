-- Fix missing database tables and columns
-- Run these commands on your VPS PostgreSQL database

-- 1. Add cancellation_charges column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_charges NUMERIC(10, 2) DEFAULT 0;

-- 2. Create notifications table
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

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Verify tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'cancellation_charges';

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'notifications';
