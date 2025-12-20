import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String, default: null },
    category: { type: String, default: "general" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);



