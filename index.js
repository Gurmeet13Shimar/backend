import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { connectMongo } from "./db.js";

dotenv.config();

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sayeasefrontend.vercel.app",
      "https://sayeasefrontend-x9vv.vercel.app",
    ],
    credentials: true,
  })
);

/* -------------------- DB -------------------- */
try {
  await connectMongo();
  console.log("MongoDB connected");
} catch (err) {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1); // fail fast locally
}

/* -------------------- ROUTES -------------------- */
registerRoutes(app);

/* -------------------- HEALTH CHECK -------------------- */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* -------------------- ERROR HANDLER -------------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* -------------------- LOCAL SERVER ONLY -------------------- */
const PORT = process.env.PORT || 5000;

// ✅ Run server locally only (Vercel sets VERCEL=1)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;



