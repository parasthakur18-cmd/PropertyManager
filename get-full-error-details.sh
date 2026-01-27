#!/bin/bash

# Get full error details for the 3 failing endpoints

echo "=== Getting full error details ==="
echo ""

# Login first
echo "[1/3] Logging in..."
curl -s -c /tmp/test-cookies.txt -X POST http://127.0.0.1:3000/api/auth/super-admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostezee.in","password":"admin@123"}' > /dev/null

echo "✅ Login OK"
echo ""

# Test each endpoint and show full response
echo "[2/3] Testing endpoints..."
echo ""

FAILING_ENDPOINTS=(
  "/api/bills/pending"
  "/api/bookings/checkout-reminders"
  "/api/orders/unmerged-cafe"
)

for endpoint in "${FAILING_ENDPOINTS[@]}"; do
  echo "=========================================="
  echo "Testing: $endpoint"
  echo "=========================================="
  
  RESPONSE=$(curl -s -b /tmp/test-cookies.txt "http://127.0.0.1:3000$endpoint")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/test-cookies.txt "http://127.0.0.1:3000$endpoint")
  
  echo "HTTP Code: $HTTP_CODE"
  echo "Full Response:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  echo ""
done

echo "[3/3] Checking PM2 logs for recent errors..."
echo ""
pm2 logs propertymanager --lines 100 --err 2>/dev/null | grep -A 5 -B 5 "bills/pending\|checkout-reminders\|unmerged-cafe\|invalid input syntax" | tail -50
