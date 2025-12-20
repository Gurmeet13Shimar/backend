import express from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { connectMongo } from "./db.js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY);




const app = express();

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;

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
  await connectMongo();
  // Register routes (API + others)
  const server = await registerRoutes(app);

  // Centralized error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`Error: ${message}`);
  });

  // Setup frontend (Vite for dev, static for prod)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Load port and host from .env or fallback
  const port = parseInt(process.env.PORT || '5000', 10);
  const host =
    process.env.HOST ||
    (process.platform === "win32" ? "localhost" : "0.0.0.0");

  // Start server
  server.listen({ port, host }, () => {
    log(`✅ Server running at http://${host}:${port}`);
  });
})();
