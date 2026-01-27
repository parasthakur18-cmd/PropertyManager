#!/bin/bash
# Get exact error messages for the three failing endpoints

BASE_URL="http://127.0.0.1:3000"

echo "=== Getting exact error messages for failing endpoints ==="
echo ""

# Login first
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostezee.in","password":"admin@123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token\|user"; then
  echo "✅ Login OK"
else
  echo "❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "Testing endpoints and capturing full error messages..."
echo ""

# Test each endpoint and show full response
for endpoint in "/api/bills/pending" "/api/bookings/checkout-reminders" "/api/orders/unmerged-cafe"; do
  echo "=========================================="
  echo "Testing: $endpoint"
  echo "=========================================="
  HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" -b /tmp/cookies.txt "$BASE_URL$endpoint")
  echo "HTTP Code: $HTTP_CODE"
  echo "Response:"
  cat /tmp/response.json | jq '.' 2>/dev/null || cat /tmp/response.json
  echo ""
done

rm -f /tmp/cookies.txt /tmp/response.json
