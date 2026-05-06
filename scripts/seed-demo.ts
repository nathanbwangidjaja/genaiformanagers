/**
 * Demo seed — populates a teacher's account with a class of 5 students,
 * each with a distinct mastery + behavioral profile so the dashboard,
 * student-detail, lesson-plan generator, and tutor flows all have rich
 * data to render.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts <teacher-email> [student-email]
 *
 *   teacher-email: existing TEACHER user (must have signed up via /sign-up)
 *   student-email: optional — an existing STUDENT user to attach to one of
 *                  the personas, so you can sign in as a student in the demo
 *
 * Reruns are idempotent: deletes any prior demo class for this teacher
 * (matched by name) before reseeding.
 */

import { PrismaClient, WeaknessCategory } from "@prisma/client";

const prisma = new PrismaClient();

const CLASS_NAME = "Period 3 Pre-Algebra";

// Distinct student personas — calibrated so the dashboard and per-student
// views show meaningfully different signals.
type Persona = {
  key: string; // unique key for clerkId / email
  firstName: string;
  lastName: string;
  // Mastery profile: a base level + per-domain modifier
  baseMastery: number;
  domainModifiers: Partial<Record<string, number>>; // domain code → +/- delta
  // Behavioral
  curiosity: number;
  motivation: number;
  engagement: number;
  persistence: number;
  flow: number;
  // Cognitive trait highlights
  cognitiveTraits: { trait: string; label: string; value: number; evidence: string }[];
  // Tutor question pattern
  tutorIntents: Record<string, number>;
  // Dominant error type for low-mastery concepts
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
      { trait: "language_load", label: "Word-problem comprehension gap", value: 0.62, evidence: "accuracy drops 28% on word problems vs. equivalent abstract problems" },
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
];

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Deterministic-ish but varied per-concept mastery for a persona.
function masteryFor(persona: Persona, code: string): number {
  let m = persona.baseMastery;
  for (const [domainCode, delta] of Object.entries(persona.domainModifiers)) {
    if (code.startsWith(domainCode)) m += delta!;
  }
  // Add small per-code jitter so the dashboard isn't identical
  const seed = [...code].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const jitter = ((seed % 13) - 6) / 100; // ~ -0.06 .. +0.06
  return Math.max(0.05, Math.min(0.95, m + jitter));
}

