/**
 * AI-generated teacher-facing student insight.
 *
 * Takes the structured cognitive profile and produces:
 *   - summary: 2-3 sentence "what's going on with this student"
 *   - highlights: 3-5 specific observations (strengths/risks/curiosities/growth)
 *   - recommendations: 1-3 concrete actions the teacher can take this week
 *
 * Cached per student. Re-runs when the input data hash changes.
 */

import crypto from "node:crypto";
import { anthropic, MODEL } from "./client";

export interface InsightInput {
  studentName: string;
  totalAttempts: number;
  windowDays: number;
  overallMastery: number;
  scores: {
    curiosity: number;
    motivation: number;
    engagement: number;
    persistence: number;
    flow: number;
  };
  conceptBreakdown: {
    code: string;
    name: string;
    mastery: number;
    weakness: string; // category enum value
    attempts: number;
    dominantError?: string;
  }[];
  cognitiveTraits: { trait: string; label: string; value: number; evidence: string }[];
  tutorIntents: Record<string, number>;
}

export interface StudentInsight {
  summary: string;
  highlights: { type: "strength" | "risk" | "curiosity" | "growth"; text: string }[];
  recommendations: { action: string; why: string }[];
}

const SYSTEM = `You are an experienced middle-school math instructional coach.

You receive structured data about a student — mastery, behavioral scores, cognitive traits, error patterns, tutor question patterns — and produce a short brief for their teacher.

Style:
- Direct, observational, never patronizing
- Treat the student as a whole person, not a dashboard
- Tie observations to specific evidence in the data when possible
- Avoid jargon — say "she asks a lot of 'why' questions" not "high inquiry-style score"
- Don't repeat numbers the teacher already sees on the page; interpret them

Return ONLY a JSON object matching this EXACT shape — every key name and shape must match. No prose, no code fences.

{
  "summary": "string — 2-3 sentences, plain prose, captures the most actionable thing about this student RIGHT NOW",
  "highlights": [
    {
      "type": "strength",
      "text": "string — one specific observation tied to evidence"
    }
  ],
  "recommendations": [
    {
      "action": "string — concrete teaching action",
      "why": "string — short justification tied to the data"
    }
  ]
}

Critical key-name rules:
- Each highlight MUST have keys "type" and "text" — not "tag", not "observation", not "category", not "body". Exactly "type" and "text".
- The "type" value must be one of: "strength", "risk", "curiosity", "growth". Lowercase, exactly those four strings.
- highlights must contain 3 to 5 entries.
- recommendations must contain 1 to 3 entries with keys "action" and "why".`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["strength", "risk", "curiosity", "growth"] },
          text: { type: "string" },
        },
        required: ["type", "text"],
        additionalProperties: false,
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          why: { type: "string" },
        },
        required: ["action", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "highlights", "recommendations"],
  additionalProperties: false,
} as const;

export function hashInput(input: InsightInput): string {
  // Stable hash: serialize with sorted keys
  const stable = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}

export async function generateStudentInsight(
  input: InsightInput,
): Promise<StudentInsight> {
  const client = anthropic();

  const userMessage = `Student: ${input.studentName}
Window: last ${input.windowDays} days
Total attempts: ${input.totalAttempts}
Overall mastery: ${(input.overallMastery * 100).toFixed(0)}%

Behavioral scores (0-1):
- Curiosity: ${input.scores.curiosity.toFixed(2)}
- Motivation: ${input.scores.motivation.toFixed(2)}
- Engagement: ${input.scores.engagement.toFixed(2)}
- Persistence: ${input.scores.persistence.toFixed(2)}
- Flow state index: ${input.scores.flow.toFixed(2)}

Cognitive traits inferred:
${input.cognitiveTraits.map((t) => `- ${t.label} (value ${t.value.toFixed(2)}): ${t.evidence}`).join("\n") || "(insufficient data)"}

Concept breakdown:
${input.conceptBreakdown
    .slice(0, 12)
    .map((c) => `- ${c.code} ${c.name}: mastery ${(c.mastery * 100).toFixed(0)}%, ${c.weakness}, ${c.attempts} attempts${c.dominantError ? `, dominant error: ${c.dominantError}` : ""}`)
    .join("\n") || "(no practice yet)"}

Tutor question patterns: ${
    Object.entries(input.tutorIntents).length > 0
      ? Object.entries(input.tutorIntents).map(([k, v]) => `${k}: ${v}`).join(", ")
      : "no tutor interactions yet"
  }

Produce the JSON brief.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  for (const b of response.content) {
    if (b.type === "text") {
      const raw = parseStrictJson(b.text) as Record<string, unknown>;
      return normalizeInsight(raw);
    }
  }
  throw new Error("insight gen returned no text");
}

/**
 * Normalize the model's output to the exact shape the UI consumes. The
 * non-schema endpoint occasionally drifts on key names (e.g. "tag" instead
 * of "type", "observation" instead of "text"). Fix that here so a stale
 * cached blob never crashes the per-student page.
 */
export function normalizeInsight(raw: Record<string, unknown>): StudentInsight {
  const validTypes = ["strength", "risk", "curiosity", "growth"] as const;
  type HType = (typeof validTypes)[number];

  const summary = typeof raw.summary === "string" ? raw.summary : "";

  const highlightsIn = Array.isArray(raw.highlights) ? raw.highlights : [];
  const highlights = highlightsIn
    .map((h: any) => {
      const rawType = (h?.type ?? h?.tag ?? h?.category ?? "growth") as string;
      const t = rawType.toLowerCase();
      const type: HType = (validTypes as readonly string[]).includes(t)
        ? (t as HType)
        : "growth";
      const text =
        h?.text ?? h?.observation ?? h?.body ?? h?.detail ?? h?.content ?? "";
      return { type, text: typeof text === "string" ? text : String(text) };
    })
    .filter((h) => h.text.length > 0);

  const recIn = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  const recommendations = recIn
    .map((r: any) => ({
      action: typeof r?.action === "string" ? r.action : String(r?.action ?? r?.what ?? ""),
      why: typeof r?.why === "string" ? r.why : String(r?.why ?? r?.reason ?? r?.because ?? ""),
    }))
    .filter((r) => r.action.length > 0);

  return { summary, highlights, recommendations };
}

/**
 * Robust JSON extractor — strips ```json fences and any pre/post prose,
 * then parses. The model is told to return JSON only, but we defend
 * anyway so a stray "Here is..." line doesn't break the page.
 */
function parseStrictJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}
