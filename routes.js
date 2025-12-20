import { createServer } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage.js";
import { summarizeStudentNotes } from "./gemini.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret-key-replace-in-production";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret-key-replace-in-production";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.userId = decoded.userId;
    next();
  });
};

export async function registerRoutes(app) {
  // AUTH
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(400).json({ message: "Username already exists" });
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(400).json({ message: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, email, password: hashedPassword });
      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password required" });
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ message: "Invalid credentials" });
      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
      res.json({
        user: { id: user.id, username: user.username, email: user.email },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token required" });
    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid refresh token" });
      const accessToken = jwt.sign({ userId: decoded.userId }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  });

  // TASKS
  app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.userId);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const { title, description, dueDate, priority } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });
      const task = await storage.createTask({
        userId: req.userId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        completed: false,
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const task = await storage.getTask(id);
      if (!task || task.userId !== req.userId) return res.status(404).json({ message: "Task not found" });
      const updatedTask = await storage.updateTask(id, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTask(id);
      if (!task || task.userId !== req.userId) return res.status(404).json({ message: "Task not found" });
      await storage.deleteTask(id);
      res.json({ message: "Task deleted" });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // NOTES
  app.get("/api/notes", authenticateToken, async (req, res) => {
    try {
      const notes = await storage.getNotes(req.userId);
      res.json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notes", authenticateToken, async (req, res) => {
    try {
      const { title, content, category } = req.body;
      if (!title || !content) return res.status(400).json({ message: "Title and content are required" });
      const note = await storage.createNote({
        userId: req.userId,
        title,
        content,
        category: category || "general",
        summary: null,
      });
      res.status(201).json(note);
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notes/summarize", authenticateToken, async (req, res) => {
    try {
      const { noteId } = req.body;
      if (!noteId) return res.status(400).json({ message: "Note ID is required" });
      const note = await storage.getNote(noteId);
      if (!note || note.userId !== req.userId) return res.status(404).json({ message: "Note not found" });
      const summary = await summarizeStudentNotes(note.content);
      const updatedNote = await storage.updateNote(noteId, { summary });
      res.json({ note: updatedNote, summary });
    } catch (error) {
  console.error("FULL GEMINI ERROR:", error);
  res.status(500).json({
    message: error?.message || error,
  });
}

  });

  app.delete("/api/notes/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const note = await storage.getNote(id);
      if (!note || note.userId !== req.userId) return res.status(404).json({ message: "Note not found" });
      await storage.deleteNote(id);
      res.json({ message: "Note deleted" });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.get("/api/journals", authenticateToken, async (req, res) => {
    try {
      const journals = await storage.getJournals(req.userId);
      res.json(journals);
    } catch (error) {
      console.error("Get journals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/journals", authenticateToken, async (req, res) => {
    try {
      const { content, mood, activities, date } = req.body;
      if (!content || !mood) return res.status(400).json({ message: "Content and mood are required" });
      const journal = await storage.createJournal({
        userId: req.userId,
        content,
        mood,
        activities: activities || null,
        date: date ? new Date(date) : new Date(),
      });
      res.status(201).json(journal);
    } catch (error) {
      console.error("Create journal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/journals/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const journal = await storage.getJournal(id);
      if (!journal || journal.userId !== req.userId) return res.status(404).json({ message: "Journal entry not found" });
      await storage.deleteJournal(id);
      res.json({ message: "Journal entry deleted" });
    } catch (error) {
      console.error("Delete journal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


