#!/bin/bash

# Check application status, logs, and test APIs

echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Recent Error Logs (last 20 lines):"
pm2 logs propertymanager --err --lines 20 --nostream

echo ""
echo "📋 Recent Output Logs (last 20 lines):"
pm2 logs propertymanager --out --lines 20 --nostream

echo ""
echo "🔍 Testing API Endpoints..."
echo ""

BASE_URL="http://127.0.0.1:3000"

# Test the previously failing endpoints
echo "Testing /api/bills/pending..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/bills/pending" -H "Cookie: $(cat /tmp/session_cookie 2>/dev/null || echo '')" || echo "❌ Failed"

echo ""
echo "Testing /api/bookings/checkout-reminders..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/bookings/checkout-reminders" -H "Cookie: $(cat /tmp/session_cookie 2>/dev/null || echo '')" || echo "❌ Failed"

echo ""
echo "Testing /api/orders/unmerged-cafe..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/orders/unmerged-cafe" -H "Cookie: $(cat /tmp/session_cookie 2>/dev/null || echo '')" || echo "❌ Failed"

echo ""
echo "Testing /api/audit-logs..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/audit-logs" -H "Cookie: $(cat /tmp/session_cookie 2>/dev/null || echo '')" || echo "❌ Failed"

echo ""
echo "✅ Status check complete!"
