import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const Schema = z.object({ submissionId: z.string() });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const sub = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
    include: { responses: true },
  });
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const correct = sub.responses.filter((r) => r.isCorrect).length;
  const total = sub.responses.length;
  const score = total > 0 ? correct / total : 0;

  const updated = await prisma.submission.update({
    where: { id: sub.id },
    data: { completedAt: new Date(), score },
  });
  return NextResponse.json({ ok: true, id: updated.id, score: updated.score });
}
