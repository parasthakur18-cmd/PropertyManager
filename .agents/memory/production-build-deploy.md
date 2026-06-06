---
name: Production deploy requires build step
description: hostezee.in runs npm run start (compiled build); git pull alone won't deploy new backend code
---

## Rule
The live server at hostezee.in runs `npm run start` → `node dist/index.js` (esbuild-compiled).
`git pull` alone only updates TypeScript source. The compiled binary is unchanged until rebuilt.

**Correct deploy command:**
```
git pull && npm run build && pm2 restart propertymanager
```

**Why:** `npm run build` runs both `vite build` (frontend → dist/public/) and
`esbuild server/index.ts` (backend → dist/index.js). Without it, new backend
routes, schema changes, and bug fixes are invisible on production even though
the source files are updated.

**How to apply:** Any time the user reports a fix "not working in production"
after `git pull && pm2 restart`, suspect a missing build step first.
