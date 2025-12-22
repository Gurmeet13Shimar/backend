import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage.js";
import { summarizeStudentNotes } from "./gemini.js";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "access-secret-key-replace-in-production";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refresh-secret-key-replace-in-production";

/* ================= AUTH MIDDLEWARE ================= */

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ================= ROUTES ================= */

export function registerRoutes(app) {
  /* ================= AUTH ================= */

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (await storage.getUserByUsername(username)) {
        return res.status(400).json({ message: "Username already exists" });
      }

      if (await storage.getUserByEmail(email)) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      const accessToken = jwt.sign(
        { userId: user.id },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const accessToken = jwt.sign(
        { userId: user.id },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /* ================= TASKS ================= */

  app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
      res.json(await storage.getTasks(req.userId));
    } catch (err) {
      console.error("Get tasks error:", err);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const task = await storage.createTask({
        userId: req.userId,
        ...req.body,
        completed: false,
      });
      res.status(201).json(task);
    } catch (err) {
      console.error("Create task error:", err);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task || task.userId.toString() !== req.userId) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(await storage.updateTask(req.params.id, req.body));
    } catch (err) {
      console.error("Update task error:", err);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task || task.userId.toString() !== req.userId) {
        return res.status(404).json({ message: "Task not found" });
      }
      await storage.deleteTask(req.params.id);
      res.json({ message: "Task deleted" });
    } catch (err) {
      console.error("Delete task error:", err);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  /* ================= NOTES ================= */

  app.get("/api/notes", authenticateToken, async (req, res) => {
    try {
      res.json(await storage.getNotes(req.userId));
    } catch (err) {
      console.error("Get notes error:", err);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", authenticateToken, async (req, res) => {
    try {
      const note = await storage.createNote({
        userId: req.userId,
        ...req.body,
      });
      res.status(201).json(note);
    } catch (err) {
      console.error("Create note error:", err);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.post("/api/notes/summarize", authenticateToken, async (req, res) => {
    try {
      const note = await storage.getNote(req.body.noteId);
      if (!note || note.userId.toString() !== req.userId) {
        return res.status(404).json({ message: "Note not found" });
      }

      const summary = await summarizeStudentNotes(note.content);
      res.json(
        await storage.updateNote(req.body.noteId, { summary })
      );
    } catch (err) {
      console.error("Summarize note error:", err);
      res.status(500).json({ message: "Failed to summarize note" });
    }
  });

  app.delete("/api/notes/:id", authenticateToken, async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note || note.userId.toString() !== req.userId) {
        return res.status(404).json({ message: "Note not found" });
      }
      await storage.deleteNote(req.params.id);
      res.json({ message: "Note deleted" });
    } catch (err) {
      console.error("Delete note error:", err);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });
}
