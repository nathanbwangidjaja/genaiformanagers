/**
 * Classifies the intent of a student's message to the AI tutor.
 *
 * Used to derive richer signals about *how* the student engages —
 * not just whether they're asking, but what they're asking.
 *
 *   conceptual_why         — "why does this work?" (curiosity)
 *   procedural_how         — "what do I do next?" (stuck)
 *   clarification          — "what does X mean?" (confused on terms)
 *   verification           — "is this right?" (uncertain)
 *   expressing_understanding — "oh I get it!" (growth signal)
 *   expressing_confusion   — "I'm completely lost" (struggle signal)
 *   off_topic              — not about the math
 */

import { anthropic, MODEL } from "./client";

export type TutorIntent =
  | "conceptual_why"
  | "procedural_how"
  | "clarification"
  | "verification"
  | "expressing_understanding"
  | "expressing_confusion"
  | "off_topic";

const SYSTEM = `You classify Grade 7 student messages to a math tutor.

Categories — pick the SINGLE best one:
- conceptual_why: asking about the underlying logic / "why does this work?"
- procedural_how: asking what step to do next / how to compute something
- clarification: asking what a term, symbol, or part of the question means
- verification: showing their work and checking if it's right
- expressing_understanding: signaling they figured it out ("oh I get it", "that makes sense")
- expressing_confusion: signaling general confusion or frustration without a specific question
- off_topic: not about the current math problem

Return ONLY a JSON object: {"intent": "<category>", "confidence": <0-1>}.`;

const SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "conceptual_why",
        "procedural_how",
        "clarification",
        "verification",
        "expressing_understanding",
        "expressing_confusion",
        "off_topic",
      ],
    },
    confidence: { type: "number" },
  },
  required: ["intent", "confidence"],
  additionalProperties: false,
} as const;

export async function classifyTutorMessage(
  studentMessage: string,
  questionContext?: string,
): Promise<{ intent: TutorIntent; confidence: number }> {
  const client = anthropic();
  const userMessage = `Question being worked on: ${questionContext ?? "(none)"}

Student message to tutor: "${studentMessage}"

Classify the student's intent. Return only the JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  for (const b of response.content) {
    if (b.type === "text") {
      let t = b.text.trim();
      if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      const start = t.indexOf("{");
      const end = t.lastIndexOf("}");
      if (start >= 0 && end > start) t = t.slice(start, end + 1);
      return JSON.parse(t) as { intent: TutorIntent; confidence: number };
    }
  }
  throw new Error("classifier returned no text");
}
