#!/bin/bash

# Fix missing audit_logs table
# This script runs the database migration to create missing tables

set -e  # Exit on error

echo "🔧 Fixing missing audit_logs table..."

# Navigate to app directory
cd /var/www/myapp || cd "$(dirname "$0")"

echo "📦 Pushing database schema changes..."
npm run db:push

echo "✅ Database schema updated!"
echo ""
echo "🔄 Restarting PM2 to apply changes..."
pm2 restart propertymanager

echo ""
echo "✅ Done! The audit_logs table should now exist."
echo "📊 Check status: pm2 logs propertymanager --lines 20"
