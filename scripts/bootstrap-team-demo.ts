/**
 * Creates real Clerk accounts (with passwords) for a teaching-team demo:
 *   - 1 TEACHER  account they can log in as
 *   - 1 STUDENT  account they can log in as (linked to the "Maya Chen" persona)
 *   - 9 synthetic STUDENT rows (DB only — for class roster richness)
 * Then builds a class with all 10 enrolled, rich mastery + behavioral
 * + KG data, and pre-warms AI insights so per-student pages load instantly.
 *
 * Idempotent: re-runs delete and recreate the demo Clerk users by
 * matching emails, and re-build the class data from scratch.
 *
 *   npx tsx scripts/bootstrap-team-demo.ts
 */

import { createClerkClient } from "@clerk/backend";
import { PrismaClient, WeaknessCategory } from "@prisma/client";
import {
  generateStudentInsight,
  hashInput,
  type InsightInput,
} from "../src/server/services/ai/student-insight";
import type { Prisma } from "@prisma/client";

// ============================================================
// CONFIG — change these if you want different demo credentials
// ============================================================
const TEACHER_EMAIL = "demo.teacher@cortex.app";
const TEACHER_PASSWORD = "CortexDemo2026!"; // 8+ chars, mixed case, digit, special
const TEACHER_FIRST = "Alex";
const TEACHER_LAST = "Rivera";

const STUDENT_EMAIL = "demo.student@cortex.app";
const STUDENT_PASSWORD = "CortexStudent2026!";

const CLASS_NAME = "Period 3 Pre-Algebra";
const PRISMA_DEMO_TAG_PREFIX = "demo_team_";

// ============================================================
// 10 PERSONAS — calibrated to span the full pedagogy spectrum
// ============================================================
type Persona = {
  key: string;
  firstName: string;
  lastName: string;
  baseMastery: number;
  domainModifiers: Partial<Record<string, number>>;
  curiosity: number;
  motivation: number;
  engagement: number;
  persistence: number;
  flow: number;
  cognitiveTraits: { trait: string; label: string; value: number; evidence: string }[];
  tutorIntents: Record<string, number>;
  dominantError: "computational" | "conceptual" | "careless" | "notation";
  weaknessCategory: WeaknessCategory;
};

