import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
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

let buildInProgress = false;
let buildComplete = false;

function triggerBackgroundBuild(projectRoot: string) {
  if (buildInProgress || buildComplete) return;
  buildInProgress = true;
  console.log("[serveStatic] 🔨 Starting background build (npm run build)...");

  const child = spawn("npm", ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log("[serveStatic] ✅ Background build complete — site is ready!");
      buildComplete = true;
    } else {
      console.error(`[serveStatic] ❌ Build failed with exit code ${code}`);
    }
    buildInProgress = false;
  });
}

const buildingPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="refresh" content="10"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Hostezee — Starting up…</title>
  <style>
    body{margin:0;font-family:system-ui,sans-serif;background:#f0f4f8;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#fff;border-radius:16px;padding:48px 40px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:420px;width:90%;}
    .logo{font-size:28px;font-weight:700;color:#1E3A5F;margin-bottom:8px;}
    .tag{color:#2BB6A8;font-size:14px;margin-bottom:32px;}
    .spinner{width:48px;height:48px;border:5px solid #e8f0fe;border-top:5px solid #2BB6A8;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    h2{color:#1E3A5F;margin:0 0 8px;}
    p{color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;}
    .note{font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Hostezee</div>
    <div class="tag">Simplify Stays</div>
    <div class="spinner"></div>
    <h2>Building the app…</h2>
    <p>A fresh deployment is being prepared. This takes about 30–60 seconds.</p>
    <p class="note">This page will refresh automatically every 10 seconds.</p>
  </div>
</body>
</html>`;

export function serveStatic(app: Express) {
  const distPublicPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const distClientPath = path.resolve(import.meta.dirname, "..", "dist", "client");
  const projectRoot = path.resolve(import.meta.dirname, "..");

  function getDistPath() {
    if (fs.existsSync(distPublicPath)) return distPublicPath;
    if (fs.existsSync(distClientPath)) return distClientPath;
    return null;
  }

  const initialDistPath = getDistPath();

  if (!initialDistPath) {
    console.log("[serveStatic] ⚠️  dist/public not found — triggering background build…");
    triggerBackgroundBuild(projectRoot);
  }

  app.use(express.static(distPublicPath));
  app.use(express.static(distClientPath));

  app.use("*", (_req, res) => {
    const distPath = getDistPath();
    if (distPath) {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }

    if (!buildComplete) {
      triggerBackgroundBuild(projectRoot);
      return res.status(503).set("Content-Type", "text/html").send(buildingPage);
    }

    return res.status(503).json({
      error: "Build completed but index.html still missing",
      message: "Please restart the server: pm2 restart propertymanager",
    });
  });
}
