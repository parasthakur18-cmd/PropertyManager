#!/bin/bash
# Automated fix for REPLIT_DOMAINS error on VPS
# Run this on your VPS: bash fix_replit_auth.sh

cd /var/www/myapp

# Backup
cp server/replitAuth.ts server/replitAuth.ts.backup

# Check current content around line 54-66
echo "=== Current content (lines 50-70) ==="
sed -n '50,70p' server/replitAuth.ts
echo ""
echo "=== Applying fix ==="

# Use sed to replace the problematic section
# First, let's check if the old pattern exists
if grep -q "if (!process.env.REPLIT_DOMAINS)" server/replitAuth.ts; then
    echo "Found old pattern, replacing..."
    # Replace the old check with the new one
    sed -i 's/if (!process.env.REPLIT_DOMAINS)/if (!isReplitAuthDisabled \&\& !process.env.REPLIT_DOMAINS)/' server/replitAuth.ts
    
    # Add the isReplitAuthDisabled check before the if statement if it doesn't exist
    if ! grep -q "const isReplitAuthDisabled" server/replitAuth.ts; then
        # Find the line with the comment about VPS and add the check before the if statement
        sed -i '/\/\/ IMPORTANT: Don'\''t throw error if DISABLE_REPLIT_AUTH is true/a\
const isReplitAuthDisabled = process.env.DISABLE_REPLIT_AUTH === '\''true'\'';\
const isUsingReplitAuth = !isReplitAuthDisabled \&\& \
                          process.env.REPLIT_DOMAINS \&\& \
                          process.env.REPL_ID;
' server/replitAuth.ts
    fi
else
    echo "Pattern not found. Let's check what's there..."
    grep -n "REPLIT_DOMAINS" server/replitAuth.ts | head -5
fi

echo ""
echo "=== After fix (lines 50-70) ==="
sed -n '50,70p' server/replitAuth.ts
echo ""
echo "✅ Fix applied! Now run:"
echo "   npm run build"
echo "   pm2 restart propertymanager --update-env"
