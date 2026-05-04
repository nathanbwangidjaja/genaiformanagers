/**
 * Flow state computation (Csikszentmihalyi 1990, Engeser & Rheinberg 2008,
 * adapted for adaptive learning systems).
 *
 * A question attempt is "in flow" when ALL of:
 *   1. Challenge-skill alignment: |question_difficulty − student_mastery * 5| ≤ 1.5
 *   2. Time efficiency: 0.4 ≤ actual/expected ≤ 1.6 (not skimming, not stuck)
 *   3. Independence: hints used ≤ 1 (mostly figured it out)
 *   4. Engagement: actually attempted (not skipped)
 *
 * The composite flowScore for a student aggregates over a 30-day window:
 *   flowScore = 0.5 * fraction_in_flow
 *             + 0.3 * sustained_streaks_factor
 *             + 0.2 * session_length_factor
 *
 * Sustained streaks reward consecutive in-flow questions (the "I'm in the
 * zone" feeling). Session length factor rewards longer focused sessions.
 *
 * Each question attempt is also tagged with its in-flow status, which is
 * aggregated per concept into `flowFraction` on StudentConceptMastery.
 */

import { prisma } from "@/server/db";

export interface AttemptForFlow {
  questionDifficulty: number; // 1-5
  studentMasteryAtAttempt: number; // 0-1, mastery on the concept BEFORE the attempt
  expectedTimeSec: number;
  actualTimeSec: number;
  hintsUsed: number;
  isCorrect: boolean;
  curriculumNodeId: string;
  timestamp: Date;
  sessionId?: string | null;
}

export function isAttemptInFlow(a: AttemptForFlow): boolean {
  // Map mastery 0-1 to expected difficulty 1-5
  const expectedDifficulty = a.studentMasteryAtAttempt * 5;
  const challengeAlignment = Math.abs(a.questionDifficulty - expectedDifficulty) <= 1.5;

  const timeRatio = a.actualTimeSec / Math.max(1, a.expectedTimeSec);
  const timeOk = timeRatio >= 0.4 && timeRatio <= 1.6;

  const independenceOk = a.hintsUsed <= 1;

  return challengeAlignment && timeOk && independenceOk;
}

export interface FlowAggregate {
  fractionInFlow: number; // 0-1
  sustainedStreaksFactor: number; // 0-1 — proportion of attempts that are part of ≥3 streak
  sessionLengthFactor: number; // 0-1 — avg session length / 25 min cap
  composite: number; // 0-1
  perConceptFraction: Record<string, number>; // curriculumNodeId -> 0-1
  totalAttempts: number;
}

export async function computeFlowForStudent(
  studentProfileId: string,
  windowDays = 30,
): Promise<FlowAggregate> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Pull all question_attempt events with the data we need
  const events = await prisma.interactionEvent.findMany({
    where: {
      studentId: studentProfileId,
      eventType: "question_attempt",
      timestamp: { gte: since },
    },
    include: {
      question: { select: { difficulty: true, expectedTimeSec: true, curriculumNodeId: true } },
    },
    orderBy: { timestamp: "asc" },
  });

  if (events.length === 0) {
    return {
      fractionInFlow: 0,
      sustainedStreaksFactor: 0,
      sessionLengthFactor: 0,
      composite: 0,
      perConceptFraction: {},
      totalAttempts: 0,
    };
  }

  // We need the mastery at the time of attempt — approximate using the
  // running history: assume mastery starts at 0 and update with a simple
  // weighted average per concept as we walk. (Avoids loading every
  // historical BKT state.)
  const runningMastery = new Map<string, number>();
  let inFlowCount = 0;
  const perConceptCounts = new Map<string, { total: number; inFlow: number }>();
  const inFlowSeq: boolean[] = [];

  for (const ev of events) {
    const p = (ev.payload ?? {}) as Record<string, unknown>;
    const conceptId = (p.curriculumNodeId as string | undefined) ?? ev.question?.curriculumNodeId;
    if (!conceptId) continue;
    const isCorrect = !!p.isCorrect;
    const timeSpentMs = typeof p.timeSpentMs === "number" ? p.timeSpentMs : 0;
    const hintsUsed = typeof p.hintsUsed === "number" ? p.hintsUsed : 0;
    const difficulty = ev.question?.difficulty ?? (p.questionDifficulty as number) ?? 3;
    const expected = ev.question?.expectedTimeSec ?? 90;

    const mastery = runningMastery.get(conceptId) ?? 0.1;

    const inFlow = isAttemptInFlow({
      questionDifficulty: difficulty,
      studentMasteryAtAttempt: mastery,
      expectedTimeSec: expected,
      actualTimeSec: Math.max(1, Math.round(timeSpentMs / 1000)),
      hintsUsed,
      isCorrect,
      curriculumNodeId: conceptId,
      timestamp: ev.timestamp,
      sessionId: ev.sessionId,
    });
    inFlowSeq.push(inFlow);
    if (inFlow) inFlowCount += 1;

    const cs = perConceptCounts.get(conceptId) ?? { total: 0, inFlow: 0 };
    cs.total += 1;
    if (inFlow) cs.inFlow += 1;
    perConceptCounts.set(conceptId, cs);

    // Crude running mastery update: nudge toward 1 on correct, toward 0 on wrong
    const newM = isCorrect ? mastery + (1 - mastery) * 0.15 : mastery * 0.85;
    runningMastery.set(conceptId, Math.max(0, Math.min(1, newM)));
  }

  const fractionInFlow = inFlowCount / events.length;

  // Sustained streaks: count attempts that are part of an in-flow run of length ≥ 3
  let inSustained = 0;
  let runStart = 0;
  for (let i = 0; i <= inFlowSeq.length; i++) {
    if (i < inFlowSeq.length && inFlowSeq[i]) continue;
    const runLen = i - runStart;
    if (runLen >= 3) inSustained += runLen;
    runStart = i + 1;
  }
  const sustainedStreaksFactor = events.length > 0 ? inSustained / events.length : 0;

  // Session length — pull sessions in window
  const sessions = await prisma.learningSession.findMany({
    where: { studentId: studentProfileId, startedAt: { gte: since }, endedAt: { not: null } },
  });
  const lens = sessions.map((s) =>
    s.endedAt ? (s.endedAt.getTime() - s.startedAt.getTime()) / 60000 : 0,
  );
  const avgSessionMin = lens.length > 0 ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const sessionLengthFactor = Math.max(0, Math.min(1, avgSessionMin / 25));

  const composite =
    0.5 * fractionInFlow + 0.3 * sustainedStreaksFactor + 0.2 * sessionLengthFactor;

  const perConceptFraction: Record<string, number> = {};
  for (const [k, v] of perConceptCounts.entries()) {
    perConceptFraction[k] = v.inFlow / Math.max(1, v.total);
  }

  return {
    fractionInFlow,
    sustainedStreaksFactor,
    sessionLengthFactor,
    composite,
    perConceptFraction,
    totalAttempts: events.length,
  };
}
