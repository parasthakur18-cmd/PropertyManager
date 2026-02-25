-- Create error_reports table for Report an Issue (Support) feature
CREATE TABLE IF NOT EXISTS error_reports (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  property_id INTEGER,
  page VARCHAR(255),
  error_message TEXT,
  error_details TEXT,
  user_description TEXT,
  browser_info TEXT,
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP,
  admin_notes TEXT,
  admin_reply TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
