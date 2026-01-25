#!/bin/bash
# Script to check MinIO setup and troubleshoot upload issues

echo "=== Checking MinIO Setup ==="

# Check if minio package is installed
echo ""
echo "1. Checking if minio package is installed..."
if npm list minio > /dev/null 2>&1; then
    echo "✅ minio package is installed"
else
    echo "❌ minio package is NOT installed"
    echo "   Run: npm install minio"
fi

# Check environment variables
echo ""
echo "2. Checking MinIO environment variables..."
if [ -n "$S3_ENDPOINT" ] || [ -n "$MINIO_ENDPOINT" ]; then
    echo "✅ S3_ENDPOINT/MINIO_ENDPOINT is set"
else
    echo "❌ S3_ENDPOINT/MINIO_ENDPOINT is NOT set"
fi

if [ -n "$S3_ACCESS_KEY" ] || [ -n "$MINIO_ACCESS_KEY" ]; then
    echo "✅ S3_ACCESS_KEY/MINIO_ACCESS_KEY is set"
else
    echo "❌ S3_ACCESS_KEY/MINIO_ACCESS_KEY is NOT set"
fi

if [ -n "$S3_SECRET_KEY" ] || [ -n "$MINIO_SECRET_KEY" ]; then
    echo "✅ S3_SECRET_KEY/MINIO_SECRET_KEY is set"
else
    echo "❌ S3_SECRET_KEY/MINIO_SECRET_KEY is NOT set"
fi

# Check if MinIO server is accessible
echo ""
echo "3. Checking MinIO server connectivity..."
S3_ENDPOINT=${S3_ENDPOINT:-$MINIO_ENDPOINT}
S3_ENDPOINT=${S3_ENDPOINT:-"http://127.0.0.1:9000"}

if curl -s --connect-timeout 3 "$S3_ENDPOINT" > /dev/null 2>&1; then
    echo "✅ MinIO server is accessible at $S3_ENDPOINT"
else
    echo "❌ MinIO server is NOT accessible at $S3_ENDPOINT"
    echo "   Check if MinIO server is running"
fi

# Check PM2 environment
echo ""
echo "4. Checking PM2 environment variables..."
pm2 env propertymanager | grep -E "S3_|MINIO_" || echo "   No S3/MinIO variables found in PM2 env"

echo ""
echo "=== Next Steps ==="
echo "1. If minio package is missing: npm install minio && npm run build"
echo "2. If env vars are missing: Update ecosystem.config.cjs and restart PM2"
echo "3. If MinIO server is not accessible: Start MinIO server"
echo "4. Check server logs: pm2 logs propertymanager --lines 50"
