#!/bin/bash

echo "=== Testing the three previously failing endpoints ==="
echo ""

# Check if session cookie is provided as argument
if [ -n "$1" ]; then
  SESSION_COOKIE="$1"
  echo "✅ Using provided session cookie"
else
  # Try to login with environment variables or default credentials
  EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  PASSWORD="${ADMIN_PASSWORD:-}"
  
  if [ -z "$PASSWORD" ]; then
    echo "⚠️  No session cookie provided and no ADMIN_PASSWORD set."
    echo ""
    echo "Usage options:"
    echo "  1. Provide session cookie: ./test-endpoints.sh 'connect.sid=YOUR_SESSION_ID'"
    echo "  2. Set credentials: ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpass ./test-endpoints.sh"
    echo "  3. Test manually through your application UI"
    echo ""
    echo "To get your session cookie:"
    echo "  - Open browser dev tools (F12)"
    echo "  - Go to Application/Storage > Cookies"
    echo "  - Copy the 'connect.sid' value"
    echo ""
    exit 1
  fi
  
  echo "[1/4] Logging in with email: $EMAIL..."
  LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    -c /tmp/cookies.txt)
  
  # Extract session cookie
  SESSION_COOKIE=$(grep -o 'connect.sid=[^;]*' /tmp/cookies.txt 2>/dev/null || echo "")
  
  if [ -z "$SESSION_COOKIE" ]; then
    echo "❌ Login failed. Please check credentials or provide session cookie manually."
    exit 1
  fi
  
  echo "✅ Login successful"
fi

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

echo ""
echo "=== Summary ==="
if [ "$BILLS_HTTP_CODE" = "200" ] && [ "$CHECKOUT_HTTP_CODE" = "200" ] && [ "$ORDERS_HTTP_CODE" = "200" ]; then
  echo "✅ All three endpoints returned 200 OK!"
  echo "   The fixes are working correctly."
else
  echo "⚠️  Some endpoints may still have issues:"
  [ "$BILLS_HTTP_CODE" != "200" ] && echo "   - /api/bills/pending returned $BILLS_HTTP_CODE"
  [ "$CHECKOUT_HTTP_CODE" != "200" ] && echo "   - /api/bookings/checkout-reminders returned $CHECKOUT_HTTP_CODE"
  [ "$ORDERS_HTTP_CODE" != "200" ] && echo "   - /api/orders/unmerged-cafe returned $ORDERS_HTTP_CODE"
  echo ""
  echo "Check PM2 logs for details:"
  echo "   pm2 logs propertymanager --err --lines 50"
fi

echo "=== Test Complete ==="
