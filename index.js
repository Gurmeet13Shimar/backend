import express from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes.js";
import { connectMongo } from "./db.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  await connectMongo(); // comment temporarily if DB causes crash

  registerRoutes(app);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
    });
  });

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`✅ Backend running on http://localhost:${port}`);
  });
})();
