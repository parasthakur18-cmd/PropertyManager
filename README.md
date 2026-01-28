## Hostezee Property Manager (PMS)

Full‑stack property management system for hotels/homestays: bookings, guests, billing, expenses, tasks, and operational dashboards.

### Tech stack

- **Frontend**: React 18 + Vite + Tailwind
- **Backend**: Node.js + Express (single server that serves API + frontend)
- **Database**: PostgreSQL + Drizzle ORM (supports Neon serverless driver when `DATABASE_URL` is Neon)
- **Auth**:
  - Replit OIDC (when running on Replit)
  - Session + email/password flow for VPS/local (`DISABLE_REPLIT_AUTH=true`)

### Repo layout

- **`client/`**: React app (Vite root)
- **`server/`**: Express API + auth + integrations
- **`shared/`**: Drizzle schema shared by server/client
- **`migrations/`**: Drizzle migration output
- **`scripts/`**: backup/restore + deployment helpers

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+**

### Quickstart (local development)

1) Install dependencies:

```bash
npm install
```

2) Create `.env.local` (loaded automatically in development and by Drizzle):

```bash
cat > .env.local <<'EOF'
# App
NODE_ENV=development
PORT=3000

# Postgres
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/propertymanager

# Sessions (generate with: openssl rand -base64 64)
SESSION_SECRET=REPLACE_ME

# Use email/password auth locally/VPS (skip Replit OIDC)
DISABLE_REPLIT_AUTH=true
EOF
```

3) Push schema to your database:

```bash
npm run db:push
```

4) Start the dev server:

```bash
npm run dev
```

The app will listen on `http://localhost:3000` (or `PORT`).

### Default admin (fresh database)

On startup, the server seeds a **super-admin** user if none exists:

- **Email**: `admin@hostezee.in`
- **Password**: `admin@123`

Change/disable this for real deployments.

### Production build & run

Build:

```bash
npm run build
```

Run:

```bash
npm start
```

Notes:
- The production server serves static assets from `dist/public` (no Vite HMR).
- `attached_assets/` is served at `/assets`.

### Configuration (environment variables)

#### Required

- **`DATABASE_URL`**: Postgres connection string.
- **`SESSION_SECRET`**: Express-session secret.

#### Common / deployment

- **`PORT`**: Server port (defaults to `3000`).
- **`DISABLE_REPLIT_AUTH`**: Set to `true` on VPS/local to use session + email/password auth.
- **`USE_SECURE_COOKIES`**: Set to `true` if you’re behind HTTPS and want `secure` cookies even off Replit.

#### Object/file storage (pick one)

- **Replit Object Storage**
  - `PUBLIC_OBJECT_SEARCH_PATHS`
  - `PRIVATE_OBJECT_DIR`
- **MinIO / S3-compatible storage**
  - `S3_ENDPOINT` (or `MINIO_ENDPOINT`)
  - `S3_ACCESS_KEY` / `S3_SECRET_KEY` (or `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`)
  - `S3_BUCKET` (or `MINIO_BUCKET_NAME`)
  - Optional: `S3_PORT`, `S3_USE_SSL`

#### Payments (Razorpay)

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- Optional: `RAZORPAY_WEBHOOK_SECRET`

#### WhatsApp messaging (authkey.io)

- **Required to send messages**: `AUTHKEY_API_KEY`
- Optional:
  - `AUTHKEY_WHATSAPP_NUMBER`
  - Template IDs such as `AUTHKEY_WA_BOOKING_CONFIRMATION`, `AUTHKEY_WA_PAYMENT_CONFIRMATION`, `AUTHKEY_WA_TASK_REMINDER`, etc.

#### Beds24 integration

- `BEDS24_API_KEY`

#### Email (AgentMail via Replit Connector)

This project is wired to use Replit Connector credentials when available:

- `REPLIT_CONNECTORS_HOSTNAME`
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL`

If not configured, emails are **logged to console**.

#### AI integrations (OpenAI-compatible)

- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`

### Useful scripts

- **Database backup**: `scripts/backup-database.ts` (writes JSON backups to `backups/`)
- **Database restore**: `scripts/restore-database.ts`
- **Beds24 sync**: `scripts/sync-beds24-bookings.ts`

### Deployment (VPS + PM2 + GitHub Actions)

- **PM2 config**: `ecosystem.config.cjs` (process name: `propertymanager`)
- **GitHub Actions workflow docs**: see `.github/workflows/README.md`
- **VPS helper**: `scripts/setup-vps-for-deployment.sh`

Minimal PM2 flow on VPS:

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

### Security notes

- Do **not** commit secrets. Prefer `.env.local` (local) / GitHub Actions secrets (deployment).
- If you use `ecosystem.config.cjs` as a template, replace all example values with real secrets in your server environment.

### License

MIT (see `package.json`).
