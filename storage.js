import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { User } from "./models/User.js";
import { Task } from "./models/Task.js";
import { Note } from "./models/Note.js";
import { Journal } from "./models/Journal.js";

const hasStructuredClone =
  typeof globalThis !== "undefined" && typeof globalThis.structuredClone === "function";

const clone = (value) => {
  if (value === undefined || value === null) return value;
  if (hasStructuredClone) {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

class MongoStorage {
  async getUser(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await User.findById(id).lean();
  }

  async getUserByUsername(username) {
    return await User.findOne({ username }).lean();
  }

  async getUserByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  async createUser(insertUser) {
    const doc = await User.create(insertUser);
    return doc.toObject();
  }

  async getTasks(userId) {
    return await Task.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async getTask(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Task.findById(id).lean();
  }

  async createTask(insertTask) {
    const doc = await Task.create(insertTask);
    return doc.toObject();
  }

  async updateTask(id, updates) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Task.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  async deleteTask(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const res = await Task.findByIdAndDelete(id);
    return !!res;
  }

  async getNotes(userId) {
    return await Note.find({ userId }).sort({ updatedAt: -1 }).lean();
  }

  async getNote(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Note.findById(id).lean();
  }

  async createNote(insertNote) {
    const doc = await Note.create(insertNote);
    return doc.toObject();
  }

  async updateNote(id, updates) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Note.findByIdAndUpdate(
      id,
      { ...updates, $set: { updatedAt: new Date() } },
      { new: true },
    ).lean();
  }

  async deleteNote(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const res = await Note.findByIdAndDelete(id);
    return !!res;
  }

  async getJournals(userId) {
    return await Journal.find({ userId }).sort({ date: -1 }).lean();
  }

  async getJournal(id) {
    if (!mongoose.isValidObjectId(id)) return undefined;
    return await Journal.findById(id).lean();
  }

  async createJournal(insertJournal) {
    const doc = await Journal.create(insertJournal);
    return doc.toObject();
  }

  async deleteJournal(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const res = await Journal.findByIdAndDelete(id);
    return !!res;
  }
}

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
    return clone(this.users.get(id));
  }

  async getUserByUsername(username) {
    return clone(this.usersByUsername.get(username));
  }

  async getUserByEmail(email) {
    return clone(this.usersByEmail.get(email));
  }

  async createUser(insertUser) {
    const user = {
      id: randomUUID(),
      createdAt: new Date(),
      ...insertUser,
    };
    this.users.set(user.id, user);
    this.usersByUsername.set(user.username, user);
    this.usersByEmail.set(user.email, user);
    return clone(user);
  }

  async getTasks(userId) {
    const tasks = Array.from(this.tasks.values())
      .filter((task) => task.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return tasks.map(clone);
  }

  async getTask(id) {
    return clone(this.tasks.get(id));
  }

  async createTask(insertTask) {
    const task = {
      id: randomUUID(),
      createdAt: new Date(),
      ...insertTask,
    };
    if (task.dueDate) {
      task.dueDate = new Date(task.dueDate);
    } else {
      task.dueDate = null;
    }
    task.completed = Boolean(task.completed);
    task.priority = task.priority || "medium";
    task.description = task.description ?? null;
    this.tasks.set(task.id, task);
    return clone(task);
  }

  async updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    if (updates.dueDate !== undefined) {
      updates.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }
    Object.assign(task, updates);
    return clone(task);
  }

  async deleteTask(id) {
    return this.tasks.delete(id);
  }

  async getNotes(userId) {
    const notes = Array.from(this.notes.values())
      .filter((note) => note.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return notes.map(clone);
  }

  async getNote(id) {
    return clone(this.notes.get(id));
  }

  async createNote(insertNote) {
    const now = new Date();
    const note = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...insertNote,
    };
    this.notes.set(note.id, note);
    return clone(note);
  }

  async updateNote(id, updates) {
    const note = this.notes.get(id);
    if (!note) return undefined;
    Object.assign(note, updates);
    note.updatedAt = new Date();
    this.notes.set(id, note);
    return clone(note);
  }

  async deleteNote(id) {
    return this.notes.delete(id);
  }

  async getJournals(userId) {
    const journals = Array.from(this.journals.values())
      .filter((journal) => journal.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return journals.map(clone);
  }

  async getJournal(id) {
    return clone(this.journals.get(id));
  }

  async createJournal(insertJournal) {
    const journal = {
      id: randomUUID(),
      createdAt: new Date(),
      ...insertJournal,
    };
    journal.date = journal.date ? new Date(journal.date) : new Date();
    journal.activities = journal.activities ?? null;
    this.journals.set(journal.id, journal);
    return clone(journal);
  }

  async deleteJournal(id) {
    return this.journals.delete(id);
  }
}

const useMongoStorage = Boolean(process.env.MONGODB_URI);
export const storage = useMongoStorage ? new MongoStorage() : new MemoryStorage();
export const usingMongoStorage = useMongoStorage;