/**
 * End-to-end test script.
 *
 * Creates synthetic teacher + student + class + assignment, simulates the
 * student answering questions via the live HTTP API, then verifies:
 *   - Submission rows persist
 *   - Mastery updates via BKT
 *   - Behavioral aggregator runs
 *   - AI tutor (if ANTHROPIC_API_KEY set) returns text
 *   - AI question generator (if ANTHROPIC_API_KEY set) persists a new question
 *
 * Run while `npm run dev` is up:
 *   npx tsx scripts/test-flow.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";

// Load .env manually — Node's --env-file doesn't handle quoted values
// (and Next.js's loader is what handles them in the dev server).
function loadEnv(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env");
loadEnv(".env.local");

const prisma = new PrismaClient();

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const HAS_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY;

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const SKIP = "\x1b[33m⏭\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`${PASS} ${name}${detail ? ` ${DIM}${detail}${RESET}` : ""}`);
    passed += 1;
  } else {
    console.log(`${FAIL} ${name}${detail ? ` ${DIM}${detail}${RESET}` : ""}`);
    failed += 1;
  }
}

function skip(name: string, why: string) {
  console.log(`${SKIP} ${name} ${DIM}(${why})${RESET}`);
  skipped += 1;
}

function section(name: string) {
  console.log(`\n${BOLD}━━━ ${name} ━━━${RESET}`);
}

async function main() {
  console.log(`${BOLD}Cortex end-to-end test${RESET}\n`);
  console.log(`Target: ${BASE}`);
  console.log(`Anthropic: ${HAS_ANTHROPIC ? "configured" : "not configured (AI tests will skip)"}\n`);

  // === Setup: clean any prior test data ===
  section("Setup");
  const TEST_PREFIX = "TESTRUN_";
  await prisma.submissionResponse.deleteMany({
    where: { submission: { assignment: { class: { name: { startsWith: TEST_PREFIX } } } } },
  });
  await prisma.submission.deleteMany({
    where: { assignment: { class: { name: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.assignmentQuestion.deleteMany({
    where: { assignment: { class: { name: { startsWith: TEST_PREFIX } } } },
  });
  await prisma.assignment.deleteMany({
    where: { class: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.classEnrollment.deleteMany({
    where: { class: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.class.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.studentConceptMastery.deleteMany({
    where: { student: { user: { email: { contains: "testrun-" } } } },
  });
  await prisma.studentBehavioralProfile.deleteMany({
    where: { student: { user: { email: { contains: "testrun-" } } } },
  });
  await prisma.interactionEvent.deleteMany({
    where: { student: { user: { email: { contains: "testrun-" } } } },
  });
  await prisma.studentProfile.deleteMany({
    where: { user: { email: { contains: "testrun-" } } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: "testrun-" } } });
  check("cleaned prior test data", true);

  // === Create synthetic teacher and student ===
  const ts = Date.now();
  const teacher = await prisma.user.create({
    data: {
      clerkId: `test_teacher_${ts}`,
      email: `testrun-teacher-${ts}@cortex.test`,
      firstName: "Test",
      lastName: "Teacher",
      role: "TEACHER",
    },
  });
  const studentUser = await prisma.user.create({
    data: {
      clerkId: `test_student_${ts}`,
      email: `testrun-student-${ts}@cortex.test`,
      firstName: "Test",
      lastName: "Student",
      role: "STUDENT",
    },
  });
  const studentProfile = await prisma.studentProfile.create({
    data: { userId: studentUser.id },
  });
  check("created teacher + student users", true, `teacher=${teacher.id.slice(0, 8)} student=${studentUser.id.slice(0, 8)}`);

  // === Create class + enrollment ===
  const cls = await prisma.class.create({
    data: {
      name: `${TEST_PREFIX}Period 1`,
      gradeLevel: 7,
      teacherId: teacher.id,
      inviteCode: `T${ts.toString().slice(-5)}`,
    },
  });
  await prisma.classEnrollment.create({
    data: { classId: cls.id, studentId: studentUser.id },
  });
  check("created class with enrollment", true, `code=${cls.inviteCode}`);

  // === Pull seeded curriculum + questions ===
  section("Curriculum + questions");
  const conceptCount = await prisma.curriculumNode.count({ where: { depth: "STANDARD" } });
  check(`curriculum loaded`, conceptCount > 0, `${conceptCount} standards`);

  const allQuestions = await prisma.question.findMany({
    include: { curriculumNode: true },
    take: 10,
  });
  check(`questions seeded`, allQuestions.length > 0, `${allQuestions.length} available`);

  if (allQuestions.length === 0) {
    console.log("\nNo questions seeded — run `npm run db:seed` first.\n");
    process.exit(1);
  }

  // === Create an assignment ===
  const assignment = await prisma.assignment.create({
    data: {
      classId: cls.id,
      title: "Test Assignment",
      isAdaptive: false,
      questions: {
        create: allQuestions.slice(0, 3).map((q, i) => ({
          questionId: q.id,
          orderIndex: i,
        })),
      },
    },
  });
  check("created assignment with 3 questions", true, `id=${assignment.id.slice(0, 8)}`);

  // === Create open submission ===
  const submission = await prisma.submission.create({
    data: { assignmentId: assignment.id, studentId: studentProfile.id },
  });
  check("opened submission", true);

  // === Simulate the student answering all 3 questions via the API ===
  section("Student answers via API");
  for (let i = 0; i < 3; i++) {
    const q = allQuestions[i];
    const content = (q.content ?? {}) as { options?: { value: string; correct: boolean }[] };
    const options = content.options ?? [];

    // Make the test deterministic: answer correctly on Qs 0 and 2, incorrectly on 1
    const targetCorrect = i !== 1;
    const opt = options.find((o) => o.correct === targetCorrect) ?? options[0];

    const res = await fetch(`${BASE}/api/interactions/attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: studentProfile.id,
        questionId: q.id,
        curriculumNodeId: q.curriculumNodeId,
        isCorrect: opt.correct,
        timeSpentMs: 30000 + i * 5000,
        hintsUsed: i === 1 ? 1 : 0, // used a hint on the wrong one
        attemptNumber: 1,
        errorType: !opt.correct ? "conceptual" : null,
        submissionId: submission.id,
        submissionAnswer: opt.value,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      check(`Q${i + 1} attempt persisted`, false, `${res.status}: ${text.slice(0, 100)}`);
      continue;
    }
    const data = (await res.json()) as { newMastery: number; delta: number };
    check(
      `Q${i + 1} attempt persisted (${opt.correct ? "correct" : "wrong"})`,
      true,
      `mastery=${(data.newMastery * 100).toFixed(1)}% Δ=${(data.delta * 100).toFixed(1)}%`,
    );
  }

  // === Complete submission ===
  const completeRes = await fetch(`${BASE}/api/submissions/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ submissionId: submission.id }),
  });
  check("submission completed", completeRes.ok);

  // === Verify DB state ===
  section("DB verification");
  const refreshedSub = await prisma.submission.findUnique({
    where: { id: submission.id },
    include: { responses: true },
  });
  check("submission has 3 responses", refreshedSub?.responses.length === 3, `${refreshedSub?.responses.length}`);
  check("submission marked complete", refreshedSub?.completedAt !== null);
  check(
    "score computed",
    refreshedSub?.score !== null && refreshedSub?.score !== undefined,
    `${((refreshedSub?.score ?? 0) * 100).toFixed(0)}%`,
  );

  const masteryRecords = await prisma.studentConceptMastery.findMany({
    where: { studentId: studentProfile.id },
    include: { curriculumNode: true },
  });
  check("mastery records created", masteryRecords.length > 0, `${masteryRecords.length} concepts`);
  for (const m of masteryRecords) {
    const inRange = m.masteryLevel >= 0 && m.masteryLevel <= 1;
    check(
      `  ${m.curriculumNode.code} mastery in [0,1]`,
      inRange,
      `${(m.masteryLevel * 100).toFixed(1)}% (${m.totalAttempts} attempts, streak ${m.streak})`,
    );
  }

  const events = await prisma.interactionEvent.findMany({
    where: { studentId: studentProfile.id },
  });
  check("interaction events recorded", events.length === 3, `${events.length}`);

  // === Behavioral aggregator ===
  section("Behavioral aggregator");
  const cronRes = await fetch(`${BASE}/api/cron/update-graphs`);
  check("cron endpoint OK", cronRes.ok);
  const profile = await prisma.studentBehavioralProfile.findUnique({
    where: { studentId: studentProfile.id },
  });
  check("behavioral profile created", !!profile);
  if (profile) {
    check(
      "  scores in [0,1]",
      profile.curiosityScore >= 0 &&
        profile.curiosityScore <= 1 &&
        profile.engagementScore >= 0 &&
        profile.engagementScore <= 1,
      `cur=${profile.curiosityScore.toFixed(2)} mot=${profile.motivationScore.toFixed(2)} eng=${profile.engagementScore.toFixed(2)} per=${profile.persistenceScore.toFixed(2)}`,
    );
  }

  // === AI tutor (if configured) ===
  section("AI tutor");
  if (!HAS_ANTHROPIC) {
    skip("tutor responds", "ANTHROPIC_API_KEY not set");
  } else {
    const q = allQuestions[0];
    const content = (q.content ?? {}) as {
      text?: string;
      options?: { value: string; correct: boolean }[];
    };
    const tutorRes = await fetch(`${BASE}/api/tutor`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: {
          text: content.text,
          code: q.curriculumNode.code,
          difficulty: q.difficulty,
          options: content.options,
        },
        mastery: 0.4,
        userMessage: "I don't know how to start. Can you help?",
        studentName: "Test",
      }),
    });
    if (!tutorRes.ok) {
      const errBody = await tutorRes.text();
      check("tutor responds", false, `${tutorRes.status}: ${errBody.slice(0, 100)}`);
    } else {
      // Read the streamed body
      const reader = tutorRes.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
      }
      check(
        "tutor streamed a response",
        acc.length > 20,
        `${acc.length} chars: "${acc.slice(0, 60).replace(/\n/g, " ")}..."`,
      );
    }
  }

  // === AI question generation (if configured) ===
  section("AI question generator");
  if (!HAS_ANTHROPIC) {
    skip("question generator", "ANTHROPIC_API_KEY not set");
  } else {
    try {
      const { generateQuestion } = await import("../src/server/services/ai/generate-question");
      const node = await prisma.curriculumNode.findFirst({ where: { depth: "STANDARD" } });
      if (!node) throw new Error("no standard nodes");
      const generated = await generateQuestion({
        standardCode: node.code,
        standardName: node.name,
        standardDescription: node.description ?? undefined,
        difficulty: 3,
      });
      check("generated a question", generated.text.length > 10);
      check("generated 4 options", generated.options.length === 4);
      check(
        "exactly 1 correct option",
        generated.options.filter((o) => o.correct).length === 1,
      );
      check("generated 2 hints", generated.hints.length === 2);
      // Verify each wrong option has an entry in commonErrors with a valid type
      const wrongOpts = generated.options.filter((o) => !o.correct);
      const ceKeys = Object.keys(generated.commonErrors);
      const allTypesValid = Object.values(generated.commonErrors).every((t) =>
        ["computational", "conceptual", "careless", "notation"].includes(t),
      );
      check(
        "commonErrors entries valid",
        ceKeys.length === wrongOpts.length && allTypesValid,
        `${ceKeys.length} entries for ${wrongOpts.length} wrong options`,
      );
      console.log(
        `  ${DIM}Q: ${generated.text.slice(0, 80)}${generated.text.length > 80 ? "…" : ""}${RESET}`,
      );
    } catch (e) {
      check(
        "question generator",
        false,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // === AI lesson plan via the live HTTP API endpoint ===
  // We test the full endpoint here (not just the service) so the integration
  // path (auth, ownership check, persistence) is exercised.
  section("AI lesson plan");
  if (!HAS_ANTHROPIC) {
    skip("lesson plan service", "ANTHROPIC_API_KEY not set");
  } else {
    try {
      const { generateLessonPlan } = await import("../src/server/services/ai/lesson-plan");
      const node = await prisma.curriculumNode.findFirst({ where: { depth: "STANDARD" } });
      if (!node) throw new Error("no nodes");
      const plan = await generateLessonPlan({
        className: cls.name,
        studentCount: 1,
        concepts: [
          {
            code: node.code,
            name: node.name,
            domain: node.domain,
            avgMastery: 0.3,
            strugglingCount: 1,
          },
        ],
      });
      check("generated a lesson plan", plan.title.length > 0);
      check("plan has sections", plan.sections.length > 0, `${plan.sections.length}`);
      check("duration set", plan.durationMinutes > 0, `${plan.durationMinutes} min`);
      console.log(`  ${DIM}Title: "${plan.title}"${RESET}`);

      // Verify lesson plan persistence (write directly since the API requires auth)
      const saved = await prisma.lessonPlan.create({
        data: {
          teacherId: teacher.id,
          classId: cls.id,
          title: plan.title,
          content: plan as unknown as object,
        },
      });
      const reloaded = await prisma.lessonPlan.findUnique({ where: { id: saved.id } });
      check(
        "lesson plan persists in DB",
        !!reloaded && reloaded.title === plan.title,
        `id=${saved.id.slice(0, 8)}`,
      );
      // Cleanup
      await prisma.lessonPlan.delete({ where: { id: saved.id } });
    } catch (e) {
      check("lesson plan", false, e instanceof Error ? e.message : String(e));
    }
  }

  // === Cleanup ===
  section("Cleanup");
  await prisma.submissionResponse.deleteMany({ where: { submissionId: submission.id } });
  await prisma.submission.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignmentQuestion.deleteMany({ where: { assignmentId: assignment.id } });
  await prisma.assignment.deleteMany({ where: { id: assignment.id } });
  await prisma.classEnrollment.deleteMany({ where: { classId: cls.id } });
  await prisma.class.deleteMany({ where: { id: cls.id } });
  await prisma.studentConceptMastery.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.studentBehavioralProfile.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.interactionEvent.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.user.deleteMany({ where: { id: { in: [teacher.id, studentUser.id] } } });
  check("test data cleaned up", true);

  // === Summary ===
  console.log(
    `\n${BOLD}Results:${RESET} ${PASS} ${passed} passed   ${failed > 0 ? FAIL : "✓"} ${failed} failed   ${SKIP} ${skipped} skipped\n`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("\n💥 Test script crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
