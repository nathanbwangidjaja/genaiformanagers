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
- Return ONLY a JSON object matching the provided schema. No prose before or after.
- Title should be specific and inviting, not generic. Bad: "Math Lesson". Good: "Why Subtracting a Negative Adds: A 15-Minute Number Line Lesson".
- Each section should have 1-3 specific activities. Activities should be imperatives a teacher can read aloud or follow step by step.
- Success criteria are observable: "students can solve 4 of 5 practice problems" not "students understand".`;

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
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: userMessage }],
  });

  // Find the text block; the SDK returns content as ContentBlock[]
  for (const block of response.content) {
    if (block.type === "text") {
      return JSON.parse(block.text) as LessonPlan;
    }
  }
  throw new Error("No text content in lesson plan response");
}
