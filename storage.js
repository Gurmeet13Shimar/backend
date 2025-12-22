import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { User } from "./models/User.js";
import { Task } from "./models/Task.js";
import { Note } from "./models/Note.js";
import { Journal } from "./models/Journal.js";

/* ================= MONGO STORAGE ================= */

class MongoStorage {
  async getUser(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await User.findById(id);
  }

  async getUserByUsername(username) {
    return await User.findOne({ username });
  }

  async getUserByEmail(email) {
    return await User.findOne({ email });
  }

  async createUser(insertUser) {
    return await User.create(insertUser);
  }

  /* -------- TASKS -------- */

  async getTasks(userId) {
    return await Task.find({ userId }).sort({ createdAt: -1 });
  }

  async getTask(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Task.findById(id);
  }

  async createTask(insertTask) {
    return await Task.create(insertTask);
  }

  async updateTask(id, updates) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Task.findByIdAndUpdate(id, updates, { new: true });
  }

  async deleteTask(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return !!(await Task.findByIdAndDelete(id));
  }

  /* -------- NOTES -------- */

  async getNotes(userId) {
    return await Note.find({ userId }).sort({ updatedAt: -1 });
  }

  async getNote(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Note.findById(id);
  }

  async createNote(insertNote) {
    return await Note.create(insertNote);
  }

  async updateNote(id, updates) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Note.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
  }

  async deleteNote(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return !!(await Note.findByIdAndDelete(id));
  }

  /* -------- JOURNALS -------- */

  async getJournals(userId) {
    return await Journal.find({ userId }).sort({ date: -1 });
  }

  async getJournal(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Journal.findById(id);
  }

  async createJournal(insertJournal) {
    return await Journal.create(insertJournal);
  }

  async deleteJournal(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return !!(await Journal.findByIdAndDelete(id));
  }
}

/* ================= MEMORY STORAGE (UNCHANGED) ================= */

class MemoryStorage {
  constructor() {
    this.users = new Map();
    this.usersByUsername = new Map();
    this.usersByEmail = new Map();
    this.tasks = new Map();
    this.notes = new Map();
    this.journals = new Map();
  }

  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    return this.usersByUsername.get(username);
  }

  async getUserByEmail(email) {
    return this.usersByEmail.get(email);
  }

  async createUser(insertUser) {
    const user = { id: randomUUID(), ...insertUser };
    this.users.set(user.id, user);
    this.usersByUsername.set(user.username, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async getTasks(userId) {
    return [...this.tasks.values()].filter(t => t.userId === userId);
  }

  async getTask(id) {
    return this.tasks.get(id);
  }

  async createTask(task) {
    const t = { id: randomUUID(), createdAt: new Date(), ...task };
    this.tasks.set(t.id, t);
    return t;
  }

  async updateTask(id, updates) {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    Object.assign(t, updates);
    return t;
  }

  async deleteTask(id) {
    return this.tasks.delete(id);
  }

  async getNotes(userId) {
    return [...this.notes.values()].filter(n => n.userId === userId);
  }

  async getNote(id) {
    return this.notes.get(id);
  }

  async createNote(note) {
    const n = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...note };
    this.notes.set(n.id, n);
    return n;
  }

  async updateNote(id, updates) {
    const n = this.notes.get(id);
    if (!n) return undefined;
    Object.assign(n, updates, { updatedAt: new Date() });
    return n;
  }

  async deleteNote(id) {
    return this.notes.delete(id);
  }

  async getJournals(userId) {
    return [...this.journals.values()].filter(j => j.userId === userId);
  }

  async getJournal(id) {
    return this.journals.get(id);
  }

  async createJournal(journal) {
    const j = { id: randomUUID(), ...journal };
    this.journals.set(j.id, j);
    return j;
  }

  async deleteJournal(id) {
    return this.journals.delete(id);
  }
}

/* ================= EXPORT ================= */

const useMongoStorage = Boolean(process.env.MONGODB_URI);
export const storage = useMongoStorage ? new MongoStorage() : new MemoryStorage();
export const usingMongoStorage = useMongoStorage;
