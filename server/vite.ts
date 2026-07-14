import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPublicPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const distClientPath = path.resolve(import.meta.dirname, "..", "dist", "client");

  function getDistPath() {
    if (fs.existsSync(distPublicPath)) return distPublicPath;
    if (fs.existsSync(distClientPath)) return distClientPath;
    return null;
  }

  let distPath = getDistPath();

  if (!distPath) {
    console.log(`[serveStatic] ⚠️  dist/public not found — running npm run build automatically...`);
    try {
      const projectRoot = path.resolve(import.meta.dirname, "..");
      execSync("npm run build", {
        cwd: projectRoot,
        stdio: "inherit",
        timeout: 300000,
      });
      console.log(`[serveStatic] ✅ Auto-build complete.`);
      distPath = getDistPath();
    } catch (buildErr) {
      console.error(`[serveStatic] ❌ Auto-build failed:`, buildErr);
    }
  }

  if (!distPath) {
    console.error(`[serveStatic] ❌ Build directory still not found after auto-build attempt.`);
    app.use("*", (_req, res) => {
      res.status(503).json({
        error: "Frontend build not found",
        message: "Auto-build was attempted but failed. Please run 'npm run build' manually.",
        pathsChecked: [distPublicPath, distClientPath],
      });
    });
    return;
  }

  console.log(`[serveStatic] ✅ Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({
        error: "index.html not found",
        message: "Frontend build is incomplete. Please run 'npm run build'",
        path: indexPath,
      });
    }
  });
}