const PERSONAS: Persona[] = [
  {
    key: "maya",
    firstName: "Maya",
    lastName: "Chen",
    baseMastery: 0.74,
    domainModifiers: { "7.SP": 0.1, "7.NS": -0.05 },
    curiosity: 0.86,
    motivation: 0.78,
    engagement: 0.81,
    persistence: 0.72,
    flow: 0.68,
    cognitiveTraits: [
      { trait: "exploration", label: "Self-directed exploration", value: 0.84, evidence: "attempted 7 problems beyond the assigned set this week" },
      { trait: "metacognition", label: "Asks 'why' questions", value: 0.79, evidence: "60% of tutor messages were conceptual_why" },
    ],
    tutorIntents: { conceptual_why: 11, procedural_how: 4, clarification: 3, verification: 5 },
    dominantError: "conceptual",
    weaknessCategory: "SOLID",
  },
  {
    key: "jamal",
    firstName: "Jamal",
    lastName: "Williams",
    baseMastery: 0.55,
    domainModifiers: { "7.NS": -0.18, "7.G": 0.08 },
    curiosity: 0.51,
    motivation: 0.42,
    engagement: 0.60,
    persistence: 0.38,
    flow: 0.43,
    cognitiveTraits: [
      { trait: "perseverance", label: "Perseverance after failure", value: 0.34, evidence: "abandons after 1.2 wrong attempts (class avg 2.1)" },
      { trait: "speed", label: "Tends to rush", value: 0.71, evidence: "avg time per question is 38% below class median" },
    ],
    tutorIntents: { conceptual_why: 1, procedural_how: 12, clarification: 2, verification: 4, expressing_confusion: 3 },
    dominantError: "careless",
    weaknessCategory: "PROCEDURALLY_WEAK",
  },
  {
    key: "sofia",
    firstName: "Sofia",
    lastName: "Garcia",
    baseMastery: 0.39,
    domainModifiers: { "7.RP": -0.12, "7.EE": -0.15 },
    curiosity: 0.46,
    motivation: 0.55,
    engagement: 0.43,
    persistence: 0.61,
    flow: 0.32,
    cognitiveTraits: [
      { trait: "growth", label: "Improving trend", value: 0.72, evidence: "mastery on 7.NS.1d climbed from 18% to 41% in last 14 days" },
      { trait: "language_load", label: "Word-problem comprehension gap", value: 0.62, evidence: "accuracy drops 28% on word problems vs equivalent abstract problems" },
    ],
    tutorIntents: { conceptual_why: 2, procedural_how: 6, clarification: 11, verification: 3, expressing_confusion: 5 },
    dominantError: "conceptual",
    weaknessCategory: "CONCEPTUALLY_WEAK",
  },
  {
    key: "lucas",
    firstName: "Lucas",
    lastName: "Kim",
    baseMastery: 0.81,
    domainModifiers: {},
    curiosity: 0.32,
    motivation: 0.65,
    engagement: 0.71,
    persistence: 0.58,
    flow: 0.55,
    cognitiveTraits: [
      { trait: "compliance", label: "Completes assigned, rarely explores", value: 0.84, evidence: "0 voluntary problems beyond assigned in 30 days" },
      { trait: "fragility", label: "Memorized-fragile pattern", value: 0.66, evidence: "high mastery (81%) but 41% hint usage rate" },
    ],
    tutorIntents: { conceptual_why: 0, procedural_how: 8, clarification: 4, verification: 9 },
    dominantError: "notation",
    weaknessCategory: "MEMORIZED_FRAGILE",
  },
  {
    key: "aisha",
    firstName: "Aisha",
    lastName: "Patel",
    baseMastery: 0.61,
    domainModifiers: { "7.SP": 0.12, "7.RP": 0.06 },
    curiosity: 0.74,
    motivation: 0.71,
    engagement: 0.66,
    persistence: 0.85,
    flow: 0.62,
    cognitiveTraits: [
      { trait: "perseverance", label: "Strong perseverance after failure", value: 0.85, evidence: "retries 3.4 times on average before moving on (class avg 2.1)" },
      { trait: "deliberate", label: "Deliberate, slow-paced", value: 0.78, evidence: "avg time per question 22% above median; accuracy is high" },
    ],
    tutorIntents: { conceptual_why: 6, procedural_how: 5, clarification: 4, verification: 7, expressing_understanding: 3 },
    dominantError: "computational",
    weaknessCategory: "PROCEDURALLY_WEAK",
  },
  {
    key: "devon",
    firstName: "Devon",
    lastName: "Brown",
    baseMastery: 0.42,
    domainModifiers: { "7.G": -0.15, "7.SP": -0.12 },
    curiosity: 0.40,
    motivation: 0.35,
    engagement: 0.31,
    persistence: 0.45,
    flow: 0.28,
    cognitiveTraits: [
      { trait: "attendance", label: "Inconsistent practice", value: 0.62, evidence: "active on 9 of last 30 days; sporadic bursts of 6+ problems" },
      { trait: "uneven_coverage", label: "Uneven concept coverage", value: 0.71, evidence: "no attempts on 7.G.* or 7.SP.* in 30 days" },
    ],
    tutorIntents: { conceptual_why: 1, procedural_how: 3, clarification: 1, expressing_confusion: 2 },
    dominantError: "conceptual",
    weaknessCategory: "CONCEPTUALLY_WEAK",
  },
  {
    key: "zoe",
    firstName: "Zoe",
    lastName: "Park",
    baseMastery: 0.86,
    domainModifiers: {},
    curiosity: 0.45,
    motivation: 0.50,
    engagement: 0.42,
    persistence: 0.55,
    flow: 0.38,
    cognitiveTraits: [
      { trait: "boredom", label: "Possible disengagement at grade level", value: 0.78, evidence: "high mastery but rarely attempts hard problems; tutor sessions <30s" },
      { trait: "ceiling", label: "May benefit from acceleration", value: 0.72, evidence: "averages 88% on grade-level items; untested at challenge tier" },
    ],
    tutorIntents: { conceptual_why: 2, procedural_how: 1, verification: 6 },
    dominantError: "careless",
    weaknessCategory: "SOLID",
  },
  {
    key: "tyrell",
    firstName: "Tyrell",
    lastName: "Jefferson",
    baseMastery: 0.58,
    domainModifiers: { "7.RP": 0.18, "7.EE": -0.08 },
    curiosity: 0.62,
    motivation: 0.68,
    engagement: 0.71,
    persistence: 0.64,
    flow: 0.56,
    cognitiveTraits: [
      { trait: "context_strength", label: "Strong with applied/word problems", value: 0.81, evidence: "accuracy 22% higher on word problems than equivalent abstract" },
      { trait: "abstraction_gap", label: "Weak with bare-symbol manipulation", value: 0.68, evidence: "drops sharply on factoring and equation-solving without context" },
    ],
    tutorIntents: { conceptual_why: 3, procedural_how: 5, clarification: 4, verification: 4 },
    dominantError: "notation",
    weaknessCategory: "PROCEDURALLY_WEAK",
  },
  {
    key: "priya",
    firstName: "Priya",
    lastName: "Shah",
    baseMastery: 0.66,
    domainModifiers: {},
    curiosity: 0.60,
    motivation: 0.78,
    engagement: 0.69,
    persistence: 0.92,
    flow: 0.41,
    cognitiveTraits: [
      { trait: "anxiety", label: "Anxious / perfectionist pattern", value: 0.74, evidence: "very high time per question (52% above median); high hint usage with high accuracy" },
      { trait: "verification", label: "Heavy self-checking", value: 0.81, evidence: "tutor verification questions 2.5× the class avg" },
    ],
    tutorIntents: { conceptual_why: 2, procedural_how: 3, verification: 11, expressing_confusion: 1 },
    dominantError: "careless",
    weaknessCategory: "PROCEDURALLY_WEAK",
  },
  {
    key: "marcus",
    firstName: "Marcus",
    lastName: "Singh",
    baseMastery: 0.51,
    domainModifiers: { "7.SP": 0.15 },
    curiosity: 0.92,
    motivation: 0.62,
    engagement: 0.67,
    persistence: 0.55,
    flow: 0.49,
    cognitiveTraits: [
      { trait: "exploration", label: "Highly self-directed", value: 0.91, evidence: "attempted 12 problems beyond assigned set this week" },
      { trait: "execution_gap", label: "Strong concept, weak execution", value: 0.69, evidence: "explains reasoning correctly in tutor chat but mis-executes the arithmetic" },
    ],
    tutorIntents: { conceptual_why: 14, procedural_how: 2, clarification: 1, expressing_understanding: 4 },
    dominantError: "computational",
    weaknessCategory: "PROCEDURALLY_WEAK",
  },
];

