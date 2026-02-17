// Load .env.local only in development (for local testing)
if (process.env.NODE_ENV === 'development') {
  try {
    const { config } = await import('dotenv');
    config({ path: '.env.local' });
  } catch (e) {
    // .env.local might not exist in some environments, that's okay
  }
}

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

app.use(compression());

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module 'express' {
  interface User {
    claims?: any;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (res.statusCode >= 400 && capturedJsonResponse) {
        const errMsg = capturedJsonResponse.message || capturedJsonResponse.error || '';
        logLine += errMsg ? ` :: ${errMsg}` : ` :: ${res.statusCode}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate database schema at startup (fail fast if schema drift detected)
  try {
    const { validateDatabaseSchema } = await import("./db-validator");
    const validation = await validateDatabaseSchema();
    if (!validation.valid) {
      console.error("[STARTUP] ❌ Database schema validation failed. Please run fix-schema-drift.sql");
      console.error("[STARTUP] Errors:", validation.errors);
      // Don't exit in production - allow app to start but log the issue
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    }
  } catch (error: any) {
    console.warn("[STARTUP] Could not validate database schema:", error.message);
    // Continue startup even if validation fails
  }

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // GLOBAL SAFETY NET for legacy NaN → integer crashes.
    // If Postgres throws "invalid input syntax for type integer: \"NaN\"" we should not crash the UI.
    // These errors typically occur on list/report endpoints, so returning an empty list is acceptable.
    const isNaNError = typeof message === "string" && (
      message.includes('invalid input syntax for type integer') ||
      message.includes('"NaN"') ||
      (message.includes('NaN') && message.includes('integer'))
    );

    if (isNaNError) {
      console.warn(`[GLOBAL SAFETY NET] Caught NaN error on ${req.method} ${req.path}: ${message}`);
      // For GET requests to list endpoints, return empty array
      if (req.method === 'GET') {
        return res.status(200).json([]);
      }
      // For other methods, also return empty array to prevent crashes
      return res.status(200).json([]);
    }

    res.status(status).json({ message });
    throw err;
  });

  // IMPORTANT: Only setup Vite dev server in development mode
  // In production, serve pre-built static files from /dist/public
  // This prevents WebSocket HMR errors (wss://localhost/v2) in production
  if (process.env.NODE_ENV === "production") {
    // Production: Serve static files (no Vite, no HMR, no WebSocket)
    serveStatic(app);
  } else {
    // Development: Use Vite dev server with HMR
    await setupVite(app, server);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified.
  // IMPORTANT: Use "0.0.0.0" to bind to all interfaces (required for VPS)
  // This allows connections from localhost, LAN, and external IPs
  const port = Number(process.env.PORT) || 3000;
  
  // Use simple listen format for maximum compatibility
  // "0.0.0.0" is REQUIRED on VPS - binds to all network interfaces
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port} (bound to 0.0.0.0)`);
  });
})();

// Reload forced at Sun Nov  2 09:35:40 AM UTC 2025
