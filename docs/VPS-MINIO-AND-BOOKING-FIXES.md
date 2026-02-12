# VPS: MinIO, Photo Upload & Booking Fixes

## Summary (12 Feb 2026)

- **MinIO setup:** Yes. MinIO is configured in `ecosystem.config.cjs` (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY) and the MinIO service is running (health check OK).
- **Booking not working:** Likely due to **database schema drift**. App logs show validation errors.
- **Photo upload not working:** Presigned URLs were pointing to `127.0.0.1:9000`, which the **browser cannot reach**. Code now uses **VPS direct upload** when MinIO is on localhost.

---

## 1. MinIO / Photo upload

### What was wrong
- MinIO runs on `http://127.0.0.1:9000`.
- Presigned upload URLs contained that host, so the browser tried to upload to `127.0.0.1` (user’s machine) and failed.

### What was changed
- **`server/minioStorage.ts`:** Added `isMinIOPublicEndpoint()` – returns `false` when S3_ENDPOINT is localhost/127.0.0.1.
- **`server/routes.ts`:** For `/api/objects/upload` and `/api/guest/upload`, use MinIO presigned URL **only** when `isMinIOPublicEndpoint()` is true. Otherwise use **VPS direct upload** (`/api/vps-upload/:objectId`) so the browser uploads to your app server.

Result: Photo upload works via VPS direct upload while MinIO remains on localhost. Files are stored under `uploads/id-proofs/`. Serving still uses MinIO when the path is from MinIO; for these uploads it uses the VPS path.

### Optional: use MinIO for browser uploads
If you later expose MinIO on a public URL (e.g. `https://minio.hostezee.in` via nginx):

1. Set `S3_ENDPOINT=https://minio.hostezee.in` (or the public URL) in `ecosystem.config.cjs`.
2. Ensure MinIO is reachable at that URL with the same bucket and credentials.
3. Rebuild, restart PM2; then presigned URLs will be used for browser uploads.

---

## 2. Booking / database schema drift

App logs show:

- Missing column: `message_templates.template_type`
- Type mismatch: `bookings.check_out_date` should be DATE but is timestamp

### Fix

Run the schema fix script against your database:

```bash
cd /var/www/myapp
psql "$DATABASE_URL" -f scripts/fix-schema-drift.sql
```

Or with explicit connection:

```bash
psql "postgresql://myappuser:StrongPassword321@localhost:5432/myappdb" -f scripts/fix-schema-drift.sql
```

Then restart the app:

```bash
pm2 restart propertymanager
```

---

## 3. Ecosystem env (REPLIT_DOMAINS / APP_BASE_URL)

In `ecosystem.config.cjs` the following were added for VPS:

- `APP_BASE_URL: 'https://hostezee.in'`
- `REPLIT_DOMAINS: 'hostezee.in'`

So any code that builds links (emails, WhatsApp, etc.) uses `https://hostezee.in` instead of a missing Replit domain.

---

## 4. Apply and restart

From the app directory:

```bash
cd /var/www/myapp

# 1. Fix DB schema (fixes booking-related validation)
psql "postgresql://myappuser:StrongPassword321@localhost:5432/myappdb" -f scripts/fix-schema-drift.sql

# 2. Rebuild (for minioStorage + routes changes)
npm run build

# 3. Restart with updated ecosystem (env + code)
pm2 restart propertymanager
# Or reload ecosystem env and restart:
# pm2 delete propertymanager; pm2 start ecosystem.config.cjs
```

After this, booking creation and photo upload should work. If something still fails, check:

- `pm2 logs propertymanager` for errors.
- Browser Network tab for the failing request (e.g. POST booking or upload).
