import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { connectMongo } from "./db.js";

dotenv.config();

const app = express();

/* CORS*/
app.use(
  cors({
    origin: [
      "https://sayeasefrontend-x9vv.vercel.app",
      "https://sayeasefrontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect DB once (safe for serverless)
await connectMongo();

// Register routes
registerRoutes(app);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// ✅ DO NOT listen on port (correct for Vercel)
export default app;
