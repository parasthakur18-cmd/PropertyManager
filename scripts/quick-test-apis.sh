#!/bin/bash
# Quick test for the 3 fixed APIs
# Usage: bash scripts/quick-test-apis.sh

BASE_URL="http://127.0.0.1:3000"
EMAIL="admin@hostezee.in"
PASSWORD="admin@123"

echo "🔐 Logging in..."
COOKIE_FILE="/tmp/test_cookies_$$.txt"

# Login
curl -s -c "$COOKIE_FILE" -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  "${BASE_URL}/api/auth/super-admin-login" >/dev/null

if [ ! -f "$COOKIE_FILE" ] || ! grep -q "hostezee.sid" "$COOKIE_FILE" 2>/dev/null; then
    echo "❌ Login failed!"
    rm -f "$COOKIE_FILE"
    exit 1
fi

COOKIE=$(grep "hostezee.sid" "$COOKIE_FILE" | awk '{print $7}')
COOKIE_HEADER="hostezee.sid=${COOKIE}"

echo "✅ Login successful"
echo ""
echo "🧪 Testing fixed endpoints:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint() {
    local endpoint=$1
    local name=$2
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Cookie: ${COOKIE_HEADER}" "${BASE_URL}${endpoint}")
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ ${name} - OK (200)"
        if [ ${#body} -lt 100 ]; then
            echo "   Response: ${body}"
        fi
    else
        echo "❌ ${name} - Error (${http_code})"
        if [ ${#body} -lt 150 ]; then
            echo "   Response: ${body}"
        fi
    fi
}

test_endpoint "/api/bills/pending" "Pending Bills"
test_endpoint "/api/orders/unmerged-cafe" "Unmerged Café Orders"
test_endpoint "/api/bookings/checkout-reminders" "Checkout Reminders"

rm -f "$COOKIE_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test complete!"
