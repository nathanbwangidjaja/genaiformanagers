/**
 * Real-time mastery update — writes to the knowledge graph.
 *
 * Each attempt becomes:
 *   - An `attempt` node
 *   - A `practiced_in` edge from the attempt to the concept
 *   - An `instance_of` edge from the attempt to the question (if question node exists)
 *   - The concept node's cached `mastery` prop is updated via BKT
 *
 * The concept node IS the source of truth for current mastery. The attempt
 * nodes are the source of truth for the underlying observations.
 *
 * The legacy `StudentConceptMastery` table is no longer written to.
 */

import { prisma } from "@/server/db";
import { bktUpdate, bktConfidence, type BktObservation } from "./bkt";
import { addEdge, getOrCreateConceptNode, patchNodeProps, upsertNode } from "@/server/services/kg/store";
import { isAttemptInFlow } from "@/server/services/cognitive/flow";
import { classifyWeakness } from "@/server/services/cognitive/weakness";

export interface QuestionAttemptInput {
  studentId: string; // StudentProfile.id
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
  // 1. Always write the raw event for audit / replay
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

  // 2. Look up the question + curriculum metadata (for the KG nodes + BKT)
  const [question, curriculumNode] = await Promise.all([
    prisma.question.findUnique({ where: { id: input.questionId } }),
    prisma.curriculumNode.findUnique({ where: { id: input.curriculumNodeId } }),
  ]);
  if (!curriculumNode) {
    throw new Error(`curriculum node ${input.curriculumNodeId} not found`);
  }

  // 3. Get-or-create the concept node (this is the per-student concept rep)
  const conceptNode = await getOrCreateConceptNode(input.studentId, input.curriculumNodeId, {
    code: curriculumNode.code,
    name: curriculumNode.name,
    domain: curriculumNode.domain,
  });

  // 4. Read current cached aggregates from the concept node's props
  const oldProps = (conceptNode.props as Record<string, unknown>) ?? {};
  const oldMastery = (oldProps.mastery as number | undefined) ?? 0.1;
  const oldAttempts = (oldProps.totalAttempts as number | undefined) ?? 0;
  const oldCorrect = (oldProps.correctAttempts as number | undefined) ?? 0;
  const oldHintRate = (oldProps.hintRate as number | undefined) ?? 0;
  const oldStreak = (oldProps.streak as number | undefined) ?? 0;
  const oldAvgTime =
    (oldProps.avgTimePerQuestionSec as number | undefined) ?? Math.max(1, input.timeSpentMs / 1000);
  const oldErrCounts = (oldProps.errorPatternCounts as Record<string, number> | undefined) ?? {};
  const oldFlowFrac = (oldProps.flowFraction as number | undefined) ?? 0;
  const oldFlowSuccessCount = (oldProps.flowSuccessCount as number | undefined) ?? 0;
  const lastPracticedAt =
    typeof oldProps.lastPracticedAt === "string"
      ? new Date(oldProps.lastPracticedAt)
      : null;

  // 5. Compute BKT
  const expectedTimeSec = question?.expectedTimeSec ?? 120;
  const actualTimeSec = Math.max(1, Math.round(input.timeSpentMs / 1000));
  const obs: BktObservation = {
    isCorrect: input.isCorrect,
    hintsUsed: input.hintsUsed,
    expectedTimeSec,
    actualTimeSec,
    errorType: input.errorType ?? null,
  };
  const daysSinceLast = lastPracticedAt
    ? (Date.now() - lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const newMastery = bktUpdate(oldMastery, daysSinceLast, obs);
  const newAttempts = oldAttempts + 1;
  const newCorrect = oldCorrect + (input.isCorrect ? 1 : 0);
  const newConfidence = bktConfidence(newAttempts);
  const newAvgTime = (oldAvgTime * oldAttempts + actualTimeSec) / newAttempts;
  const usedHint = input.hintsUsed > 0 ? 1 : 0;
  const newHintRate = (oldHintRate * oldAttempts + usedHint) / newAttempts;
  const newStreak = input.isCorrect ? oldStreak + 1 : 0;
  const newErrCounts = { ...oldErrCounts };
  if (!input.isCorrect && input.errorType) {
    newErrCounts[input.errorType] = (newErrCounts[input.errorType] ?? 0) + 1;
  }

  // 6. Was this attempt in flow? Update the running fraction.
  const inFlow = isAttemptInFlow({
    questionDifficulty: question?.difficulty ?? 3,
    studentMasteryAtAttempt: oldMastery,
    expectedTimeSec,
    actualTimeSec,
    hintsUsed: input.hintsUsed,
    isCorrect: input.isCorrect,
    curriculumNodeId: input.curriculumNodeId,
    timestamp: new Date(),
  });
  const newFlowSuccessCount = oldFlowSuccessCount + (inFlow ? 1 : 0);
  const newFlowFrac = newFlowSuccessCount / newAttempts;

  const newWeakness = classifyWeakness({
    masteryLevel: newMastery,
    totalAttempts: newAttempts,
    hintUsageRate: newHintRate,
    errorPatternCounts: newErrCounts,
    flowFraction: newFlowFrac,
  });

  // 7. Patch the concept node with all the new aggregates
  await patchNodeProps(conceptNode.id, {
    mastery: newMastery,
    confidence: newConfidence,
    totalAttempts: newAttempts,
    correctAttempts: newCorrect,
    hintRate: newHintRate,
    streak: newStreak,
    avgTimePerQuestionSec: newAvgTime,
    lastPracticedAt: new Date().toISOString(),
    errorPatternCounts: newErrCounts,
    flowFraction: newFlowFrac,
    flowSuccessCount: newFlowSuccessCount,
    weaknessCategory: newWeakness,
  });

  // 8. Create the attempt node + edge to the concept
  const attemptNode = await upsertNode({
    studentId: input.studentId,
    type: "attempt",
    label: `${input.isCorrect ? "✓" : "✗"} ${curriculumNode.code}`,
    props: {
      isCorrect: input.isCorrect,
      timeMs: input.timeSpentMs,
      hintsUsed: input.hintsUsed,
      errorType: input.errorType ?? null,
      difficulty: question?.difficulty ?? 3,
      inFlow,
      questionId: input.questionId,
    },
  });
  await addEdge(input.studentId, attemptNode.id, conceptNode.id, "practiced_in");

  // 9. Question node + edges (idempotent — same questionId reused)
  if (question) {
    const content = (question.content ?? {}) as { text?: string };
    const questionNode = await upsertNode({
      studentId: input.studentId,
      type: "question",
      label: (content.text ?? "(question)").slice(0, 60),
      externalKey: question.id,
      props: {
        questionId: question.id,
        text: content.text ?? "",
        difficulty: question.difficulty,
        format: question.format,
      },
    });
    await addEdge(input.studentId, attemptNode.id, questionNode.id, "instance_of");
  }

  return {
    oldMastery,
    newMastery,
    delta: newMastery - oldMastery,
    confidence: newConfidence,
    streak: newStreak,
    inFlow,
    weakness: newWeakness,
  };
}
