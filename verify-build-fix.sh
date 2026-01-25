#!/bin/bash

echo "=========================================="
echo "Verifying Build Fix"
echo "=========================================="
echo ""

cd /var/www/myapp

# 1. Check frontend build location
echo "1. Checking frontend build..."
if [ -d "dist/public" ]; then
    echo "   ✓ Frontend build directory exists: dist/public"
    JS_FILES=$(find dist/public -name "*.js" -type f 2>/dev/null | wc -l)
    echo "   JavaScript files: $JS_FILES"
    
    # Check if fix is in any JS file
    if find dist/public -name "*.js" -type f -exec grep -l "Exit early for VPS upload" {} \; 2>/dev/null | head -1 > /dev/null; then
        echo "   ✓ Frontend fix found in build"
    else
        echo "   ✗ Frontend fix NOT found - need to rebuild"
    fi
else
    echo "   ✗ Frontend build directory missing: dist/public"
    echo "   → Need to rebuild: npm run build"
fi
echo ""

# 2. Check backend build
echo "2. Checking backend build..."
if [ -f "dist/index.js" ]; then
    echo "   ✓ Backend build exists: dist/index.js"
    
    # Check for VPS upload fix
    if grep -q "VPS upload, returning objectPath\|VPS upload file found\|VPS upload URL detected" dist/index.js 2>/dev/null; then
        echo "   ✓ Backend fix found in build"
    else
        echo "   ✗ Backend fix NOT found - need to rebuild"
    fi
else
    echo "   ✗ Backend build missing: dist/index.js"
    echo "   → Need to rebuild: npm run build"
fi
echo ""

# 3. Check source code
echo "3. Checking source code..."
if grep -q "Exit early for VPS upload" client/src/components/IdVerificationUpload.tsx 2>/dev/null; then
    echo "   ✓ Source code has frontend fix"
else
    echo "   ✗ Source code missing frontend fix"
fi

if grep -q "VPS upload, returning objectPath\|VPS upload file found" server/routes.ts 2>/dev/null; then
    echo "   ✓ Source code has backend fix"
else
    echo "   ✗ Source code missing backend fix"
fi
echo ""

# 4. Check upload directory
echo "4. Checking upload directory..."
if [ -d "uploads/id-proofs" ]; then
    echo "   ✓ Upload directory exists"
    FILE_COUNT=$(ls -1 uploads/id-proofs 2>/dev/null | wc -l)
    echo "   Files: $FILE_COUNT"
else
    echo "   ⚠ Upload directory doesn't exist (will be created on first upload)"
fi
echo ""

echo "=========================================="
echo "Summary:"
echo "=========================================="
if [ -d "dist/public" ] && [ -f "dist/index.js" ]; then
    echo "Build exists - checking if fixes are included..."
    FRONTEND_FIX=$(find dist/public -name "*.js" -type f -exec grep -l "Exit early for VPS upload" {} \; 2>/dev/null | wc -l)
    BACKEND_FIX=$(grep -c "VPS upload, returning objectPath\|VPS upload file found" dist/index.js 2>/dev/null || echo "0")
    
    if [ "$FRONTEND_FIX" -gt 0 ] && [ "$BACKEND_FIX" -gt 0 ]; then
        echo "✓ Both fixes are in the build"
    else
        echo "✗ Fixes missing - REBUILD NEEDED:"
        echo "  npm run build"
        echo "  pm2 restart propertymanager --update-env"
    fi
else
    echo "✗ Build missing - REBUILD NEEDED:"
    echo "  npm run build"
    echo "  pm2 restart propertymanager --update-env"
fi
echo ""