function masteryFor(persona: Persona, code: string): number {
  let m = persona.baseMastery;
  for (const [domainCode, delta] of Object.entries(persona.domainModifiers)) {
    if (code.startsWith(domainCode)) m += delta!;
  }
  const seed = [...code].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const jitter = ((seed % 13) - 6) / 100;
  return Math.max(0.05, Math.min(0.95, m + jitter));
}

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ============================================================
// MAIN
// ============================================================

const prisma = new PrismaClient();

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set in env");
    process.exit(1);
  }
  const clerk = createClerkClient({ secretKey });

  // -----------------------------------------
  // 1. Recreate the Clerk teacher account
  // -----------------------------------------
  console.log("[1/6] Resolving Clerk teacher account...");
  let teacherClerk = await clerk.users
    .getUserList({ emailAddress: [TEACHER_EMAIL], limit: 1 })
    .then((r) => r.data[0])
    .catch(() => null);

  if (teacherClerk) {
    console.log(`  Found existing Clerk user ${teacherClerk.id}, deleting…`);
    try {
      await clerk.users.deleteUser(teacherClerk.id);
    } catch (e: any) {
      console.warn(`  deleteUser failed (continuing): ${e?.message}`);
    }
    teacherClerk = null;
  }
  console.log(`  Creating Clerk teacher ${TEACHER_EMAIL}…`);
  teacherClerk = await clerk.users.createUser({
    emailAddress: [TEACHER_EMAIL],
    password: TEACHER_PASSWORD,
    firstName: TEACHER_FIRST,
    lastName: TEACHER_LAST,
    skipPasswordChecks: true,
    unsafeMetadata: { role: "TEACHER" },
  });
  // Mark email verified so login skips the email-link ceremony.
  for (const ea of teacherClerk.emailAddresses) {
    await clerk.emailAddresses.updateEmailAddress(ea.id, { verified: true });
  }
  console.log(`  ✓ Clerk teacher: id=${teacherClerk.id}, email verified`);

  // -----------------------------------------
  // 2. Recreate the Clerk student account
  // -----------------------------------------
  console.log("[2/6] Resolving Clerk student account...");
  let studentClerk = await clerk.users
    .getUserList({ emailAddress: [STUDENT_EMAIL], limit: 1 })
    .then((r) => r.data[0])
    .catch(() => null);
  if (studentClerk) {
    console.log(`  Found existing Clerk user ${studentClerk.id}, deleting…`);
    try {
      await clerk.users.deleteUser(studentClerk.id);
    } catch (e: any) {
      console.warn(`  deleteUser failed: ${e?.message}`);
    }
    studentClerk = null;
  }
  console.log(`  Creating Clerk student ${STUDENT_EMAIL}…`);
  studentClerk = await clerk.users.createUser({
    emailAddress: [STUDENT_EMAIL],
    password: STUDENT_PASSWORD,
    firstName: PERSONAS[0].firstName,
    lastName: PERSONAS[0].lastName,
    skipPasswordChecks: true,
    unsafeMetadata: { role: "STUDENT" },
  });
  for (const ea of studentClerk.emailAddresses) {
    await clerk.emailAddresses.updateEmailAddress(ea.id, { verified: true });
  }
  console.log(`  ✓ Clerk student: id=${studentClerk.id}, email verified`);

  // -----------------------------------------
  // 3. Mirror to our DB — clean prior demo first
  // -----------------------------------------
  console.log("[3/6] Cleaning prior demo data in Postgres...");
  // Drop prior demo students by clerkId pattern
  const priorDemoStudents = await prisma.user.findMany({
    where: {
      OR: [
        { clerkId: { startsWith: PRISMA_DEMO_TAG_PREFIX } },
        { email: { in: [TEACHER_EMAIL, STUDENT_EMAIL] } },
      ],
    },
    include: { studentProfile: true },
  });
  for (const u of priorDemoStudents) {
    if (u.studentProfile) {
      await prisma.kGEdge.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.kGNode.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.studentInsight.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.interactionEvent.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.studentBehavioralProfile.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.studentConceptMastery.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.learningSession.deleteMany({ where: { studentId: u.studentProfile.id } });
      await prisma.studentProfile.delete({ where: { id: u.studentProfile.id } });
    }
    await prisma.classEnrollment.deleteMany({ where: { studentId: u.id } });
    if (u.role === "TEACHER") {
      await prisma.lessonPlan.deleteMany({ where: { teacherId: u.id } });
      const cls = await prisma.class.findMany({ where: { teacherId: u.id }, select: { id: true } });
      for (const c of cls) {
        await prisma.assignment.deleteMany({ where: { classId: c.id } });
        await prisma.classEnrollment.deleteMany({ where: { classId: c.id } });
        await prisma.lessonPlan.deleteMany({ where: { classId: c.id } });
        await prisma.class.delete({ where: { id: c.id } });
      }
    }
    await prisma.user.delete({ where: { id: u.id } });
  }

  // -----------------------------------------
  // 4. Create DB rows for teacher + 10 students
  // -----------------------------------------
  console.log("[4/6] Creating DB rows...");
  const teacherDb = await prisma.user.create({
    data: {
      clerkId: teacherClerk.id,
      email: TEACHER_EMAIL,
      firstName: TEACHER_FIRST,
      lastName: TEACHER_LAST,
      role: "TEACHER",
    },
  });
  console.log(`  ✓ Teacher DB row: ${teacherDb.id}`);

  const studentRecords: { user: { id: string; firstName: string; lastName: string }; profileId: string; persona: Persona }[] = [];

  for (let i = 0; i < PERSONAS.length; i++) {
    const persona = PERSONAS[i];
    const isClerkLinked = i === 0;
    const clerkId = isClerkLinked ? studentClerk.id : `${PRISMA_DEMO_TAG_PREFIX}${persona.key}`;
    const email = isClerkLinked ? STUDENT_EMAIL : `${PRISMA_DEMO_TAG_PREFIX}${persona.key}@cortex.local`;

    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName: persona.firstName,
        lastName: persona.lastName,
        role: "STUDENT",
      },
    });
    const profile = await prisma.studentProfile.create({ data: { userId: user.id } });
    studentRecords.push({ user, profileId: profile.id, persona });
  }
  console.log(`  ✓ ${studentRecords.length} student DB rows + profiles`);

  // -----------------------------------------
  // 5. Build the class + rich data
  // -----------------------------------------
  console.log("[5/6] Building class, mastery, behavioral, KG, assignments...");
  const klass = await prisma.class.create({
    data: {
      name: CLASS_NAME,
      gradeLevel: 7,
      inviteCode: randomInviteCode(),
      teacherId: teacherDb.id,
    },
  });
  for (const s of studentRecords) {
    await prisma.classEnrollment.create({
      data: { classId: klass.id, studentId: s.user.id },
    });
  }

  const standards = await prisma.curriculumNode.findMany({ where: { depth: "STANDARD" }, orderBy: { code: "asc" } });
  const prereqs = await prisma.curriculumPrerequisite.findMany();

  for (const s of studentRecords) {
    const conceptKgIds = new Map<string, string>();

    for (const std of standards) {
      const mastery = masteryFor(s.persona, std.code);
      const totalAttempts = 4 + Math.floor(mastery * 12) + Math.floor(Math.random() * 4);
      const correctAttempts = Math.floor(totalAttempts * mastery);
      const errorPatternCounts: Record<string, number> = {};
      const wrongCount = totalAttempts - correctAttempts;
      if (wrongCount > 0) errorPatternCounts[s.persona.dominantError] = wrongCount;
      const hintRate = s.persona.weaknessCategory === "MEMORIZED_FRAGILE" ? 0.41 : 0.18;
      const weaknessCategory = mastery < 0.5 ? s.persona.weaknessCategory : "SOLID";
      const lastPracticedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

      await prisma.studentConceptMastery.create({
        data: {
          studentId: s.profileId,
          curriculumNodeId: std.id,
          masteryLevel: mastery,
          confidence: 0.5 + mastery * 0.4,
          totalAttempts,
          correctAttempts,
          avgTimePerQuestion: 60 + Math.random() * 60,
          errorPatternCounts,
          hintUsageRate: hintRate,
          lastPracticedAt,
          streak: mastery > 0.7 ? Math.floor(Math.random() * 5) : 0,
          weaknessCategory,
          flowFraction: 0.3 + mastery * 0.4,
        },
      });

      const kgConcept = await prisma.kGNode.create({
        data: {
          studentId: s.profileId,
          type: "concept",
          label: std.name,
          externalKey: std.id,
          props: {
            code: std.code,
            name: std.name,
            domain: std.domain,
            mastery,
            confidence: 0.5 + mastery * 0.4,
            totalAttempts,
            correctAttempts,
            hintRate,
            streak: mastery > 0.7 ? Math.floor(Math.random() * 5) : 0,
            weaknessCategory,
            flowFraction: 0.3 + mastery * 0.4,
            errorPatternCounts,
            lastPracticedAt: lastPracticedAt.toISOString(),
          } as any,
        },
      });
      conceptKgIds.set(std.id, kgConcept.id);
    }

    for (const pr of prereqs) {
      const fromId = conceptKgIds.get(pr.sourceNodeId);
      const toId = conceptKgIds.get(pr.targetNodeId);
      if (!fromId || !toId) continue;
      await prisma.kGEdge.create({
        data: {
          studentId: s.profileId,
          fromId,
          toId,
          type: "prerequisite_of",
          weight: pr.strength,
        },
      });
    }

    const behaviors = [
      { kind: "curiosity", value: s.persona.curiosity },
      { kind: "motivation", value: s.persona.motivation },
      { kind: "engagement", value: s.persona.engagement },
      { kind: "persistence", value: s.persona.persistence },
      { kind: "flow", value: s.persona.flow },
    ];
    for (const b of behaviors) {
      await prisma.kGNode.create({
        data: {
          studentId: s.profileId,
          type: "behavior",
          label: b.kind,
          externalKey: `behavior:${b.kind}`,
          props: { kind: b.kind, value: b.value, signals: {} } as any,
        },
      });
    }
    for (const t of s.persona.cognitiveTraits) {
      await prisma.kGNode.create({
        data: {
          studentId: s.profileId,
          type: "trait",
          label: t.label,
          externalKey: `trait:${t.trait}`,
          props: { name: t.trait, label: t.label, value: t.value, confidence: 0.7, evidence: t.evidence } as any,
        },
      });
    }

    const sampleStandards = standards.slice(0, 8);
    for (let i = 0; i < 12; i++) {
      const std = sampleStandards[i % sampleStandards.length];
      const conceptKgId = conceptKgIds.get(std.id);
      if (!conceptKgId) continue;
      const isCorrect = Math.random() < masteryFor(s.persona, std.code);
      const attempt = await prisma.kGNode.create({
        data: {
          studentId: s.profileId,
          type: "attempt",
          label: `${std.code} attempt`,
          props: {
            isCorrect,
            timeMs: 30000 + Math.floor(Math.random() * 90000),
            hintsUsed: isCorrect ? 0 : 1,
            errorType: isCorrect ? null : s.persona.dominantError,
          } as any,
        },
      });
      await prisma.kGEdge.create({
        data: { studentId: s.profileId, fromId: attempt.id, toId: conceptKgId, type: "practiced_in" },
      });
    }

    const tutorTopics = sampleStandards.slice(0, 3);
    const intents = Object.keys(s.persona.tutorIntents);
    for (let i = 0; i < Math.min(4, intents.length); i++) {
      const std = tutorTopics[i % tutorTopics.length];
      const conceptKgId = conceptKgIds.get(std.id);
      if (!conceptKgId) continue;
      const msg = await prisma.kGNode.create({
        data: {
          studentId: s.profileId,
          type: "tutor_message",
          label: intents[i],
          props: { text: `(seeded ${intents[i]} on ${std.code})`, intent: intents[i], confidence: 0.85 } as any,
        },
      });
      await prisma.kGEdge.create({
        data: { studentId: s.profileId, fromId: msg.id, toId: conceptKgId, type: "asked_about" },
      });
    }

    await prisma.studentBehavioralProfile.create({
      data: {
        studentId: s.profileId,
        curiosityScore: s.persona.curiosity,
        motivationScore: s.persona.motivation,
        engagementScore: s.persona.engagement,
        persistenceScore: s.persona.persistence,
        flowScore: s.persona.flow,
        cognitiveTraits: s.persona.cognitiveTraits as any,
        tutorIntents: s.persona.tutorIntents as any,
        window30d: { totalAttempts: 40 + Math.floor(Math.random() * 30) } as any,
      },
    });

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.random() * 30;
      const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const isCorrect = Math.random() < s.persona.baseMastery;
      await prisma.interactionEvent.create({
        data: {
          studentId: s.profileId,
          eventType: i % 7 === 0 ? "tutor_message" : "question_attempt",
          timestamp: ts,
          payload: i % 7 === 0
            ? { intent: Object.keys(s.persona.tutorIntents)[0] ?? "procedural_how", text: "(seeded)" }
            : { isCorrect, timeMs: 30000 + Math.random() * 90000, hintsUsed: isCorrect ? 0 : 1 },
        },
      });
    }
  }

  const questions = await prisma.question.findMany({ take: 4 });
  if (questions.length === 4) {
    const assignment = await prisma.assignment.create({
      data: {
        classId: klass.id,
        title: "Week 12 Practice — Mixed Review",
        description: "20 minutes. Show your work on the rational-number problems.",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
    for (let i = 0; i < questions.length; i++) {
      await prisma.assignmentQuestion.create({
        data: { assignmentId: assignment.id, questionId: questions[i].id, orderIndex: i },
      });
    }
    for (const s of studentRecords.slice(0, 6)) {
      const submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: s.user.id,
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 1000),
          score: s.persona.baseMastery,
        },
      });
      for (let i = 0; i < questions.length; i++) {
        const correct = Math.random() < s.persona.baseMastery;
        await prisma.submissionResponse.create({
          data: {
            submissionId: submission.id,
            questionId: questions[i].id,
            answer: { value: correct ? "correct" : "wrong" },
            isCorrect: correct,
            timeSpentMs: 45_000 + Math.floor(Math.random() * 90_000),
            hintsUsed: correct ? 0 : 1,
            attemptNumber: 1,
            errorType: correct ? null : s.persona.dominantError,
          },
        });
      }
    }
  }
  console.log(`  ✓ Class "${klass.name}" (invite code: ${klass.inviteCode}), ${studentRecords.length} enrolled, 1 assignment, 6 submissions`);

  // -----------------------------------------
  // 6. Pre-warm AI insights
  // -----------------------------------------
  console.log("[6/6] Pre-warming AI insights for all 10 students...");
  for (const s of studentRecords) {
    await prewarmInsight(s.profileId, s.user.id);
  }

  // ------------------------
  // SUMMARY
  // ------------------------
  console.log("\n========================================");
  console.log("✅ BOOTSTRAP COMPLETE — credentials below");
  console.log("========================================\n");
  console.log("TEACHER LOGIN:");
  console.log(`  Email:    ${TEACHER_EMAIL}`);
  console.log(`  Password: ${TEACHER_PASSWORD}`);
  console.log(`  Name:     ${TEACHER_FIRST} ${TEACHER_LAST}`);
  console.log(`  Class:    "${klass.name}" (invite code: ${klass.inviteCode})`);
  console.log("\nSTUDENT LOGIN (linked to Maya Chen persona):");
  console.log(`  Email:    ${STUDENT_EMAIL}`);
  console.log(`  Password: ${STUDENT_PASSWORD}`);
  console.log("\nClass roster (10 students):");
  for (const s of studentRecords) {
    console.log(`  - ${s.persona.firstName} ${s.persona.lastName}  (${s.persona.weaknessCategory}, mastery ~${(s.persona.baseMastery * 100).toFixed(0)}%)`);
  }
  console.log();
}

