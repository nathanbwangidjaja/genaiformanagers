import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import { generateLessonPlan } from "@/server/services/ai/lesson-plan";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

const Schema = z.object({
  classId: z.string(),
  focusNotes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  if (!ANTHROPIC_ENABLED) {
    return NextResponse.json(aiNotConfiguredError(), { status: 503 });
  }

  const teacher = await requireTeacher();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  // Verify ownership
  const cls = await prisma.class.findFirst({
    where: { id: parsed.data.classId, teacherId: teacher.id },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  masteryRecords: { include: { curriculumNode: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cls) return NextResponse.json({ error: "class not found" }, { status: 404 });

  // Aggregate per-concept mastery across the class
  type Agg = { code: string; name: string; domain: string; total: number; sum: number; struggling: number };
  const byNode = new Map<string, Agg>();
  for (const enr of cls.enrollments) {
    const records = enr.student.studentProfile?.masteryRecords ?? [];
    for (const r of records) {
      const key = r.curriculumNodeId;
      const a = byNode.get(key) ?? {
        code: r.curriculumNode.code,
        name: r.curriculumNode.name,
        domain: r.curriculumNode.domain,
        total: 0,
        sum: 0,
        struggling: 0,
      };
      a.total += 1;
      a.sum += r.masteryLevel;
      if (r.masteryLevel < 0.5) a.struggling += 1;
      byNode.set(key, a);
    }
  }

  const concepts = Array.from(byNode.values()).map((a) => ({
    code: a.code,
    name: a.name,
    domain: a.domain,
    avgMastery: a.sum / a.total,
    strugglingCount: a.struggling,
  }));

  if (concepts.length === 0) {
    return NextResponse.json(
      {
        error: "no_data",
        message:
          "No mastery data yet for this class. Have students complete at least one assignment first.",
      },
      { status: 400 },
    );
  }

  try {
    const plan = await generateLessonPlan({
      className: cls.name,
      studentCount: cls.enrollments.length,
      concepts,
      focusNotes: parsed.data.focusNotes,
    });

    // Persist
    const saved = await prisma.lessonPlan.create({
      data: {
        teacherId: teacher.id,
        classId: cls.id,
        title: plan.title,
        focusNotes: parsed.data.focusNotes ?? null,
        content: plan as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, plan, id: saved.id });
  } catch (e) {
    console.error("lesson plan failed", e);
    const msg = e instanceof Error ? e.message : "ai failed";
    return NextResponse.json({ error: "ai_failed", message: msg }, { status: 500 });
  }
}
