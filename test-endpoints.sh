#!/bin/bash

echo "=== Testing the three previously failing endpoints ==="
echo ""

# First, login to get session cookie
echo "[1/4] Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}' \
  -c /tmp/cookies.txt)

# Extract session cookie
SESSION_COOKIE=$(grep -o 'connect.sid=[^;]*' /tmp/cookies.txt 2>/dev/null || echo "")

if [ -z "$SESSION_COOKIE" ]; then
  echo "⚠️  Could not get session cookie. Please login manually and update the script with valid credentials."
  echo "   Or test endpoints directly with your session cookie."
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test endpoint 1
echo "[2/4] Testing /api/bills/pending..."
BILLS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://127.0.0.1:3000/api/bills/pending \
  -H "Cookie: $SESSION_COOKIE")
BILLS_HTTP_CODE=$(echo "$BILLS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BILLS_BODY=$(echo "$BILLS_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$BILLS_HTTP_CODE" = "200" ]; then
  echo "✅ /api/bills/pending - Status: $BILLS_HTTP_CODE"
  echo "   Response: $(echo "$BILLS_BODY" | head -c 100)..."
else
  echo "❌ /api/bills/pending - Status: $BILLS_HTTP_CODE"
  echo "   Response: $BILLS_BODY"
fi
echo ""

# Test endpoint 2
echo "[3/4] Testing /api/bookings/checkout-reminders..."
CHECKOUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://127.0.0.1:3000/api/bookings/checkout-reminders \
  -H "Cookie: $SESSION_COOKIE")
CHECKOUT_HTTP_CODE=$(echo "$CHECKOUT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
CHECKOUT_BODY=$(echo "$CHECKOUT_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$CHECKOUT_HTTP_CODE" = "200" ]; then
  echo "✅ /api/bookings/checkout-reminders - Status: $CHECKOUT_HTTP_CODE"
  echo "   Response: $CHECKOUT_BODY"
else
  echo "❌ /api/bookings/checkout-reminders - Status: $CHECKOUT_HTTP_CODE"
  echo "   Response: $CHECKOUT_BODY"
fi
echo ""

# Test endpoint 3
echo "[4/4] Testing /api/orders/unmerged-cafe..."
ORDERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://127.0.0.1:3000/api/orders/unmerged-cafe \
  -H "Cookie: $SESSION_COOKIE")
ORDERS_HTTP_CODE=$(echo "$ORDERS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
ORDERS_BODY=$(echo "$ORDERS_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$ORDERS_HTTP_CODE" = "200" ]; then
  echo "✅ /api/orders/unmerged-cafe - Status: $ORDERS_HTTP_CODE"
  echo "   Response: $(echo "$ORDERS_BODY" | head -c 100)..."
else
  echo "❌ /api/orders/unmerged-cafe - Status: $ORDERS_HTTP_CODE"
  echo "   Response: $ORDERS_BODY"
fi
echo ""

# Cleanup
rm -f /tmp/cookies.txt

echo "=== Test Complete ==="
