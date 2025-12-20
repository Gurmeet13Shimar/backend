import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    completed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);



