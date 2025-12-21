import mongoose from "mongoose";

let hasWarnedAboutMemory = false;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (!hasWarnedAboutMemory) {
      console.log(
        "MONGODB_URI not set. Falling back to in-memory storage."
      );
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

  console.log("Connected to MongoDB");
  return true;
}
