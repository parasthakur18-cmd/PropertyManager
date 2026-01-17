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
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

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
