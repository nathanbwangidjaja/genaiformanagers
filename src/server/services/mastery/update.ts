import { prisma } from "@/server/db";
import { bktUpdate, bktConfidence, type BktObservation } from "./bkt";

export interface QuestionAttemptInput {
  studentId: string;          // StudentProfile.id
  questionId: string;
  curriculumNodeId: string;
  isCorrect: boolean;
  timeSpentMs: number;
  hintsUsed: number;
  attemptNumber: number;
  errorType?: BktObservation["errorType"];
  sessionId?: string;
}

export async function recordQuestionAttempt(input: QuestionAttemptInput) {
  await prisma.interactionEvent.create({
    data: {
      studentId: input.studentId,
      sessionId: input.sessionId,
      questionId: input.questionId,
      eventType: "question_attempt",
      payload: {
        curriculumNodeId: input.curriculumNodeId,
        isCorrect: input.isCorrect,
        timeSpentMs: input.timeSpentMs,
        hintsUsed: input.hintsUsed,
        attemptNumber: input.attemptNumber,
        errorType: input.errorType ?? null,
      },
    },
  });

  const [existing, question] = await Promise.all([
    prisma.studentConceptMastery.findUnique({
      where: {
        studentId_curriculumNodeId: {
          studentId: input.studentId,
          curriculumNodeId: input.curriculumNodeId,
        },
      },
    }),
    prisma.question.findUnique({ where: { id: input.questionId } }),
  ]);

  const expectedTimeSec = question?.expectedTimeSec ?? 120;
  const actualTimeSec = Math.max(1, Math.round(input.timeSpentMs / 1000));

  const obs: BktObservation = {
    isCorrect: input.isCorrect,
    hintsUsed: input.hintsUsed,
    expectedTimeSec,
    actualTimeSec,
    errorType: input.errorType ?? null,
  };

  const oldMastery = existing?.masteryLevel ?? 0.1;
  const lastPracticed = existing?.lastPracticedAt;
  const daysSinceLast = lastPracticed
    ? (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const newMastery = bktUpdate(oldMastery, daysSinceLast, obs);

  const oldAttempts = existing?.totalAttempts ?? 0;
  const oldCorrect = existing?.correctAttempts ?? 0;
  const newAttempts = oldAttempts + 1;
  const newCorrect = oldCorrect + (input.isCorrect ? 1 : 0);
  const newConfidence = bktConfidence(newAttempts);

  const oldAvgTime = existing?.avgTimePerQuestion ?? actualTimeSec;
  const newAvgTime = (oldAvgTime * oldAttempts + actualTimeSec) / newAttempts;

  const oldHintRate = existing?.hintUsageRate ?? 0;
  const usedHint = input.hintsUsed > 0 ? 1 : 0;
  const newHintRate = (oldHintRate * oldAttempts + usedHint) / newAttempts;

  const oldStreak = existing?.streak ?? 0;
  const newStreak = input.isCorrect ? oldStreak + 1 : 0;

  const errorCounts =
    (existing?.errorPatternCounts as Record<string, number> | null) ?? {};
  if (!input.isCorrect && input.errorType) {
    errorCounts[input.errorType] = (errorCounts[input.errorType] ?? 0) + 1;
  }

  const result = await prisma.studentConceptMastery.upsert({
    where: {
      studentId_curriculumNodeId: {
        studentId: input.studentId,
        curriculumNodeId: input.curriculumNodeId,
      },
    },
    update: {
      masteryLevel: newMastery,
      confidence: newConfidence,
      totalAttempts: newAttempts,
      correctAttempts: newCorrect,
      avgTimePerQuestion: newAvgTime,
      errorPatternCounts: errorCounts,
      hintUsageRate: newHintRate,
      streak: newStreak,
      lastPracticedAt: new Date(),
    },
    create: {
      studentId: input.studentId,
      curriculumNodeId: input.curriculumNodeId,
      masteryLevel: newMastery,
      confidence: newConfidence,
      totalAttempts: 1,
      correctAttempts: input.isCorrect ? 1 : 0,
      avgTimePerQuestion: actualTimeSec,
      errorPatternCounts: errorCounts,
      hintUsageRate: usedHint,
      streak: newStreak,
      lastPracticedAt: new Date(),
    },
  });

  return {
    oldMastery,
    newMastery: result.masteryLevel,
    delta: result.masteryLevel - oldMastery,
    confidence: result.confidence,
    streak: result.streak,
  };
}
