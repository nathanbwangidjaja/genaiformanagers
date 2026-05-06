/**
 * End-to-end benchmark of the AI features.
 *
 * Simulates a teacher's "produce a lesson plan I'd actually teach Monday" flow
 * end-to-end against the real Anthropic API, recording:
 *   - wall-clock latency per call
 *   - input / output tokens (from the API response usage object)
 *   - which prompts produced usable output and which didn't
 *
 * Run with:  npx tsx scripts/ai-e2e-bench.ts
 */

import { anthropic, MODEL } from "../src/server/services/ai/client";
import { generateLessonPlan } from "../src/server/services/ai/lesson-plan";
import { generateStudentInsight } from "../src/server/services/ai/student-insight";
import { generateQuestion } from "../src/server/services/ai/generate-question";
import { classifyTutorMessage } from "../src/server/services/ai/classify-tutor-message";
import { streamTutor } from "../src/server/services/ai/tutor";

interface CallRecord {
  label: string;
  ms: number;
  inputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  outputTokens?: number;
  ok: boolean;
  note?: string;
}

const records: CallRecord[] = [];

// Wrap the Anthropic SDK client to capture token usage on every call.
// (Both the lesson-plan and insight services swallow the raw response,
// so we capture via a side-channel: monkey-patch messages.create.)
const realClient = anthropic();
const realCreate = realClient.messages.create.bind(realClient.messages);
const realStream = realClient.messages.stream.bind(realClient.messages);

let lastUsage: any = null;

(realClient.messages as any).create = async (...args: any[]) => {
  const r = await (realCreate as any)(...args);
  lastUsage = r.usage;
  return r;
};

(realClient.messages as any).stream = (...args: any[]) => {
  const s = (realStream as any)(...args);
  // The SDK exposes a finalMessage() for streams
  s.on("message", (m: any) => { lastUsage = m.usage; });
  return s;
};

async function timed<T>(label: string, fn: () => Promise<T>, note?: string): Promise<T | null> {
  lastUsage = null;
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    records.push({
      label,
      ms,
      inputTokens: lastUsage?.input_tokens,
      cacheReadTokens: lastUsage?.cache_read_input_tokens,
      cacheCreationTokens: lastUsage?.cache_creation_input_tokens,
      outputTokens: lastUsage?.output_tokens,
      ok: true,
      note,
    });
    return result;
  } catch (e: any) {
    const ms = Date.now() - start;
    records.push({ label, ms, ok: false, note: e?.message ?? String(e) });
    return null;
  }
}

