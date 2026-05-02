import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { computeAllScores, type BehavioralRawSignals } from "./scores";

const WINDOW_DAYS = 30;

export async function recomputeBehavioralProfile(studentId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const events = await prisma.interactionEvent.findMany({
    where: { studentId, timestamp: { gte: since } },
  });

  let exploreClicks = 0;
  let exploreOpportunities = 0;
  let voluntaryHarderAttempts = 0;
  let totalProblems = 0;
  let freeformQuestions = 0;
  let retriesAfterIncorrect = 0;
  let abandonedAfterIncorrect = 0;
  let lastWasIncorrect = false;
  const sessionIds = new Set<string>();
  const conceptIds = new Set<string>();
  let totalTimeMs = 0;

  for (const e of events) {
    if (e.sessionId) sessionIds.add(e.sessionId);
    const p = (e.payload ?? {}) as Record<string, unknown>;

    if (e.eventType === "question_attempt") {
      totalProblems += 1;
      const nodeId = (p.curriculumNodeId as string | undefined) ?? null;
      if (nodeId) conceptIds.add(nodeId);
      const isCorrect = !!p.isCorrect;
      if (lastWasIncorrect && !isCorrect) abandonedAfterIncorrect += 1;
      if (lastWasIncorrect && isCorrect) retriesAfterIncorrect += 1;
      lastWasIncorrect = !isCorrect;
      const ts = typeof p.timeSpentMs === "number" ? p.timeSpentMs : 0;
      totalTimeMs += ts;
    }
    if (e.eventType === "explore_clicked") {
      exploreClicks += 1;
    }
    if (e.eventType === "difficulty_selected" && p.direction === "harder") {
      voluntaryHarderAttempts += 1;
    }
    if (e.eventType === "freeform_question") {
      freeformQuestions += 1;
    }
  }

  exploreOpportunities = totalProblems;

  const sessions = await prisma.learningSession.findMany({
    where: { studentId, startedAt: { gte: since } },
  });

  const sessionsStarted = sessions.length;
  const sessionsCompleted = sessions.filter((s) => s.endedAt !== null).length;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessionsLast7Days = sessions.filter((s) => s.startedAt >= weekAgo).length;

  const totalConcepts = await prisma.curriculumNode.count({
    where: { depth: "STANDARD" },
  });

  const lastSession = sessions
    .map((s) => s.startedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const daysSinceLastSession = lastSession
    ? (Date.now() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
    : 30;

  const avgSessionMinutes =
    sessionsCompleted > 0
      ? sessions
          .filter((s) => s.endedAt)
          .reduce((acc, s) => acc + (s.endedAt!.getTime() - s.startedAt.getTime()) / 60000, 0) /
        sessionsCompleted
      : 0;

  const assignmentsAssigned = 0;
  const assignmentsCompleted = 0;

  const raw: BehavioralRawSignals = {
    exploreClicks,
    exploreOpportunities,
    voluntaryHarderAttempts,
    totalProblems,
    freeformQuestions,
    sessions: sessionIds.size || sessionsStarted || 1,
    beyondAssignedConcepts: conceptIds.size,
    totalConcepts,
    retriesAfterIncorrect,
    abandonedAfterIncorrect,
    sessionsCompleted,
    sessionsStarted,
    returnedAfterBadSession: 0,
    badSessions: 0,
    engagementTrend: 0,
    sessionsLast7Days,
    expectedSessionsPerWeek: 3,
    avgSessionMinutes,
    expectedSessionMinutes: 20,
    assignmentsCompleted,
    assignmentsAssigned,
    daysSinceLastSession,
  };

  const scores = computeAllScores(raw);

  await prisma.studentBehavioralProfile.upsert({
    where: { studentId },
    update: {
      curiosityScore: scores.curiosity,
      motivationScore: scores.motivation,
      engagementScore: scores.engagement,
      persistenceScore: scores.persistence,
      curiositySignals: { exploreClicks, voluntaryHarderAttempts, freeformQuestions },
      motivationSignals: { retriesAfterIncorrect, abandonedAfterIncorrect },
      engagementSignals: { sessionsLast7Days, avgSessionMinutes, daysSinceLastSession },
      window30d: raw as unknown as Prisma.InputJsonValue,
    },
    create: {
      studentId,
      curiosityScore: scores.curiosity,
      motivationScore: scores.motivation,
      engagementScore: scores.engagement,
      persistenceScore: scores.persistence,
      curiositySignals: { exploreClicks, voluntaryHarderAttempts, freeformQuestions },
      motivationSignals: { retriesAfterIncorrect, abandonedAfterIncorrect },
      engagementSignals: { sessionsLast7Days, avgSessionMinutes, daysSinceLastSession },
      window30d: raw as unknown as Prisma.InputJsonValue,
    },
  });

  return scores;
}

export async function recomputeAllStudents() {
  const profiles = await prisma.studentProfile.findMany({ select: { id: true } });
  const results = await Promise.all(profiles.map((p) => recomputeBehavioralProfile(p.id)));
  return { count: results.length };
}
