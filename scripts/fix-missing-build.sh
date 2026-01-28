#!/bin/bash
# Fix missing frontend build files on VPS
# Run this on VPS: bash scripts/fix-missing-build.sh

set -e

echo "🔧 Fixing missing build files..."
cd /var/www/myapp

echo "📦 Installing dependencies..."
npm ci || npm install

echo "🔨 Building application..."
npm run build

echo "🔍 Verifying build..."
if [ ! -d "dist/public" ]; then
  echo "❌ ERROR: dist/public directory not found!"
  ls -la dist/ 2>/dev/null || echo "dist directory doesn't exist"
  exit 1
fi

if [ ! -f "dist/public/index.html" ]; then
  echo "❌ ERROR: dist/public/index.html not found!"
  ls -la dist/public/ 2>/dev/null || echo "dist/public directory is empty"
  exit 1
fi

if [ ! -f "dist/index.js" ]; then
  echo "❌ ERROR: dist/index.js (backend) not found!"
  exit 1
fi

echo "✅ Build verification passed!"

echo "🔄 Restarting PM2..."
pm2 restart propertymanager --update-env || pm2 start ecosystem.config.cjs

echo "✅ Done! Frontend build files are now available."
