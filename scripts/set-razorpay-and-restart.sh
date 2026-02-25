#!/bin/bash
# Load RAZORPAY_* from .env (if present) and restart PM2.
# Usage: add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to /var/www/myapp/.env then run:
#   cd /var/www/myapp && bash scripts/set-razorpay-and-restart.sh

set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "Loaded .env (RAZORPAY_KEY_ID set: $( [ -n "$RAZORPAY_KEY_ID" ] && echo yes || echo no ))"
fi
pm2 restart ecosystem.config.cjs
echo "PM2 restarted. Test Razorpay: open /api/razorpay/verify-keys when logged in."
