#!/bin/bash

# Update Property Manager Application on VPS
# This script builds and restarts the application

set -e  # Exit on error

echo "🔄 Starting application update..."

# Navigate to app directory (adjust path if needed)
cd /var/www/myapp || cd "$(dirname "$0")"

echo "📦 Building application..."
npm run build

echo "🔄 Restarting PM2 application..."
pm2 restart propertymanager

echo "✅ Update complete!"
echo ""
echo "📊 Checking status..."
pm2 status

echo ""
echo "📋 Recent logs (last 20 lines):"
pm2 logs propertymanager --lines 20 --nostream
