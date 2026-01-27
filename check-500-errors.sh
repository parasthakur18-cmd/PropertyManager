#!/usr/bin/env bash
# Quick script to check 500 errors from PM2 logs

echo "=== Checking PM2 logs for 500 errors ==="
echo ""

# Get recent error logs
pm2 logs propertymanager --lines 200 --err | grep -i "500\|error\|relation\|column" | tail -50

echo ""
echo "=== Checking specific failing endpoints ==="
echo ""

# Test specific endpoints that are failing
ENDPOINTS=(
  "/api/change-approvals"
  "/api/bills/pending"
  "/api/attendance/stats"
  "/api/salary-advances"
  "/api/leases"
  "/api/message-templates"
  "/api/orders/unmerged-cafe"
  "/api/subscription/current"
  "/api/super-admin/subscription-analytics"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "HTTP: %{http_code}\n" \
    -b /tmp/api-check-cookies.txt \
    "http://127.0.0.1:3000$endpoint" 2>&1 | head -1
done
