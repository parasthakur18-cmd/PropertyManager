#!/bin/bash
# Script to run OTP tables fix using DATABASE_URL from environment

# Method 1: If DATABASE_URL is set in environment (from PM2 or .env)
if [ -n "$DATABASE_URL" ]; then
    echo "Using DATABASE_URL from environment..."
    psql "$DATABASE_URL" -f fix-otp-tables.sql
    exit $?
fi

# Method 2: If DATABASE_URL is in ecosystem.config.cjs, extract it
# Or use the connection string directly
echo "DATABASE_URL not found in environment."
echo "Please run one of these commands:"
echo ""
echo "Option 1: Set DATABASE_URL and run:"
echo "  export DATABASE_URL='postgresql://myappuser:StrongPassword321@localhost:5432/myappdb'"
echo "  psql \"\$DATABASE_URL\" -f fix-otp-tables.sql"
echo ""
echo "Option 2: Use connection string directly:"
echo "  psql 'postgresql://myappuser:StrongPassword321@localhost:5432/myappdb' -f fix-otp-tables.sql"
echo ""
echo "Option 3: Connect with individual parameters:"
echo "  psql -h localhost -U myappuser -d myappdb -f fix-otp-tables.sql"
echo ""
echo "Replace 'myappuser', 'StrongPassword321', 'myappdb' with your actual values."
