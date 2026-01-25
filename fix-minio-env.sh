#!/bin/bash
# Script to fix MinIO environment variables in PM2

echo "=== Fixing MinIO Environment Variables ==="

# Check PM2 process name
echo ""
echo "1. Checking PM2 process name..."
pm2 list

echo ""
echo "2. Current PM2 environment (propertymanager):"
pm2 env propertymanager 2>/dev/null | grep -E "S3_|MINIO_" || echo "   No S3/MinIO variables found"

echo ""
echo "3. Updating ecosystem.config.cjs..."
# The variables should already be in ecosystem.config.cjs
# Just need to restart PM2 with --update-env

echo ""
echo "4. Restarting PM2 with updated environment..."
pm2 restart propertymanager --update-env

echo ""
echo "5. Verifying environment variables after restart..."
sleep 2
pm2 env propertymanager | grep -E "S3_|MINIO_" || echo "   Still no variables found - check ecosystem.config.cjs"

echo ""
echo "=== Done ==="
echo "If variables are still missing, manually check ecosystem.config.cjs file"
