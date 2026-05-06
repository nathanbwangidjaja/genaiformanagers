/**
 * AI Lesson Plan Generator — takes class-aggregate mastery data and produces
 * a structured 15-min mini-lesson plan targeting the weakest concepts.
 */

import { anthropic, MODEL } from "./client";

export interface LessonPlanRequest {
  className: string;
  studentCount: number;
  // Per-concept aggregates: average mastery + how many students need work
  concepts: {
    code: string; // e.g. "7.NS.1d"
    name: string;
    domain: string;
    avgMastery: number; // 0-1
    strugglingCount: number; // students with mastery < 0.5
  }[];
  // Optional: teacher-supplied focus or constraint
  focusNotes?: string;
}

export interface LessonPlan {
  title: string;
  targetConcepts: { code: string; name: string }[];
  durationMinutes: number;
  summary: string;
  sections: {
    heading: string;
    durationMinutes: number;
    description: string;
    activities: string[];
  }[];
  practiceProblemSuggestions: {
    code: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard";
  }[];
  successCriteria: string[];
}

const SYSTEM = `You are an expert middle-school math instructional designer.

You produce concrete, classroom-ready lesson plans for Grade 7 math teachers based on class-wide mastery data.

Lesson plan principles:
- Target the 1-3 concepts where the most students are struggling
- Connect to prior knowledge — name the prerequisite concepts students likely missed
- Front-load with a quick concrete example or visual model, not a formula
- Include both teacher-led explanation and student practice
- Keep total time to 15-25 minutes — this is a mini-lesson, not a full class
- Be specific and actionable: "draw a number line from -10 to 10" not "use a visual aid"
- Use Common Core terminology where appropriate

Output requirements:
- Return ONLY a JSON object matching the EXACT shape below. No prose before or after, no code fences, no commentary. Every key is required — do not omit any.

{
  "title": "string — specific, inviting (not generic 'Math Lesson')",
  "targetConcepts": [
    {"code": "7.NS.1d", "name": "Adding Rational Numbers"}
  ],
  "durationMinutes": 20,
  "summary": "string — one paragraph teacher-facing overview",
  "sections": [
    {
      "heading": "string",
      "durationMinutes": 5,
      "description": "string — one or two sentences of what this section is",
      "activities": ["imperative step 1", "imperative step 2"]
    }
  ],
  "practiceProblemSuggestions": [
    {"code": "7.NS.1d", "description": "string — what the problem asks", "difficulty": "Easy"}
  ],
  "successCriteria": ["observable criterion 1", "observable criterion 2"]
}

Critical:
- targetConcepts MUST be a non-empty array (1–3 entries). Each entry MUST have both "code" and "name".
- sections MUST be a non-empty array (typically 3–5 entries).
- Each section's "activities" MUST be a non-empty array of imperative strings.
- practiceProblemSuggestions MUST be an array (can be 0–5 entries) with "code", "description", and "difficulty" on each.
- successCriteria MUST be an array of observable criterion strings.
- difficulty values must be exactly "Easy", "Medium", or "Hard".`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Specific, inviting lesson title" },
    targetConcepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          name: { type: "string" },
        },
        required: ["code", "name"],
        additionalProperties: false,
      },
    },
    durationMinutes: { type: "integer", description: "Total minutes (15-25 typical)" },
    summary: { type: "string", description: "One paragraph teacher-facing overview" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          durationMinutes: { type: "integer" },
          description: { type: "string" },
          activities: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "durationMinutes", "description", "activities"],
        additionalProperties: false,
      },
    },
    practiceProblemSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
        },
        required: ["code", "description", "difficulty"],
        additionalProperties: false,
      },
    },
    successCriteria: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "targetConcepts",
    "durationMinutes",
    "summary",
    "sections",
    "practiceProblemSuggestions",
    "successCriteria",
  ],
  additionalProperties: false,
} as const;

