#!/bin/bash

echo "=========================================="
echo "Checking VPS Upload Fix Status"
echo "=========================================="
echo ""

# 1. Check if code is updated
echo "1. Checking latest code..."
cd /var/www/myapp
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "   ✓ Code is up to date"
else
    echo "   ✗ Code needs update - run: git pull origin main"
fi
echo ""

# 2. Check PM2 status
echo "2. Checking PM2 status..."
pm2 list | grep propertymanager
echo ""

# 3. Check recent logs for upload-related errors
echo "3. Checking recent error logs..."
echo "   Last 20 lines of error log:"
tail -20 /var/www/myapp/logs/pm2-error.log | grep -E "(Upload|VPS|guest-id-proof|Object)" || echo "   No recent upload errors found"
echo ""

# 4. Check if upload directory exists
echo "4. Checking upload directory..."
if [ -d "/var/www/myapp/uploads/id-proofs" ]; then
    echo "   ✓ Upload directory exists"
    FILE_COUNT=$(ls -1 /var/www/myapp/uploads/id-proofs 2>/dev/null | wc -l)
    echo "   Files in directory: $FILE_COUNT"
    if [ $FILE_COUNT -gt 0 ]; then
        echo "   Recent files:"
        ls -lth /var/www/myapp/uploads/id-proofs | head -5
    fi
else
    echo "   ✗ Upload directory doesn't exist (will be created on first upload)"
fi
echo ""

# 5. Check if objects serving route exists
echo "5. Checking if objects route is configured..."
if grep -q "/objects/vps-uploads" /var/www/myapp/dist/index.js 2>/dev/null; then
    echo "   ✓ Objects serving route found in build"
else
    echo "   ✗ Objects route not found - rebuild needed"
fi
echo ""

# 6. Check environment variables
echo "6. Checking environment variables..."
pm2 env propertymanager | grep -E "(S3_|MINIO_|DISABLE_REPLIT)" || echo "   No MinIO/S3 vars found (using VPS fallback)"
echo ""

echo "=========================================="
echo "Test Steps:"
echo "=========================================="
echo "1. Open browser: http://72.62.199.34:3000"
echo "2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "3. Go to Bookings > New Booking"
echo "4. Try uploading an ID proof"
echo "5. Check logs: pm2 logs propertymanager --lines 50"
echo ""
