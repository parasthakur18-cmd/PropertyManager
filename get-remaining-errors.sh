#!/bin/bash

# Get exact error messages for the 3 remaining failing endpoints

echo "=== Getting exact error messages for remaining 3 endpoints ==="
echo ""

# Login first
echo "[1/2] Logging in..."
LOGIN_RESPONSE=$(curl -s -c /tmp/test-cookies.txt -X POST http://127.0.0.1:3000/api/auth/super-admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostezee.in","password":"admin@123"}')

if echo "$LOGIN_RESPONSE" | grep -q "success\|user"; then
  echo "✅ Login OK"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "[2/2] Testing failing endpoints..."
echo ""

# Test each failing endpoint
FAILING_ENDPOINTS=(
  "/api/bills/pending"
  "/api/bookings/checkout-reminders"
  "/api/orders/unmerged-cafe"
)

for endpoint in "${FAILING_ENDPOINTS[@]}"; do
  echo "=========================================="
  echo "Testing: $endpoint"
  echo "=========================================="
  
  HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" -b /tmp/test-cookies.txt "http://127.0.0.1:3000$endpoint")
  RESPONSE=$(cat /tmp/response.json)
  
  echo "HTTP Code: $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "500" ]; then
    # Try to extract error message
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//;s/"$//')
    if [ -z "$ERROR_MSG" ]; then
      ERROR_MSG=$(echo "$RESPONSE" | head -c 200)
    fi
    echo "Error: $ERROR_MSG"
  else
    echo "Response: $(echo "$RESPONSE" | head -c 200)"
  fi
  echo ""
done

echo "=== Checking PM2 error logs ==="
echo ""
pm2 logs propertymanager --lines 50 --err 2>/dev/null | grep -i "error\|500" | tail -20
