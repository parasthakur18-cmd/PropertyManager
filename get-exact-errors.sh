#!/usr/bin/env bash
# Get exact error messages from PM2 logs

echo "=== Getting exact error messages from PM2 logs ==="
echo ""

# Login first to get cookies
curl -s -c /tmp/error-check-cookies.txt -X POST http://127.0.0.1:3000/api/auth/super-admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostezee.in","password":"admin@123"}' > /dev/null

# Test each failing endpoint and show full error
FAILING_ENDPOINTS=(
  "/api/attendance/stats"
  "/api/bills/pending"
  "/api/bookings/checkout-reminders"
  "/api/change-approvals"
  "/api/leases"
  "/api/message-templates"
  "/api/orders/unmerged-cafe"
  "/api/salary-advances"
  "/api/subscription/current"
  "/api/super-admin/subscription-analytics"
)

for endpoint in "${FAILING_ENDPOINTS[@]}"; do
  echo "=========================================="
  echo "Testing: $endpoint"
  echo "=========================================="
  RESPONSE=$(curl -s -b /tmp/error-check-cookies.txt "http://127.0.0.1:3000$endpoint")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/error-check-cookies.txt "http://127.0.0.1:3000$endpoint")
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $RESPONSE"
  echo ""
done

echo ""
echo "=== Checking PM2 error logs ==="
pm2 logs propertymanager --lines 50 --err 2>/dev/null | grep -i "error\|column\|relation" | tail -30
