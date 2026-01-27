#!/bin/bash
# Apply schema fixes - handles database connection properly

echo "=== Applying Schema Fixes ==="

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

# Run the SQL script
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f fix-schema-drift.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Schema fixes applied successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. pm2 restart propertymanager"
  echo "  2. sleep 5"
  echo "  3. ./check-all-endpoints.sh"
else
  echo ""
  echo "❌ Schema fixes failed. Please check:"
  echo "  1. Database credentials are correct"
  echo "  2. PostgreSQL is running"
  echo "  3. User has ALTER TABLE permissions"
  exit 1
fi
