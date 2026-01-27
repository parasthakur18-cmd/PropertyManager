#!/bin/bash
echo "=== Checking for recent errors in PM2 logs ==="
echo ""
echo "Recent errors (last 200 lines):"
pm2 logs propertymanager --err --lines 200 --nostream | tail -100
echo ""
echo "=== Checking for 'invalid input' errors ==="
pm2 logs propertymanager --err --lines 1000 --nostream | grep -i "invalid input" | tail -20
echo ""
echo "=== Checking for errors from the three endpoints ==="
pm2 logs propertymanager --err --lines 1000 --nostream | grep -E "(/api/bills/pending|/api/bookings/checkout-reminders|/api/orders/unmerged-cafe)" | tail -30
