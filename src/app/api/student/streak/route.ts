/**
 * Returns a 7-element array of question_attempt counts per day for the
 * signed-in student, oldest day first. Used by the sidebar streak card.
 */

import { NextResponse } from "next/server";
import { requireStudent } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const student = await requireStudent();
  if (!student.studentProfile) {
    return NextResponse.json({ days: [0, 0, 0, 0, 0, 0, 0] });
  }

  const now = new Date();
  const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // 7 days ago at midnight local
  const start = new Date(startOfTodayLocal);
  start.setDate(start.getDate() - 6);

  const events = await prisma.interactionEvent.findMany({
    where: {
      studentId: student.studentProfile.id,
      eventType: "question_attempt",
      timestamp: { gte: start },
    },
    select: { timestamp: true },
  });

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of events) {
    const ts = e.timestamp;
    const dayMidnight = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
    const idx = Math.floor((dayMidnight.getTime() - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < 7) counts[idx]++;
  }

  return NextResponse.json({ days: counts });
}
