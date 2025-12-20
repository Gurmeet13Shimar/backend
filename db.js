import mongoose from "mongoose";
import { log } from "./vite.js";

let hasWarnedAboutMemory = false;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (!hasWarnedAboutMemory) {
      log("MONGODB_URI not set. Falling back to in-memory storage.", "db");
      hasWarnedAboutMemory = true;
    }
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  log("Connected to MongoDB", "db");
  return true;
}