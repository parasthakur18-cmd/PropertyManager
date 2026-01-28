#!/usr/bin/env bash
# Get exact error messages for the three failing endpoints.
# Uses the same login flow as check-all-endpoints.sh (super-admin-login).

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
EMAIL="${2:-admin@hostezee.in}"
PASSWORD="${3:-admin@123}"
COOKIE_JAR="/tmp/api-cookies.txt"
RESP_FILE="/tmp/response.json"

echo "=== Getting exact error messages for failing endpoints ==="
echo "Base URL: $BASE_URL"
echo ""

echo "[1/2] Logging in..."
rm -f "$COOKIE_JAR"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/super-admin-login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "Login successful\|message.*successful"; then
  echo "✅ Login OK"
  # Small delay to ensure session is saved
  sleep 0.5
else
  echo "❌ Login failed:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "[2/2] Testing endpoints (showing full response bodies)..."
echo ""

for endpoint in "/api/bills/pending" "/api/bookings/checkout-reminders" "/api/orders/unmerged-cafe"; do
  echo "=========================================="
  echo "Testing: $endpoint"
  echo "=========================================="
  HTTP_CODE=$(curl -s -o "$RESP_FILE" -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL$endpoint")
  echo "HTTP Code: $HTTP_CODE"
  echo "Response:"
  if command -v jq >/dev/null 2>&1; then
    jq '.' "$RESP_FILE" 2>/dev/null || cat "$RESP_FILE"
  else
    cat "$RESP_FILE"
  fi
  echo ""
done

rm -f "$COOKIE_JAR" "$RESP_FILE"
