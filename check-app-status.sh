#!/bin/bash

echo "=== Checking Application Status ==="
echo ""

echo "[1] PM2 Status:"
pm2 status
echo ""

echo "[2] Checking if dist/index.js exists:"
if [ -f "/var/www/myapp/dist/index.js" ]; then
  echo "✅ dist/index.js exists"
  ls -lh /var/www/myapp/dist/index.js
else
  echo "❌ dist/index.js NOT FOUND!"
  echo "   The build may have failed or the file is in a different location"
fi
echo ""

echo "[3] Recent PM2 Error Logs (last 50 lines):"
pm2 logs propertymanager --err --lines 50 --nostream | tail -30
echo ""

echo "[4] Recent PM2 Output Logs (last 30 lines):"
pm2 logs propertymanager --out --lines 30 --nostream | tail -20
echo ""

echo "[5] Checking if port 3000 is in use:"
if lsof -i :3000 > /dev/null 2>&1; then
  echo "✅ Port 3000 is in use:"
  lsof -i :3000
else
  echo "❌ Port 3000 is NOT in use - application is not listening"
fi
echo ""

echo "[6] PM2 Process Details:"
pm2 describe propertymanager
echo ""

echo "=== Diagnostic Complete ==="