async function prewarmInsight(profileId: string, userId: string) {
  const student = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          masteryRecords: { include: { curriculumNode: true } },
          behavioralProfile: true,
        },
      },
    },
  });
  if (!student?.studentProfile) return;
  const sp = student.studentProfile;
  const beh = sp.behavioralProfile;
  const overallMastery =
    sp.masteryRecords.length > 0
      ? sp.masteryRecords.reduce((s, r) => s + r.masteryLevel, 0) / sp.masteryRecords.length
      : 0;
  const totalAttempts = await prisma.interactionEvent.count({
    where: {
      studentId: sp.id,
      eventType: "question_attempt",
      timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  const conceptBreakdown = sp.masteryRecords
    .slice()
    .sort((a, b) => a.masteryLevel - b.masteryLevel)
    .slice(0, 12)
    .map((r) => {
      const errs = (r.errorPatternCounts as Record<string, number> | null) ?? {};
      const dominant = Object.entries(errs).sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        code: r.curriculumNode.code,
        name: r.curriculumNode.name,
        mastery: r.masteryLevel,
        weakness: r.weaknessCategory,
        attempts: r.totalAttempts,
        dominantError: dominant,
      };
    });
  const tutorIntents = (beh?.tutorIntents as Record<string, number> | null) ?? {};
  const cognitiveTraits =
    (beh?.cognitiveTraits as Array<{ trait: string; label: string; value: number; confidence: number; evidence: string }> | null) ?? [];

  const input: InsightInput = {
    studentName: `${student.firstName} ${student.lastName}`.trim() || student.email,
    totalAttempts,
    windowDays: 30,
    overallMastery,
    scores: {
      curiosity: beh?.curiosityScore ?? 0,
      motivation: beh?.motivationScore ?? 0,
      engagement: beh?.engagementScore ?? 0,
      persistence: beh?.persistenceScore ?? 0,
      flow: beh?.flowScore ?? 0,
    },
    conceptBreakdown,
    cognitiveTraits,
    tutorIntents,
  };

  const inputHash = hashInput(input);
  try {
    const generated = await Promise.race([
      generateStudentInsight(input),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("60s timeout")), 60_000)),
    ]);
    await prisma.studentInsight.upsert({
      where: { studentId: sp.id },
      update: {
        summary: (generated as any).summary,
        highlights: (generated as any).highlights as unknown as Prisma.InputJsonValue,
        recommendations: (generated as any).recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
      create: {
        studentId: sp.id,
        summary: (generated as any).summary,
        highlights: (generated as any).highlights as unknown as Prisma.InputJsonValue,
        recommendations: (generated as any).recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
    });
    console.log(`  ✓ insight cached for ${student.firstName} ${student.lastName}`);
  } catch (e: any) {
    console.warn(`  ⚠ insight failed for ${student.firstName}: ${e?.message ?? e}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
