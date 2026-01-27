#!/bin/bash
# Run schema fixes using the DATABASE_URL from environment

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Using default from ecosystem.config.cjs"
  DATABASE_URL="postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
fi

echo "Running schema fixes..."
echo "Using: ${DATABASE_URL:0:30}..."

psql "$DATABASE_URL" -f fix-schema-drift.sql

if [ $? -eq 0 ]; then
  echo "✅ Schema fixes applied successfully"
else
  echo "❌ Schema fixes failed. Trying alternative method..."
  # Try with explicit connection
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  export PGPASSWORD
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f fix-schema-drift.sql
fi
