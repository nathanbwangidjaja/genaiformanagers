/**
 * Pre-generate AI student insights for every student in the demo class
 * and save them to the StudentInsight cache table, with the same input
 * hash the live route uses. After this runs, opening any student page
 * during the demo returns the cached insight instantly (no LLM wait).
 *
 * Idempotent: re-runs are fine.
 *
 *   npx tsx scripts/prewarm-insights.ts <teacher-email>
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import {
  generateStudentInsight,
  hashInput,
  type InsightInput,
} from "../src/server/services/ai/student-insight";

const prisma = new PrismaClient();

async function buildInput(studentUserId: string): Promise<{ input: InsightInput; profileId: string } | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: {
      studentProfile: {
        include: {
          masteryRecords: { include: { curriculumNode: true } },
          behavioralProfile: true,
        },
      },
    },
  });
  if (!student?.studentProfile) return null;
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

  // Cap concept breakdown at 12 weakest — keeps payload small to dodge the
  // upstream 500s that hit at very long inputs.
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
    (beh?.cognitiveTraits as Array<{
      trait: string;
      label: string;
      value: number;
      confidence: number;
      evidence: string;
    }> | null) ?? [];

  return {
    input: {
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
    },
    profileId: sp.id,
  };
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T | null> {
  for (let i = 1; i <= attempts; i++) {
    const start = Date.now();
    try {
      const r = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("client timeout 60s")), 60_000),
        ),
      ]);
      console.log(`  [${label}] OK (${Date.now() - start} ms, attempt ${i})`);
      return r as T;
    } catch (e: any) {
      console.warn(`  [${label}] attempt ${i}/${attempts} failed in ${Date.now() - start} ms: ${e?.message ?? e}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  return null;
}

async function main() {
  const teacherEmail = process.argv[2];
  if (!teacherEmail) {
    console.error("Usage: npx tsx scripts/prewarm-insights.ts <teacher-email>");
    process.exit(1);
  }
  const teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) {
    console.error(`No user with email ${teacherEmail}`);
    process.exit(1);
  }

  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId: teacher.id, name: "Period 3 Pre-Algebra" } },
    include: { student: true },
  });
  console.log(`Pre-warming insights for ${enrollments.length} students...`);

  for (const e of enrollments) {
    const built = await buildInput(e.studentId);
    if (!built) {
      console.log(`  ${e.student.firstName} ${e.student.lastName}: no profile, skipping`);
      continue;
    }
    const inputHash = hashInput(built.input);

    const existing = await prisma.studentInsight.findUnique({ where: { studentId: built.profileId } });
    if (existing && existing.modelInputHash === inputHash) {
      console.log(`  ${e.student.firstName} ${e.student.lastName}: already cached, skip`);
      continue;
    }

    console.log(`  ${e.student.firstName} ${e.student.lastName}: generating...`);
    const generated = await withRetry(
      `${e.student.firstName}`,
      () => generateStudentInsight(built.input),
      3,
    );
    if (!generated) {
      console.error(`  ${e.student.firstName}: ALL retries failed — falling back to a stub insight so the page renders.`);
      const stub = {
        summary: `[Auto-stub — regenerate for full AI brief.] ${e.student.firstName}'s overall mastery is ${(built.input.overallMastery * 100).toFixed(0)}%. Their strongest behavioral signal is ${
          [
            ["curiosity", built.input.scores.curiosity],
            ["motivation", built.input.scores.motivation],
            ["engagement", built.input.scores.engagement],
            ["persistence", built.input.scores.persistence],
          ].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
        }, and the weakest concept area is ${built.input.conceptBreakdown[0]?.code ?? "n/a"}.`,
        highlights: built.input.conceptBreakdown.slice(0, 3).map((c) => ({
          type: c.mastery < 0.4 ? "risk" : c.mastery > 0.7 ? "strength" : "growth",
          text: `${c.code} ${c.name}: ${(c.mastery * 100).toFixed(0)}% mastery${c.dominantError ? `, dominant error: ${c.dominantError}` : ""}.`,
        })),
        recommendations: [
          {
            action: `Regenerate this insight in the UI to get a full AI-written brief.`,
            why: `Anthropic API returned an upstream 500; this stub is a placeholder so the page renders for the demo.`,
          },
        ],
      };
      await prisma.studentInsight.upsert({
        where: { studentId: built.profileId },
        update: {
          summary: stub.summary,
          highlights: stub.highlights as unknown as Prisma.InputJsonValue,
          recommendations: stub.recommendations as unknown as Prisma.InputJsonValue,
          modelInputHash: inputHash,
        },
        create: {
          studentId: built.profileId,
          summary: stub.summary,
          highlights: stub.highlights as unknown as Prisma.InputJsonValue,
          recommendations: stub.recommendations as unknown as Prisma.InputJsonValue,
          modelInputHash: inputHash,
        },
      });
      continue;
    }
    await prisma.studentInsight.upsert({
      where: { studentId: built.profileId },
      update: {
        summary: generated.summary,
        highlights: generated.highlights as unknown as Prisma.InputJsonValue,
        recommendations: generated.recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
      create: {
        studentId: built.profileId,
        summary: generated.summary,
        highlights: generated.highlights as unknown as Prisma.InputJsonValue,
        recommendations: generated.recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
    });
  }
  console.log("\n✅ Done. Open the per-student pages — they should now load instantly.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
