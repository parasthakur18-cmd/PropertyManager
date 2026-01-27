#!/bin/bash

echo "=========================================="
echo "Verifying Frontend Build"
echo "=========================================="
echo ""

cd /var/www/myapp

# 1. Check if frontend build includes the VPS upload fix
echo "1. Checking if frontend build has VPS upload fix..."
if grep -q "Exit early for VPS upload" dist/client/index.html 2>/dev/null || \
   grep -q "Exit early for VPS upload" dist/assets/*.js 2>/dev/null; then
    echo "   ✓ Frontend build includes VPS upload fix"
else
    echo "   ✗ Frontend build might be old - checking build timestamp..."
    if [ -f "dist/client/index.html" ]; then
        echo "   Build time: $(stat -c %y dist/client/index.html 2>/dev/null || stat -f %Sm dist/client/index.html 2>/dev/null)"
    fi
    echo "   → Need to rebuild: npm run build"
fi
echo ""

# 2. Check if the component code has the fix
echo "2. Checking source code for VPS upload fix..."
if grep -q "Exit early for VPS upload" client/src/components/IdVerificationUpload.tsx; then
    echo "   ✓ Source code has the fix"
else
    echo "   ✗ Source code doesn't have the fix - need to pull latest code"
fi
echo ""

# 3. Check build output
echo "3. Checking build output..."
if [ -d "dist/client" ]; then
    echo "   ✓ Client build directory exists"
    JS_FILES=$(find dist/client -name "*.js" -type f | wc -l)
    echo "   JavaScript files: $JS_FILES"
else
    echo "   ✗ Client build directory missing - need to rebuild"
fi
echo ""

# 4. Check if server build has the fix
echo "4. Checking server build for VPS upload fix..."
if grep -q "VPS upload, returning objectPath" dist/index.js 2>/dev/null; then
    echo "   ✓ Server build includes VPS upload fix"
else
    echo "   ✗ Server build might be old"
fi
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Rebuild the application:"
echo "   npm run build"
echo ""
echo "2. Restart PM2:"
echo "   pm2 restart propertymanager --update-env"
echo ""
echo "3. Clear browser cache (important!):"
echo "   - Open DevTools (F12)"
echo "   - Right-click refresh button"
echo "   - Select 'Empty Cache and Hard Reload'"
echo "   OR"
echo "   - Press Ctrl+Shift+Delete"
echo "   - Clear cached images and files"
echo ""
echo "4. Test upload again"
echo ""
