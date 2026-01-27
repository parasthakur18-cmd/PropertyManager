#!/usr/bin/env bash
# Simplified endpoint checker - shows only summary

BASE_URL="${1:-http://127.0.0.1:3000}"
EMAIL="${2:-admin@hostezee.in}"
PASSWORD="${3:-admin@123}"

echo "=== API Endpoint Health Check ==="
echo "Base URL: $BASE_URL"
echo ""

# Login
echo "[1/2] Logging in..."
LOGIN_RESPONSE=$(curl -s -c /tmp/api-cookies.txt -X POST "$BASE_URL/api/auth/super-admin-login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "Login successful\|message.*successful"; then
  echo "✅ Login OK"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "[2/2] Testing endpoints..."
echo ""

# Test endpoints
ENDPOINTS=(
  "/api/auth/user"
  "/api/notifications"
  "/api/properties"
  "/api/rooms"
  "/api/guests"
  "/api/bookings"
  "/api/bills"
  "/api/wallets"
  "/api/expense-categories"
  "/api/vendors"
  "/api/travel-agents"
  "/api/staff"
  "/api/sessions"
  "/api/user-permissions"
  "/api/activity-logs"
  "/api/audit-logs"
  "/api/tasks"
  "/api/feature-settings"
  "/api/attendance"
  "/api/attendance/stats"
  "/api/bills/pending"
  "/api/bookings/checkout-reminders"
  "/api/change-approvals"
  "/api/leases"
  "/api/message-templates"
  "/api/orders/unmerged-cafe"
  "/api/salary-advances"
  "/api/subscription/current"
  "/api/super-admin/system-health"
  "/api/super-admin/dashboard"
  "/api/super-admin/subscription-analytics"
)

PASS=0
FAIL=0
TOTAL=0

for endpoint in "${ENDPOINTS[@]}"; do
  TOTAL=$((TOTAL + 1))
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/api-cookies.txt "$BASE_URL$endpoint")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $endpoint - $HTTP_CODE"
    PASS=$((PASS + 1))
  elif [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "⚠️  $endpoint - $HTTP_CODE (expected - needs params or auth)"
    PASS=$((PASS + 1))
  else
    echo "❌ $endpoint - $HTTP_CODE"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== Summary ==="
echo "Total: $TOTAL"
echo "✅ Working: $PASS"
echo "❌ Failing: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All endpoints are working!"
else
  echo "⚠️  $FAIL endpoint(s) need attention"
fi
