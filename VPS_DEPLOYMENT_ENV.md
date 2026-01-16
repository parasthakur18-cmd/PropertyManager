# VPS Deployment - Environment Variables Guide

## Required Environment Variables for VPS Deployment

Set these environment variables on your VPS (do NOT include the Neon database variables).

### 🔐 Core Application Secrets

```bash
# Session Secret (keep your existing one or generate new)
SESSION_SECRET=k2XBiQfAafwR559izJBNk/xDMXx6Klo/SXh980al1Pkql6lXzL0l4AVZqHhk2ZZ0s9wxkl6tjCBb4...

# Database URL - Use your VPS PostgreSQL (NOT Neon)
DATABASE_URL=postgresql://myappuser:StrongPassword321@localhost:5432/myappdb
# OR if PostgreSQL is on different host:
# DATABASE_URL=postgresql://username:password@your-vps-ip:5432/database_name

# Server Port
PORT=5000
# OR your preferred port

# Replit Configuration (ONLY if using Replit, otherwise leave empty or remove)
# For VPS deployment, set DISABLE_REPLIT_AUTH=true to use local email/password auth
DISABLE_REPLIT_AUTH=true
# REPLIT_DOMAINS=your-domain.com  # Only needed if using Replit
# REPL_ID=your-repl-id            # Only needed if using Replit
```

### 📦 Object Storage Configuration

```bash
# Object Storage (if using Replit object storage or similar)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff
PUBLIC_OBJECT_SEARCH_PATHS=/replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff/public
PRIVATE_OBJECT_DIR=/replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff/.private
```

### 📱 WhatsApp/Authkey Integration

```bash
# Authkey API Configuration
AUTHKEY_API_KEY=6c094eed3cd9b928
AUTHKEY_WA_TEMPLATE_ID=18491
AUTHKEY_WA_TASK_REMINDER=23109
```

### 💳 Payment Gateway (Razorpay)

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_RkGgLu6G2vIeKr
RAZORPAY_KEY_SECRET=j4dZ0f7280WUNOvIjODSHCWB
RAZORPAY_WEBHOOK_SECRET=Forest@123321
```

### 🤖 AI Integration (OpenAI)

```bash
# OpenAI/Model Farm Configuration
AI_INTEGRATIONS_OPENAI_BASE_URL=http://localhost:1106/modelfarm/openai
AI_INTEGRATIONS_OPENAI_API_KEY=_DUMMY_API_KEY_
# Update with your actual OpenAI API key if needed
```

### 📧 Email Service

```bash
# AgentMail API Key
AGENTMAIL_API_KEY=am_f6b462f7c7b0b04822cf60172014667e7048f8a77b2d2e62d54f058abcdd35f0
```

### 🏨 Beds24 Integration

```bash
# Beds24 API Key
BEDS24_API_KEY=hostezee2024apikey123
```

---

## ❌ DO NOT SET (Neon Database - Not Needed for VPS)

These are Neon-specific and should NOT be set on VPS:

```bash
# ❌ PGDATABASE=neondb
# ❌ PGHOST=ep-frosty-river-aecb231w.c-2.us-east-2.aws.neon.tech
# ❌ PGPORT=5432
# ❌ PGUSER=neondb_owner
# ❌ PGPASSWORD=npg_pSFC14esJkDh
```

---

## 📝 How to Set Environment Variables on VPS

### Option 1: Using .env file (Development/Testing)

Create a `.env` file in your project root:

```bash
nano .env
```

Paste all the variables above (excluding Neon ones).

### Option 2: System Environment Variables (Production)

#### For systemd service:

Create `/etc/systemd/system/your-app.service`:

```ini
[Unit]
Description=Property Manager App
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/PropertyManager-main
Environment="DATABASE_URL=postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
Environment="SESSION_SECRET=k2XBiQfAafwR559izJBNk/xDMXx6Klo/SXh980al1Pkql6lXzL0l4AVZqHhk2ZZ0s9wxkl6tjCBb4..."
Environment="PORT=5000"
# ... add all other variables
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

#### For PM2:

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'property-manager',
    script: 'dist/index.js',
    env: {
      DATABASE_URL: 'postgresql://myappuser:StrongPassword321@localhost:5432/myappdb',
      SESSION_SECRET: 'k2XBiQfAafwR559izJBNk/xDMXx6Klo/SXh980al1Pkql6lXzL0l4AVZqHhk2ZZ0s9wxkl6tjCBb4...',
      PORT: 5000,
      // ... add all other variables
    }
  }]
};
```

### Option 3: Export in Shell (Temporary)

```bash
export DATABASE_URL="postgresql://myappuser:StrongPassword321@localhost:5432/myappdb"
export SESSION_SECRET="k2XBiQfAafwR559izJBNk/xDMXx6Klo/SXh980al1Pkql6lXzL0l4AVZqHhk2ZZ0s9wxkl6tjCBb4..."
# ... export all other variables
```

---

## ✅ Checklist Before Deployment

- [ ] PostgreSQL installed and running on VPS
- [ ] Database created: `myappdb` (or your preferred name)
- [ ] Database user created with proper permissions
- [ ] All environment variables set (excluding Neon ones)
- [ ] `DATABASE_URL` points to your VPS PostgreSQL
- [ ] `SESSION_SECRET` is set (use existing or generate new)
- [ ] All API keys are valid and active
- [ ] Port is available and not blocked by firewall
- [ ] Run `npm run db:push` to create database tables
- [ ] Test the application after deployment

---

## 🔒 Security Notes

1. **Never commit `.env` file to git** - it contains sensitive information
2. **Use strong passwords** for database and session secrets
3. **Restrict database access** - only allow connections from localhost or specific IPs
4. **Use environment variables** instead of hardcoding secrets
5. **Rotate secrets regularly** for production environments

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables (choose one method above)

# 3. Create database and run migrations
npm run db:push

# 4. Build the application
npm run build

# 5. Start the server
npm start
```

---

## 📞 Support

If you encounter issues:
- Check database connection: `psql -h localhost -U myappuser -d myappdb`
- Verify environment variables are set: `printenv | grep DATABASE_URL`
- Check server logs for errors
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
