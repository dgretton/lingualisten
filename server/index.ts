// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { existsSync } from "fs";

// Only load .env if it exists (for local development)
if (existsSync('.env')) {
  config();
}

// Debug environment variables
console.log("Environment check:");
console.log("ANTHROPIC_API_KEY exists:", !!process.env.ANTHROPIC_API_KEY);
console.log("ANTHROPIC_API_KEY length:", process.env.ANTHROPIC_API_KEY?.length || 0);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try to serve the app on port 5000, fallback to other ports if busy
  const preferredPort = 5000;
  const maxRetries = 10;
  
  const tryListen = (port: number, retries: number = 0): void => {
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && retries < maxRetries) {
        log(`Port ${port} is busy, trying port ${port + 1}`);
        tryListen(port + 1, retries + 1);
      } else {
        log(`Failed to start server: ${err.message}`);
        process.exit(1);
      }
    });
  };
  
  tryListen(preferredPort);
})();
