import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { recordQuestionAttempt } from "@/server/services/mastery/update";
import { prisma } from "@/server/db";

const Schema = z.object({
  studentId: z.string(),
  questionId: z.string(),
  curriculumNodeId: z.string(),
  isCorrect: z.boolean(),
  timeSpentMs: z.number().int().nonnegative(),
  hintsUsed: z.number().int().min(0).max(10),
  attemptNumber: z.number().int().min(1).max(20).default(1),
  errorType: z.enum(["computational", "conceptual", "careless", "notation"]).nullish(),
  sessionId: z.string().optional(),
  // Optional: if provided, also persist a SubmissionResponse row so the
  // teacher's roster can see real submission progress / scoring.
  submissionId: z.string().optional(),
  submissionAnswer: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await recordQuestionAttempt(parsed.data);

    if (parsed.data.submissionId && parsed.data.submissionAnswer !== undefined) {
      await prisma.submissionResponse.create({
        data: {
          submissionId: parsed.data.submissionId,
          questionId: parsed.data.questionId,
          answer: { value: parsed.data.submissionAnswer } as Prisma.InputJsonValue,
          isCorrect: parsed.data.isCorrect,
          timeSpentMs: parsed.data.timeSpentMs,
          hintsUsed: parsed.data.hintsUsed,
          attemptNumber: parsed.data.attemptNumber,
          errorType: parsed.data.errorType ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("attempt route failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
