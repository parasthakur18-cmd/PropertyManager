#!/bin/bash

# Get detailed PM2 error logs for the 3 failing endpoints

echo "=== Getting PM2 Error Logs ==="
echo ""

# Get recent error logs
echo "Recent error logs (last 100 lines):"
pm2 logs propertymanager --lines 100 --err 2>/dev/null | tail -50

echo ""
echo "=== Searching for specific errors ==="
echo ""

# Search for NaN, integer, and syntax errors
pm2 logs propertymanager --lines 200 --err 2>/dev/null | grep -i "NaN\|invalid input\|bills/pending\|checkout-reminders\|unmerged-cafe" | tail -30

echo ""
echo "=== Full error context ==="
echo ""

# Get full error with context
pm2 logs propertymanager --lines 200 2>/dev/null | grep -A 10 -B 5 "invalid input\|NaN\|ERROR" | tail -50