export async function generateLessonPlan(req: LessonPlanRequest): Promise<LessonPlan> {
  const client = anthropic();

  // Sort: weakest first
  const sorted = [...req.concepts].sort((a, b) => a.avgMastery - b.avgMastery);
  const top = sorted.slice(0, 6); // give the model the worst ~6 to choose from

  const conceptTable = top
    .map(
      (c) =>
        `- ${c.code} ${c.name} (${c.domain}) — class avg ${Math.round(c.avgMastery * 100)}%, ${c.strugglingCount}/${req.studentCount} struggling`,
    )
    .join("\n");

  const userMessage = `Class: ${req.className}
Total students: ${req.studentCount}

Concepts where the class needs the most help (weakest first):
${conceptTable}
${req.focusNotes ? `\nTeacher focus notes: ${req.focusNotes}` : ""}

Produce a single 15-25 minute mini-lesson plan that targets the 1-3 most impactful concepts above. Pick concepts that have shared prerequisites if possible. Return only the JSON object.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  // Find the text block; the SDK returns content as ContentBlock[]
  for (const block of response.content) {
    if (block.type === "text") {
      const raw = parseLpJson(block.text) as Partial<LessonPlan> & Record<string, unknown>;
      return normalizeLessonPlan(raw, req);
    }
  }
  throw new Error("No text content in lesson plan response");
}

function parseLpJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

/**
 * Defensive normalizer — guarantees every field the UI reads exists, with
 * a sane default if the model omitted it. Without this, a missing field
 * crashes the LessonPlanView with "Cannot read properties of undefined".
 */
function normalizeLessonPlan(
  raw: Partial<LessonPlan> & Record<string, unknown>,
  req: LessonPlanRequest,
): LessonPlan {
  // targetConcepts: fall back to the weakest concept from the request
  let targetConcepts = Array.isArray(raw.targetConcepts) ? raw.targetConcepts : [];
  targetConcepts = targetConcepts
    .filter((c: any) => c && typeof c.code === "string" && typeof c.name === "string")
    .map((c: any) => ({ code: c.code, name: c.name }));
  if (targetConcepts.length === 0 && req.concepts.length > 0) {
    const weakest = [...req.concepts].sort((a, b) => a.avgMastery - b.avgMastery)[0];
    targetConcepts = [{ code: weakest.code, name: weakest.name }];
  }

  let sections = Array.isArray(raw.sections) ? raw.sections : [];
  sections = sections
    .map((s: any) => ({
      heading: typeof s?.heading === "string" ? s.heading : "Section",
      durationMinutes: Number.isFinite(s?.durationMinutes) ? Number(s.durationMinutes) : 5,
      description: typeof s?.description === "string" ? s.description : "",
      activities: Array.isArray(s?.activities)
        ? s.activities.filter((a: unknown) => typeof a === "string")
        : [],
    }))
    .filter((s: any) => s.activities.length > 0);
  if (sections.length === 0) {
    sections = [
      {
        heading: "Lesson body",
        durationMinutes: 15,
        description: raw.summary && typeof raw.summary === "string" ? raw.summary : "",
        activities: ["(Lesson body — regenerate for a fully detailed plan)"],
      },
    ];
  }

  let practiceProblemSuggestions = Array.isArray(raw.practiceProblemSuggestions)
    ? raw.practiceProblemSuggestions
    : [];
  practiceProblemSuggestions = practiceProblemSuggestions
    .map((p: any) => ({
      code: typeof p?.code === "string" ? p.code : targetConcepts[0]?.code ?? "",
      description: typeof p?.description === "string" ? p.description : "",
      difficulty:
        p?.difficulty === "Easy" || p?.difficulty === "Medium" || p?.difficulty === "Hard"
          ? p.difficulty
          : "Medium",
    }))
    .filter((p: any) => p.description.length > 0);

  const successCriteria = Array.isArray(raw.successCriteria)
    ? raw.successCriteria.filter((s: unknown) => typeof s === "string")
    : [];

  return {
    title: typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title
      : `Mini-lesson: ${targetConcepts[0]?.name ?? "Math"}`,
    targetConcepts,
    durationMinutes: Number.isFinite(raw.durationMinutes) ? Number(raw.durationMinutes) : 20,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    sections,
    practiceProblemSuggestions,
    successCriteria,
  };
}
