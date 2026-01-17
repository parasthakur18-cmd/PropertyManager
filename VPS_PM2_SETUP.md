# VPS PM2 Setup - Quick Fix Guide

## 🔴 Current Problem

Your app is crashing on startup because `DATABASE_URL` is not set. PM2 shows "online" but the app never actually starts listening.

## ✅ Solution: Use PM2 Ecosystem File

### Step 1: Update ecosystem.config.js

Edit the `ecosystem.config.js` file with your actual values:

```bash
nano ecosystem.config.js
```

**IMPORTANT:** Update these values:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - Your session secret (generate new one if needed)

### Step 2: Start PM2 with Ecosystem File

```bash
# Stop current PM2 process
pm2 delete propertymanager

# Start with ecosystem file (loads all env vars)
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

### Step 3: Verify Environment Variables

```bash
# Check if env vars are loaded
pm2 show propertymanager | grep -A 20 "env:"

# Check logs
pm2 logs propertymanager --lines 30
```

### Step 4: Verify Port is Listening

```bash
# Check if port 3000 is listening
ss -lntp | grep 3000

# Should show:
# LISTEN 0 511 0.0.0.0:3000
```

### Step 5: Test Connection

```bash
# Test local connection
curl http://localhost:3000

# Should return HTML or JSON (not connection refused)
```

## 🔧 Alternative: Set Environment Variables Manually

If you prefer not to use ecosystem file:

```bash
# Export environment variables
export DATABASE_URL="postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
export SESSION_SECRET="your-session-secret-here"
export NODE_ENV="production"
export DISABLE_REPLIT_AUTH="true"
export PORT="3000"

# Start PM2 (will inherit exported vars)
pm2 delete propertymanager
pm2 start dist/index.js --name propertymanager
pm2 save
```

## 🐛 Troubleshooting

### Issue: "DATABASE_URL must be set"
**Solution:** Make sure `DATABASE_URL` is in ecosystem.config.js or exported before starting PM2

### Issue: Port 3000 not listening
**Solution:** 
1. Check PM2 logs: `pm2 logs propertymanager --lines 50`
2. Look for startup errors
3. Make sure app reaches "serving on port 3000" message

### Issue: Still getting connection refused
**Solution:**
1. Verify port is listening: `ss -lntp | grep 3000`
2. Check firewall: `ufw status` (port 3000 should be open)
3. Check if app actually started: `pm2 logs propertymanager`

## ✅ Expected Logs After Fix

You should see in `pm2 logs propertymanager`:

```
[DB INIT] Using node-postgres driver (local/VPS PostgreSQL)
[DB INIT] Using DATABASE_URL: postgresql://myappuser:StrongP...
[AUTH] Using local email/password authentication (Replit auth disabled)
[PAYMENT-JOB] Background job started
[TASK-REMINDER] Daily task reminder job started
[AUTO-CLOSE] Auto-close day job started
[express] serving on port 3000 (bound to 0.0.0.0)
```

If you see "serving on port 3000", the app is working! ✅
