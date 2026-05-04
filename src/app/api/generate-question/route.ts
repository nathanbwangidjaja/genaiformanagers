import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import { generateQuestion } from "@/server/services/ai/generate-question";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

const Schema = z.object({
  curriculumNodeId: z.string(),
  difficulty: z.number().min(1).max(5).default(3),
  persist: z.boolean().default(true),
});

export async function POST(req: Request) {
  if (!ANTHROPIC_ENABLED) {
    return NextResponse.json(aiNotConfiguredError(), { status: 503 });
  }

  await requireTeacher();

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

  const node = await prisma.curriculumNode.findUnique({
    where: { id: parsed.data.curriculumNodeId },
    include: { questions: { take: 5, orderBy: { createdAt: "desc" } } },
  });
  if (!node) return NextResponse.json({ error: "concept not found" }, { status: 404 });

  const existingTexts = node.questions
    .map((q) => {
      const c = (q.content ?? {}) as { text?: string };
      return c.text ?? "";
    })
    .filter(Boolean);

  try {
    const generated = await generateQuestion({
      standardCode: node.code,
      standardName: node.name,
      standardDescription: node.description ?? undefined,
      difficulty: parsed.data.difficulty,
      existingQuestionTexts: existingTexts,
    });

    let questionId: string | null = null;
    if (parsed.data.persist) {
      const saved = await prisma.question.create({
        data: {
          curriculumNodeId: node.id,
          content: { text: generated.text, options: generated.options } as Prisma.InputJsonValue,
          questionType: "MULTIPLE_CHOICE",
          difficulty: generated.difficulty,
          expectedTimeSec: generated.expectedTimeSec,
          hints: generated.hints as unknown as Prisma.InputJsonValue,
          commonErrors: generated.commonErrors as unknown as Prisma.InputJsonValue,
        },
      });
      questionId = saved.id;
    }

    return NextResponse.json({ ok: true, questionId, generated });
  } catch (e) {
    console.error("question gen failed", e);
    const msg = e instanceof Error ? e.message : "ai failed";
    return NextResponse.json({ error: "ai_failed", message: msg }, { status: 500 });
  }
}
