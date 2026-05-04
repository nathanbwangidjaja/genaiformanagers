/**
 * AI Tutor — answers student questions about a problem they're working on.
 * Calibrates explanations to the student's mastery level on the relevant concept.
 *
 * Streams responses (SSE) so the UI can show text as it arrives.
 */

import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { anthropic, MODEL } from "./client";

export interface TutorRequest {
  // The question the student is working on
  question: {
    text: string;
    code: string; // e.g. "7.RP.2b"
    difficulty: number; // 1-5
    options?: { value: string; correct: boolean }[];
  };
  // Their current mastery on this concept (0-1) — affects explanation depth
  mastery: number;
  // The student's question to the tutor
  userMessage: string;
  // Multi-turn: prior chat history with the tutor
  history?: { role: "user" | "assistant"; content: string }[];
  // Optional: the student's name (for warmth)
  studentName?: string;
}

const TUTOR_SYSTEM = `You are a patient, encouraging Grade 7 math tutor named Cortex.

Your job is to help the student understand the math — never just give them the answer.

How to teach:
- Ask Socratic questions that lead the student toward the insight
- Reference the student's specific work when possible
- Keep explanations short and conversational — 2-3 sentences typically
- Use plain language, not jargon
- If the student is confused, scaffold: break the problem into smaller pieces
- Calibrate to the student's mastery level (provided in the user message context):
  - Low mastery (under 30%): focus on fundamentals, use concrete examples, be especially encouraging
  - Medium mastery (30-70%): help them see the pattern they're missing, ask "what would happen if…" questions
  - High mastery (over 70%): challenge them with the why behind the rule, connect to other concepts

Style:
- Warm, age-appropriate, never condescending
- Use math notation sparingly. Prefer plain text like "1/2" over "$\\frac{1}{2}$"
- Never reveal the multiple-choice answer letter directly. If they're stuck, hint at the approach.
- If asked an off-topic question (not math-related), gently redirect: "Let's focus on this problem first — we can chat about that another time."

Format:
- Plain text. No markdown headers, no bullet lists, no bold.
- Just conversational prose, like a tutor sitting next to them.`;

export async function* streamTutor(req: TutorRequest): AsyncGenerator<string> {
  const client = anthropic();

  const masteryLabel =
    req.mastery < 0.3
      ? "low — they're just getting started with this concept"
      : req.mastery < 0.7
      ? "medium — they're developing understanding but not yet solid"
      : "high — they're proficient and looking to deepen understanding";

  const contextBlock = `# Current problem
Standard: ${req.question.code}
Difficulty: ${req.question.difficulty.toFixed(1)} / 5
Question: ${req.question.text}
${
  req.question.options
    ? `Answer choices:\n${req.question.options
        .map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o.value}`)
        .join("\n")}`
    : ""
}

# Student context
${req.studentName ? `Name: ${req.studentName}` : ""}
Current mastery on this concept: ${Math.round(req.mastery * 100)}% (${masteryLabel})`;

  // Build messages: prior history + new context-prefixed user turn
  const messages: MessageParam[] = [];
  for (const m of req.history ?? []) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({
    role: "user",
    content:
      req.history && req.history.length > 0
        ? req.userMessage
        : `${contextBlock}\n\n# Student's question\n${req.userMessage}`,
  });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: TUTOR_SYSTEM,
        cache_control: { type: "ephemeral" }, // cache the (long, stable) system prompt
      },
    ],
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
