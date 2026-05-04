import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import {
  generateStudentInsight,
  hashInput,
  type InsightInput,
} from "@/server/services/ai/student-insight";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  if (!ANTHROPIC_ENABLED) {
    return NextResponse.json(aiNotConfiguredError(), { status: 503 });
  }

  const teacher = await requireTeacher();
  const { studentId } = await params;

  // Authorization: teacher must own a class the student is enrolled in
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId, class: { teacherId: teacher.id } },
  });
  if (!enrollment) return NextResponse.json({ error: "not authorized" }, { status: 403 });

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      studentProfile: {
        include: {
          masteryRecords: { include: { curriculumNode: true } },
          behavioralProfile: true,
          insight: true,
        },
      },
    },
  });
  if (!student?.studentProfile) {
    return NextResponse.json({ error: "no student profile" }, { status: 404 });
  }

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
  // Cache hit: if existing insight has the same input hash, return it
  if (sp.insight && sp.insight.modelInputHash === inputHash) {
    return NextResponse.json({ ok: true, insight: sp.insight, cached: true });
  }

  try {
    const generated = await generateStudentInsight(input);
    const saved = await prisma.studentInsight.upsert({
      where: { studentId: sp.id },
      update: {
        summary: generated.summary,
        highlights: generated.highlights as unknown as Prisma.InputJsonValue,
        recommendations: generated.recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
      create: {
        studentId: sp.id,
        summary: generated.summary,
        highlights: generated.highlights as unknown as Prisma.InputJsonValue,
        recommendations: generated.recommendations as unknown as Prisma.InputJsonValue,
        modelInputHash: inputHash,
      },
    });
    return NextResponse.json({ ok: true, insight: saved, cached: false });
  } catch (e) {
    console.error("insight generation failed", e);
    return NextResponse.json(
      { error: "ai_failed", message: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