async function main() {
  console.log(`Model: ${MODEL}\n`);

  // ====================================================================
  // STEP 1 — Generate student insights for one student (would batch IRL)
  // ====================================================================
  const insightInput = {
    studentName: "Student A",
    totalAttempts: 47,
    windowDays: 30,
    overallMastery: 0.58,
    scores: {
      curiosity: 0.72,
      motivation: 0.55,
      engagement: 0.81,
      persistence: 0.43,
      flow: 0.61,
    },
    conceptBreakdown: [
      { code: "7.NS.1d", name: "Add/subtract rationals using properties of operations", mastery: 0.31, weakness: "conceptual", attempts: 12, dominantError: "sign error in subtraction" },
      { code: "7.RP.2a", name: "Decide whether two quantities are in proportional relationship", mastery: 0.84, weakness: "minor", attempts: 8 },
      { code: "7.EE.4a", name: "Solve word problems leading to equations of form px+q=r", mastery: 0.45, weakness: "conceptual", attempts: 15, dominantError: "translates English to expression incorrectly" },
      { code: "7.G.1", name: "Solve problems involving scale drawings", mastery: 0.67, weakness: "minor", attempts: 6 },
    ],
    cognitiveTraits: [
      { trait: "perseverance", label: "Perseverance after failure", value: 0.42, evidence: "abandons problem after 1.3 incorrect attempts on average vs class avg 2.1" },
      { trait: "exploration", label: "Self-directed exploration", value: 0.78, evidence: "attempted 5 problems beyond assigned scope this week" },
    ],
    tutorIntents: { conceptual_why: 4, procedural_how: 9, clarification: 2, verification: 3 },
  };

  await timed("student-insight #1 (initial)", () =>
    generateStudentInsight(insightInput),
  );

  // Second call — same system prompt, should be a cache HIT
  await timed("student-insight #2 (different student, cache hit on system)", () =>
    generateStudentInsight({ ...insightInput, studentName: "Student B", overallMastery: 0.78 }),
  );

  // ====================================================================
  // STEP 2 — Generate a lesson plan (initial)
  // ====================================================================
  const lessonReq = {
    className: "Period 3 Pre-Algebra",
    studentCount: 24,
    concepts: [
      { code: "7.NS.1d", name: "Add/subtract rationals using properties of operations", domain: "The Number System", avgMastery: 0.42, strugglingCount: 16 },
      { code: "7.EE.4a", name: "Solve word problems leading to equations of form px+q=r", domain: "Expressions and Equations", avgMastery: 0.51, strugglingCount: 12 },
      { code: "7.RP.2c", name: "Represent proportional relationships by equations", domain: "Ratios and Proportional Relationships", avgMastery: 0.59, strugglingCount: 9 },
      { code: "7.G.4", name: "Know the formulas for the area and circumference of a circle", domain: "Geometry", avgMastery: 0.63, strugglingCount: 7 },
      { code: "7.SP.5", name: "Understand probability of a chance event", domain: "Statistics & Probability", avgMastery: 0.71, strugglingCount: 4 },
      { code: "7.NS.2c", name: "Apply properties of operations to multiply rational numbers", domain: "The Number System", avgMastery: 0.55, strugglingCount: 11 },
    ],
  };

  const lp1 = await timed("lesson-plan #1 (initial, no focus notes)", () =>
    generateLessonPlan(lessonReq),
  );

  // Iteration 1: vague prompt that should produce poor differentiation
  const lp2 = await timed("lesson-plan #2 (vague: 'make it better')", () =>
    generateLessonPlan({ ...lessonReq, focusNotes: "Make it better." }),
    "vague prompt — expected to produce stylistic-only changes",
  );

  // Iteration 2: targeted prompt with constraints
  const lp3 = await timed("lesson-plan #3 (targeted: time/concept/no-group)", () =>
    generateLessonPlan({
      ...lessonReq,
      focusNotes: "20 minutes only. Focus only on 7.NS.1d. No group work. Opener for the week, so keep energy high.",
    }),
    "targeted prompt with hard constraints",
  );

  // ====================================================================
  // STEP 3 — Generate 3 practice questions
  // ====================================================================
  const qReq = {
    standardCode: "7.NS.1d",
    standardName: "Add/subtract rationals using properties of operations",
    standardDescription: "Apply properties of operations as strategies to add and subtract rational numbers.",
    difficulty: 2.5,
  };

  for (let i = 1; i <= 3; i++) {
    await timed(`generate-question #${i}`, () => generateQuestion({ ...qReq, difficulty: 1.5 + i }));
  }

  // ====================================================================
  // STEP 4 — Tutor classification + tutor turn (typical student flow)
  // ====================================================================
  await timed("classify-tutor-message", () =>
    classifyTutorMessage(
      "wait why do you flip the sign when you subtract a negative",
      "Compute: 7 - (-3) = ?",
    ),
  );

  // Stream tutor turn — collect into a buffer, capture usage
  await timed("tutor (streaming)", async () => {
    const gen = streamTutor({
      question: { text: "Compute: 7 - (-3) = ?", code: "7.NS.1d", difficulty: 2.0, options: [
        { value: "4", correct: false }, { value: "10", correct: true }, { value: "-10", correct: false }, { value: "-4", correct: false },
      ]},
      mastery: 0.31,
      userMessage: "wait why do you flip the sign when you subtract a negative",
      studentName: "Student A",
    });
    let out = "";
    for await (const chunk of gen) out += chunk;
    return out.length;
  });

  // ====================================================================
  // REPORT
  // ====================================================================
  console.log("\n=== PER-CALL RESULTS ===");
  console.log("label | ms | input | cache_read | cache_create | output | ok | note");
  for (const r of records) {
    console.log(
      [
        r.label,
        r.ms,
        r.inputTokens ?? "-",
        r.cacheReadTokens ?? "-",
        r.cacheCreationTokens ?? "-",
        r.outputTokens ?? "-",
        r.ok,
        r.note ?? "",
      ].join(" | "),
    );
  }

  // Aggregates relevant to the report
  const totalIn = records.reduce((a, r) => a + (r.inputTokens ?? 0), 0);
  const totalCacheRead = records.reduce((a, r) => a + (r.cacheReadTokens ?? 0), 0);
  const totalCacheCreate = records.reduce((a, r) => a + (r.cacheCreationTokens ?? 0), 0);
  const totalOut = records.reduce((a, r) => a + (r.outputTokens ?? 0), 0);
  const totalMs = records.reduce((a, r) => a + r.ms, 0);
  const totalCalls = records.length;

  console.log("\n=== AGGREGATE (one full E2E run, single teacher) ===");
  console.log(`Total LLM calls:           ${totalCalls}`);
  console.log(`Total wall-clock LLM time: ${(totalMs / 1000).toFixed(1)} s`);
  console.log(`Total uncached input:      ${totalIn}`);
  console.log(`Total cache reads:         ${totalCacheRead}`);
  console.log(`Total cache creations:     ${totalCacheCreate}`);
  console.log(`Total output:              ${totalOut}`);

  // Pricing (Sonnet 4.6 list): $3/M uncached in, $0.30/M cache read, $3.75/M cache write, $15/M out
  const cost =
    (totalIn / 1e6) * 3 +
    (totalCacheRead / 1e6) * 0.3 +
    (totalCacheCreate / 1e6) * 3.75 +
    (totalOut / 1e6) * 15;
  console.log(`Approx cost (Sonnet 4.6):  $${cost.toFixed(4)} for this single E2E run`);

  // Quick qualitative diff between vague and targeted lesson-plan prompts
  if (lp1 && lp2 && lp3) {
    console.log("\n=== QUALITATIVE DIFF: lesson-plan iterations ===");
    console.log(`#1 (initial)   title:    ${lp1.title}`);
    console.log(`#1 (initial)   duration: ${lp1.durationMinutes} min, sections: ${lp1.sections.length}`);
    console.log(`#1 (initial)   targets:  ${lp1.targetConcepts.map((c) => c.code).join(", ")}`);
    console.log(`#2 (vague)     title:    ${lp2.title}`);
    console.log(`#2 (vague)     duration: ${lp2.durationMinutes} min, sections: ${lp2.sections.length}`);
    console.log(`#2 (vague)     targets:  ${lp2.targetConcepts.map((c) => c.code).join(", ")}`);
    console.log(`#3 (targeted)  title:    ${lp3.title}`);
    console.log(`#3 (targeted)  duration: ${lp3.durationMinutes} min, sections: ${lp3.sections.length}`);
    console.log(`#3 (targeted)  targets:  ${lp3.targetConcepts.map((c) => c.code).join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