async function main() {
  const teacherEmail = process.argv[2];
  const studentEmail = process.argv[3];
  if (!teacherEmail) {
    console.error("Usage: npx tsx scripts/seed-demo.ts <teacher-email> [student-email]");
    process.exit(1);
  }

  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) {
    console.error(`No user found with email ${teacherEmail}.`);
    console.error(`Sign up at /sign-up first as a TEACHER, then re-run.`);
    process.exit(1);
  }
  if (teacher.role !== "TEACHER") {
    console.error(`User ${teacherEmail} is role=${teacher.role}, expected TEACHER.`);
    process.exit(1);
  }
  console.log(`Teacher: ${teacher.firstName} ${teacher.lastName} <${teacher.email}>`);

  // Reset prior demo class(es) for this teacher (idempotent reruns)
  const priorClasses = await prisma.class.findMany({
    where: { teacherId: teacher.id, name: CLASS_NAME },
    select: { id: true },
  });
  for (const c of priorClasses) {
    // Cascade-clean: assignments, enrollments, lesson plans
    const assignments = await prisma.assignment.findMany({ where: { classId: c.id }, select: { id: true } });
    for (const a of assignments) {
      const subs = await prisma.submission.findMany({ where: { assignmentId: a.id }, select: { id: true } });
      for (const s of subs) {
        await prisma.submissionResponse.deleteMany({ where: { submissionId: s.id } });
      }
      await prisma.submission.deleteMany({ where: { assignmentId: a.id } });
      await prisma.assignmentQuestion.deleteMany({ where: { assignmentId: a.id } });
    }
    await prisma.assignment.deleteMany({ where: { classId: c.id } });
    await prisma.lessonPlan.deleteMany({ where: { classId: c.id } });
    await prisma.classEnrollment.deleteMany({ where: { classId: c.id } });
    await prisma.class.delete({ where: { id: c.id } });
  }
  console.log(`Reset ${priorClasses.length} prior demo class(es).`);

  // Drop any prior demo students (key starts with demo_student_)
  const priorDemoStudents = await prisma.user.findMany({
    where: { clerkId: { startsWith: "demo_student_" } },
    select: { id: true, studentProfile: { select: { id: true } } },
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
    await prisma.user.delete({ where: { id: u.id } });
  }

  // Resolve / create student users
  const studentUsers: { user: { id: string; firstName: string; lastName: string }; profileId: string; persona: Persona }[] = [];

  for (let i = 0; i < PERSONAS.length; i++) {
    const persona = PERSONAS[i];
    const useExistingStudent = i === 0 && studentEmail;

    let user = useExistingStudent
      ? await prisma.user.findUnique({ where: { email: studentEmail } })
      : null;

    if (user) {
      if (user.role !== "STUDENT") {
        console.error(`Student email ${studentEmail} is role=${user.role}, expected STUDENT.`);
        process.exit(1);
      }
      // Update display name to the persona for the demo
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firstName: persona.firstName, lastName: persona.lastName },
      });
      // Clean prior mastery/behavioral/event/insight data on this profile
      const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (existingProfile) {
        await prisma.kGEdge.deleteMany({ where: { studentId: existingProfile.id } });
        await prisma.kGNode.deleteMany({ where: { studentId: existingProfile.id } });
        await prisma.studentInsight.deleteMany({ where: { studentId: existingProfile.id } });
        await prisma.interactionEvent.deleteMany({ where: { studentId: existingProfile.id } });
        await prisma.studentBehavioralProfile.deleteMany({ where: { studentId: existingProfile.id } });
        await prisma.studentConceptMastery.deleteMany({ where: { studentId: existingProfile.id } });
      }
      console.log(`  Using existing student ${studentEmail} as ${persona.firstName} ${persona.lastName}`);
    } else {
      const clerkId = `demo_student_${persona.key}`;
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `demo+${persona.key}@cortex.local`,
          firstName: persona.firstName,
          lastName: persona.lastName,
          role: "STUDENT",
        },
      });
      console.log(`  Created demo student ${persona.firstName} ${persona.lastName}`);
    }

    let profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.studentProfile.create({ data: { userId: user.id } });
    }
    studentUsers.push({ user, profileId: profile.id, persona });
  }

  // Create the class
  const klass = await prisma.class.create({
    data: {
      name: CLASS_NAME,
      gradeLevel: 7,
      inviteCode: randomInviteCode(),
      teacherId: teacher.id,
    },
  });
  console.log(`Created class "${klass.name}" (invite code: ${klass.inviteCode})`);

  // Enroll all 5 students
  for (const s of studentUsers) {
    await prisma.classEnrollment.create({
      data: { classId: klass.id, studentId: s.user.id },
    });
  }
  console.log(`Enrolled ${studentUsers.length} students.`);

  // Generate mastery records AND per-student KG concept nodes
  const standards = await prisma.curriculumNode.findMany({
    where: { depth: "STANDARD" },
    orderBy: { code: "asc" },
  });
  // Curriculum prerequisite edges to mirror in each student's KG
  const prereqs = await prisma.curriculumPrerequisite.findMany();
  console.log(`Generating mastery + KG nodes across ${standards.length} standards × ${studentUsers.length} students...`);

  for (const s of studentUsers) {
    // Map: curriculumNodeId → KGNode.id (for edge wiring)
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

      // Legacy aggregate row (still queried by some pages)
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

      // KGNode (concept) — what the BrainGraph reads
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

    // Add prerequisite edges between this student's concept nodes
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

    // Behavior nodes (one per behavioral score)
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

    // Cognitive trait nodes
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

    // A handful of attempt nodes connected to concept nodes (so the
    // graph has visible mass beyond just concepts)
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
        data: {
          studentId: s.profileId,
          fromId: attempt.id,
          toId: conceptKgId,
          type: "practiced_in",
        },
      });
    }

    // A few tutor messages tied to concepts (give the graph "color")
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
          props: {
            text: `(seeded ${intents[i]} on ${std.code})`,
            intent: intents[i],
            confidence: 0.85,
          } as any,
        },
      });
      await prisma.kGEdge.create({
        data: {
          studentId: s.profileId,
          fromId: msg.id,
          toId: conceptKgId,
          type: "asked_about",
        },
      });
    }
  }

  // Generate behavioral profiles
  for (const s of studentUsers) {
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
  }
  console.log("Generated behavioral profiles.");

  // Generate interaction events (last 30 days, ~ 50 per student)
  for (const s of studentUsers) {
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
  console.log("Generated 250 interaction events (50/student).");

  // Create one assignment with 4 questions and a few submissions
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
    // Submissions for 3 of the 5 students (so dashboard "active this week" is non-zero)
    for (const s of studentUsers.slice(0, 3)) {
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
    console.log(`Created assignment "${assignment.title}" with ${questions.length} questions and 3 submissions.`);
  }

  console.log("\n✅ Demo seed complete.\n");
  console.log(`Class invite code (for student-side demo): ${klass.inviteCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
