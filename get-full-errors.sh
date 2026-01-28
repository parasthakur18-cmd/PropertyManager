#!/usr/bin/env bash
# Show PM2 log context for the three failing endpoints.

set -euo pipefail

echo "=== Full error context for failing endpoints ==="
echo ""

echo "[1/2] Error log (filtered)"
pm2 logs propertymanager --err --lines 800 --nostream \
  | grep -n -E "invalid input|22P02|bills/pending|checkout-reminders|unmerged-cafe|\\[Storage\\]|\\[/api/" \
  | tail -250 || true

echo ""
echo "[2/2] Output log (filtered)"
pm2 logs propertymanager --out --lines 800 --nostream \
  | grep -n -E "GET /api/bills/pending|GET /api/bookings/checkout-reminders|GET /api/orders/unmerged-cafe|invalid input|22P02" \
  | tail -250 || true

