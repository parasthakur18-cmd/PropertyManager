# VPS Deployment - Fixing Current Issues

## 🔴 Issues Found in PM2 Logs

1. **"Unknown authentication strategy 'repl'"** - Fixed ✅
2. **"DATABASE_URL must be set"** - Environment variables not loading
3. **Register endpoint 400 errors** - Field name mismatch (fixed ✅)

## ✅ Fixes Applied

### 1. Replit Auth Disabled
- `/api/login` now returns helpful error when Replit auth is disabled
- Users should use `/api/auth/email-login` instead
- No more "Unknown authentication strategy" errors

### 2. Register Endpoint
- Now accepts multiple field name variations
- `businessLocation` OR `location` OR `city`
- `businessName` OR `business_name` OR `hotelName`

## 🚀 Deployment Steps on VPS

### Step 1: Set Environment Variables

Make sure these are set in your PM2 ecosystem file or system environment:

```bash
# Required
DATABASE_URL=postgresql://myappuser:StrongPassword321@localhost:5432/myappdb
SESSION_SECRET=your-session-secret-here
NODE_ENV=production
DISABLE_REPLIT_AUTH=true
PORT=3000

# Optional but recommended
REPLIT_DOMAINS=  # Leave empty or don't set
REPL_ID=  # Leave empty or don't set
```

### Step 2: Update PM2 Configuration

If using PM2 ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'propertymanager',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://myappuser:StrongPassword321@localhost:5432/myappdb',
      SESSION_SECRET: 'your-session-secret-here',
      DISABLE_REPLIT_AUTH: 'true',
      PORT: '3000',
      // ... other env vars
    }
  }]
};
```

Or set in system environment:
```bash
export DATABASE_URL="postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
export SESSION_SECRET="your-session-secret-here"
export NODE_ENV="production"
export DISABLE_REPLIT_AUTH="true"
export PORT="3000"
```

### Step 3: Pull Latest Code and Rebuild

```bash
cd /var/www/myapp
git pull origin main
npm install
npm run build
pm2 restart propertymanager --update-env
```

### Step 4: Verify Environment Variables

```bash
# Check if PM2 has the env vars
pm2 show propertymanager | grep env

# Or check in the app
pm2 logs propertymanager --lines 50 | grep -i "DATABASE_URL\|AUTH"
```

### Step 5: Test Endpoints

```bash
# Test register (use businessLocation, not location)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"12345678",
    "businessName":"Test Hotel",
    "businessLocation":"Delhi"
  }'

# Test email login
curl -X POST http://localhost:3000/api/auth/email-login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"12345678"
  }'
```

## 🔍 Troubleshooting

### Issue: "DATABASE_URL must be set"

**Solution:**
1. Check environment variables are set:
   ```bash
   echo $DATABASE_URL
   ```

2. Restart PM2 with updated env:
   ```bash
   pm2 restart propertymanager --update-env
   ```

3. If using systemd or other process manager, ensure env vars are exported before starting

### Issue: "Unknown authentication strategy 'repl'"

**Solution:**
1. Set `DISABLE_REPLIT_AUTH=true` in environment
2. Rebuild and restart:
   ```bash
   npm run build
   pm2 restart propertymanager --update-env
   ```

3. Use `/api/auth/email-login` instead of `/api/login`

### Issue: Register returns 400 "Email, password, business name, and location are required"

**Solution:**
- Use `businessLocation` (not `location`)
- Use `businessName` (not `business_name`)
- Password must be at least 8 characters
- Example:
  ```json
  {
    "email": "test@test.com",
    "password": "12345678",
    "businessName": "Test Hotel",
    "businessLocation": "Delhi"
  }
  ```

## ✅ Expected Behavior After Fixes

1. ✅ No "Unknown authentication strategy" errors
2. ✅ DATABASE_URL loads correctly
3. ✅ Register endpoint accepts multiple field name variations
4. ✅ Email login works at `/api/auth/email-login`
5. ✅ No WebSocket errors (Vite HMR disabled in production)

## 📝 Quick Reference

**Login Endpoint:**
- ❌ `/api/login` - Replit OIDC (disabled on VPS)
- ✅ `/api/auth/email-login` - Email/password (use this on VPS)

**Register Endpoint:**
- ✅ `/api/auth/register` - Accepts `businessName` and `businessLocation`

**Required Env Vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `NODE_ENV=production` - Production mode
- `DISABLE_REPLIT_AUTH=true` - Disable Replit OIDC
