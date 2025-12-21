import express from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes.js";
import { connectMongo } from "./db.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect DB once (safe for serverless)
await connectMongo();

// Register all routes
registerRoutes(app);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// ❌ DO NOT listen on any port
// ❌ DO NOT use app.listen on Vercel

export default app;
