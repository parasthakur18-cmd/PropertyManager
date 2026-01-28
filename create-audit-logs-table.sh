#!/bin/bash
# Create audit_logs table if it doesn't exist

echo "=== Creating audit_logs table ==="

# Get DATABASE_URL from PM2 environment or use default
if [ -z "$DATABASE_URL" ]; then
  # Try to get from PM2
  DATABASE_URL=$(pm2 env 0 | grep DATABASE_URL | cut -d'=' -f2- | tr -d "'\"")
  
  if [ -z "$DATABASE_URL" ]; then
    # Fallback to default from ecosystem.config.cjs
    DATABASE_URL="postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
    echo "⚠️  Using default DATABASE_URL (may need to update)"
  fi
fi

echo "Connecting to database..."

# Extract connection details
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo "Host: $DB_HOST"
echo "Port: ${DB_PORT:-5432}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASS"

# Create the table
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_role VARCHAR(50),
  property_context VARCHAR(255)[],
  change_set JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
SQL

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ audit_logs table created successfully!"
  echo ""
  echo "Next step:"
  echo "  pm2 restart propertymanager --update-env"
else
  echo ""
  echo "❌ Failed to create audit_logs table. Please check:"
  echo "  1. Database credentials are correct"
  echo "  2. PostgreSQL is running"
  echo "  3. User has CREATE TABLE permissions"
  exit 1
fi
