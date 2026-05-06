/**
 * Live end-to-end test of every AI feature, with the new no-schema-endpoint
 * implementation. Aborts cleanly on failure so we can see exactly which
 * call is broken.
 */

import { generateStudentInsight } from "../src/server/services/ai/student-insight";
import { generateLessonPlan } from "../src/server/services/ai/lesson-plan";
import { generateQuestion } from "../src/server/services/ai/generate-question";
import { classifyTutorMessage } from "../src/server/services/ai/classify-tutor-message";
import { streamTutor } from "../src/server/services/ai/tutor";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(`✅ ${label} — ${Date.now() - t0} ms`);
    return r;
  } catch (e: any) {
    console.error(`❌ ${label} — ${Date.now() - t0} ms — ${e?.message ?? e}`);
    return null;
  }
}

async function main() {
  // 1. Student insight
  const insight = await timed("student-insight", () =>
    generateStudentInsight({
      studentName: "Sofia Garcia",
      totalAttempts: 50,
      windowDays: 30,
      overallMastery: 0.35,
      scores: { curiosity: 0.46, motivation: 0.55, engagement: 0.43, persistence: 0.61, flow: 0.32 },
      conceptBreakdown: [
        { code: "7.RP.1", name: "Unit Rates with Fractions", mastery: 0.22, weakness: "CONCEPTUALLY_WEAK", attempts: 8, dominantError: "conceptual" },
        { code: "7.EE.4", name: "Solve Equations & Inequalities", mastery: 0.27, weakness: "CONCEPTUALLY_WEAK", attempts: 6, dominantError: "conceptual" },
        { code: "7.NS.1d", name: "Adding Rational Numbers", mastery: 0.41, weakness: "CONCEPTUALLY_WEAK", attempts: 12, dominantError: "conceptual" },
      ],
      cognitiveTraits: [
        { trait: "growth", label: "Improving trend", value: 0.72, evidence: "mastery on 7.NS.1d climbed 18%→41% in 14 days" },
        { trait: "language_load", label: "Word-problem comprehension gap", value: 0.62, evidence: "accuracy drops 28% on word problems" },
      ],
      tutorIntents: { conceptual_why: 2, procedural_how: 6, clarification: 11, verification: 3, expressing_confusion: 5 },
    }),
  );
  if (insight) console.log(`   summary: ${insight.summary.slice(0, 100)}…`);

  // 2. Lesson plan
  const lp = await timed("lesson-plan", () =>
    generateLessonPlan({
      className: "Period 3 Pre-Algebra",
      studentCount: 5,
      concepts: [
        { code: "7.NS.1d", name: "Adding Rational Numbers", domain: "NUMBER_SYSTEM", avgMastery: 0.42, strugglingCount: 3 },
        { code: "7.EE.4", name: "Solve Equations & Inequalities", domain: "EXPRESSIONS_EQUATIONS", avgMastery: 0.51, strugglingCount: 2 },
        { code: "7.RP.2", name: "Proportional Relationships", domain: "RATIOS_PROPORTIONAL", avgMastery: 0.59, strugglingCount: 2 },
      ],
    }),
  );
  if (lp) console.log(`   title: ${lp.title}`);

  // 3. Generate question — baseline
  const q1 = await timed("generate-question (no real-world)", () =>
    generateQuestion({
      standardCode: "7.NS.1d",
      standardName: "Adding Rational Numbers",
      standardDescription: "Add rational numbers with different signs.",
      difficulty: 2.5,
      useRealWorldContext: false,
    }),
  );
  if (q1) console.log(`   q: ${q1.text.slice(0, 80)}…`);

  // 4. Generate question — with real-world (weather)
  const q2 = await timed("generate-question (Open-Meteo)", () =>
    generateQuestion({
      standardCode: "7.NS.1d",
      standardName: "Adding Rational Numbers",
      standardDescription: "Add rational numbers with different signs.",
      difficulty: 2.5,
      useRealWorldContext: true,
    }),
  );
  if (q2) console.log(`   q: ${q2.text.slice(0, 100)}…`);
  if (q2?.realWorldContext) console.log(`   src: ${q2.realWorldContext.source}`);

  // 5. Generate question — with real-world (currency)
  const q3 = await timed("generate-question (open.er-api.com)", () =>
    generateQuestion({
      standardCode: "7.RP.3",
      standardName: "Multi-step Ratio & Percent Problems",
      difficulty: 3.0,
      useRealWorldContext: true,
    }),
  );
  if (q3) console.log(`   q: ${q3.text.slice(0, 100)}…`);
  if (q3?.realWorldContext) console.log(`   src: ${q3.realWorldContext.source}`);

  // 6. Classify
  const cls = await timed("classify-tutor-message", () =>
    classifyTutorMessage(
      "wait why do you flip the sign when you subtract a negative",
      "Compute: 7 - (-3) = ?",
    ),
  );
  if (cls) console.log(`   intent: ${cls.intent} (conf ${cls.confidence})`);

  // 7. Tutor (streaming)
  const tutorStart = Date.now();
  let tutorOut = "";
  try {
    const gen = streamTutor({
      question: { text: "Compute: 7 - (-3) = ?", code: "7.NS.1d", difficulty: 2.0, options: [
        { value: "4", correct: false }, { value: "10", correct: true }, { value: "-10", correct: false }, { value: "-4", correct: false },
      ]},
      mastery: 0.31,
      userMessage: "wait why do you flip the sign when you subtract a negative",
      studentName: "Maya",
    });
    for await (const chunk of gen) tutorOut += chunk;
    console.log(`✅ tutor (streaming) — ${Date.now() - tutorStart} ms`);
    console.log(`   reply: ${tutorOut.slice(0, 100)}…`);
  } catch (e: any) {
    console.error(`❌ tutor (streaming) — ${Date.now() - tutorStart} ms — ${e?.message ?? e}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
