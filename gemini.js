import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function summarizeStudentNotes(noteContent) {
  if (!noteContent || noteContent.trim().length === 0) {
    throw new Error("Note content is empty");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(
    `Summarize the following notes for a college student:\n\n${noteContent}`
  );

  return result.response.text();
}
console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY);
