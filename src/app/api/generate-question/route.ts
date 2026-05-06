import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import { generateQuestion, pickExternalSource } from "@/server/services/ai/generate-question";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

const Schema = z.object({
  curriculumNodeId: z.string(),
  difficulty: z.number().min(1).max(5).default(3),
  persist: z.boolean().default(true),
  useRealWorldContext: z.boolean().default(false),
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

  // Auto-retry on transient model output errors (validation failures,
  // mostly duplicate option values). Cap at 2 retries.
  const data = parsed.data;
  async function tryGen(attempt: number): Promise<Awaited<ReturnType<typeof generateQuestion>>> {
    try {
      return await generateQuestion({
        standardCode: node!.code,
        standardName: node!.name,
        standardDescription: node!.description ?? undefined,
        difficulty: data.difficulty,
        existingQuestionTexts: existingTexts,
        useRealWorldContext: data.useRealWorldContext,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const transient = /duplicate option values|sharing the same expression|0 correct options/.test(msg);
      if (transient && attempt < 2) {
        console.warn(`question gen retry (attempt ${attempt + 1}): ${msg}`);
        return tryGen(attempt + 1);
      }
      throw e;
    }
  }

  try {
    const generated = await tryGen(0);

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

    // Tell the UI whether the external API was eligible AND whether it
    // actually attached. The teacher can see the difference between
    // "checkbox on, but this standard has no real-world source" vs.
    // "checkbox on and the data made it into the question."
    const eligibleSource = data.useRealWorldContext
      ? pickExternalSource(node.code)
      : "none";
    const realWorldUsed = !!generated.realWorldContext;
    return NextResponse.json({
      ok: true,
      questionId,
      generated,
      realWorld: {
        requested: data.useRealWorldContext,
        eligibleSource, // "weather" | "currency" | "none"
        used: realWorldUsed,
        source: generated.realWorldContext?.source,
      },
    });
  } catch (e) {
    console.error("question gen failed", e);
    const msg = e instanceof Error ? e.message : "ai failed";
    return NextResponse.json({ error: "ai_failed", message: msg }, { status: 500 });
  }
}
