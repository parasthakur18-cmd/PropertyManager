-- ============================================
-- QUICK FIX: OTP Tables for Mobile Login
-- Run this to fix "relation otp_tokens does not exist" error
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- OTP Tokens table (for mobile login)
CREATE TABLE IF NOT EXISTS otp_tokens (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  otp VARCHAR(6) NOT NULL,
  purpose VARCHAR(20) NOT NULL DEFAULT 'login',
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_phone ON otp_tokens(phone);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_tokens(email);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);

-- Password Reset OTPs table (for forgot password)
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  phone VARCHAR(20),
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  otp VARCHAR(6) NOT NULL,
  reset_token VARCHAR(100),
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_phone ON password_reset_otps(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_reset_token ON password_reset_otps(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

SELECT '✅ OTP tables created successfully!' as status;
