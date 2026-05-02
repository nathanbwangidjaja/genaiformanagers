import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

const Schema = z.object({
  studentId: z.string(),
  eventType: z.string(),
  questionId: z.string().optional(),
  sessionId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
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
    const evt = await prisma.interactionEvent.create({
      data: { ...parsed.data, payload: parsed.data.payload as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true, id: evt.id });
  } catch (e) {
    console.error("event route failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
