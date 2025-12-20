import mongoose from "mongoose";

const journalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, default: Date.now, required: true },
    content: { type: String, required: true },
    mood: { type: String, required: true },
    activities: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Journal = mongoose.models.Journal || mongoose.model("Journal", journalSchema);



