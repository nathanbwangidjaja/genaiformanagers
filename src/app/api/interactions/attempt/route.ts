import { NextResponse } from "next/server";
import { z } from "zod";
import { recordQuestionAttempt } from "@/server/services/mastery/update";

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
    return NextResponse.json({ error: "invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await recordQuestionAttempt(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("attempt route failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
