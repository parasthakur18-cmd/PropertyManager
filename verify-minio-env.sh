#!/bin/bash
# Script to verify MinIO environment variables in PM2 process

echo "=== Verifying MinIO Environment Variables ==="

# Method 1: Check PM2 ecosystem config
echo ""
echo "1. Checking ecosystem.config.cjs for S3 variables..."
grep -E "S3_ENDPOINT|S3_ACCESS_KEY|S3_SECRET_KEY|S3_BUCKET" ecosystem.config.cjs | head -4

# Method 2: Check if variables are in PM2 process
echo ""
echo "2. Checking PM2 process environment (via inspect)..."
pm2 describe propertymanager | grep -E "S3_|MINIO_" || echo "   Variables not found in process description"

# Method 3: Test via API endpoint (if server is running)
echo ""
echo "3. Testing MinIO configuration via server logs..."
echo "   Check server logs for MinIO initialization errors:"
echo "   pm2 logs propertymanager --lines 50 | grep -i 'minio\|s3\|storage'"

# Method 4: Direct test - make a test API call
echo ""
echo "4. To test upload, try uploading a file in the application"
echo "   and check logs: pm2 logs propertymanager --lines 20"

echo ""
echo "=== Quick Test ==="
echo "Run this to see if MinIO is configured in the running app:"
echo "curl -s http://localhost:3000/api/objects/upload -X POST -H 'Cookie: connect.sid=...' 2>&1 | head -5"
echo ""
echo "Or check server startup logs for MinIO errors:"
echo "pm2 logs propertymanager --lines 100 | grep -E 'MinIO|S3|storage|upload'"
