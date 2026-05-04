/**
 * KG aggregator — derives behavioral scores + cognitive traits + extracted
 * patterns (misconceptions, strengths, curiosity threads) from the per-student
 * knowledge graph and writes them back as nodes/edges.
 *
 * Run nightly via cron, or on-demand. Idempotent — re-running re-derives.
 */

import type { Prisma, KGNode } from "@prisma/client";
import { prisma } from "@/server/db";
import { upsertNode, addEdge, addEdgeIfMissing } from "./store";
import { computeAllScores, type BehavioralRawSignals } from "@/server/services/behavioral/scores";
import { computeFlowForStudent } from "@/server/services/cognitive/flow";
import { computeCognitiveTraits } from "@/server/services/cognitive/style";

const WINDOW_DAYS = 30;

type Json = Record<string, unknown>;
const props = (n: KGNode) => (n.props as Json) ?? {};

export async function recomputeStudentGraphAggregates(studentId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  // Read primary observation nodes from the graph
  const allNodes = await prisma.kGNode.findMany({ where: { studentId } });
  const conceptNodes = allNodes.filter((n) => n.type === "concept");
  const attemptNodes = allNodes.filter((n) => n.type === "attempt" && n.createdAt >= since);
  const tutorMessageNodes = allNodes.filter(
    (n) => n.type === "tutor_message" && n.createdAt >= since,
  );

  // ===== Build behavioral signals =====
  let totalProblems = 0;
  let retriesAfterIncorrect = 0;
  let abandonedAfterIncorrect = 0;
  let lastWasIncorrect = false;
  const tutorIntents: Record<string, number> = {};
  let conceptualWhyCount = 0;
  let understandingCount = 0;

  // Order attempts by createdAt to compute retry/abandon
  attemptNodes
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .forEach((n) => {
      totalProblems += 1;
      const isCorrect = !!props(n).isCorrect;
      if (lastWasIncorrect && !isCorrect) abandonedAfterIncorrect += 1;
      if (lastWasIncorrect && isCorrect) retriesAfterIncorrect += 1;
      lastWasIncorrect = !isCorrect;
    });

  for (const n of tutorMessageNodes) {
    const intent = (props(n).intent as string) ?? "unknown";
    tutorIntents[intent] = (tutorIntents[intent] ?? 0) + 1;
    if (intent === "conceptual_why") conceptualWhyCount += 1;
    if (intent === "expressing_understanding") understandingCount += 1;
  }

  // Sessions still come from the legacy LearningSession table
  const sessions = await prisma.learningSession.findMany({
    where: { studentId, startedAt: { gte: since } },
  });
  const sessionsStarted = sessions.length;
  const sessionsCompleted = sessions.filter((s) => s.endedAt !== null).length;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const sessionsLast7Days = sessions.filter((s) => s.startedAt >= weekAgo).length;
  const lastSession = sessions
    .map((s) => s.startedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const daysSinceLastSession = lastSession
    ? (Date.now() - lastSession.getTime()) / 86_400_000
    : 30;
  const avgSessionMinutes =
    sessionsCompleted > 0
      ? sessions
          .filter((s) => s.endedAt)
          .reduce((acc, s) => acc + (s.endedAt!.getTime() - s.startedAt.getTime()) / 60000, 0) /
        sessionsCompleted
      : 0;

  const totalConcepts = await prisma.curriculumNode.count({ where: { depth: "STANDARD" } });

  const raw: BehavioralRawSignals = {
    exploreClicks: conceptualWhyCount * 2, // proxy: curious "why" questions
    exploreOpportunities: Math.max(totalProblems, conceptualWhyCount + 1),
    voluntaryHarderAttempts: understandingCount,
    totalProblems,
    freeformQuestions: tutorMessageNodes.length,
    sessions: Math.max(1, sessionsStarted),
    beyondAssignedConcepts: conceptNodes.length,
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
    assignmentsCompleted: 0,
    assignmentsAssigned: 0,
    daysSinceLastSession,
  };
  const scores = computeAllScores(raw);
  const flow = await computeFlowForStudent(studentId, WINDOW_DAYS);

  // ===== Write behavior nodes =====
  const behaviorKinds = [
    { kind: "curiosity", value: scores.curiosity },
    { kind: "motivation", value: scores.motivation },
    { kind: "engagement", value: scores.engagement },
    { kind: "persistence", value: scores.persistence },
    { kind: "flow", value: flow.composite },
  ] as const;

  for (const b of behaviorKinds) {
    await upsertNode({
      studentId,
      type: "behavior",
      label: `${b.kind} ${Math.round(b.value * 100)}%`,
      externalKey: b.kind,
      props: {
        kind: b.kind,
        value: b.value,
        signals: { tutorIntents, raw },
      },
    });
  }

  // ===== Write trait nodes =====
  const traits = await computeCognitiveTraits(studentId, WINDOW_DAYS);
  for (const t of traits) {
    const traitNode = await upsertNode({
      studentId,
      type: "trait",
      label: t.label,
      externalKey: t.trait,
      props: {
        name: t.trait,
        label: t.label,
        value: t.value,
        confidence: t.confidence,
        evidence: t.evidence,
      },
    });

    // Link traits to concepts where they manifest (top-attempted concepts)
    const topConcepts = conceptNodes
      .slice()
      .sort((a, b) => ((props(b).totalAttempts as number) ?? 0) - ((props(a).totalAttempts as number) ?? 0))
      .slice(0, 3);
    for (const c of topConcepts) {
      await addEdgeIfMissing(studentId, traitNode.id, c.id, "manifests_in");
    }
  }

  // ===== Per-concept flow fraction patch =====
  for (const c of conceptNodes) {
    const f = flow.perConceptFraction[c.externalKey ?? ""] ?? 0;
    await prisma.kGNode.update({
      where: { id: c.id },
      data: {
        props: { ...((c.props as Json) ?? {}), flowFraction: f } as Prisma.InputJsonValue,
      },
    });
  }

  // ===== Pattern extractors: misconceptions =====
  // Group attempt nodes by (concept, errorType) and create misconception nodes
  // when the pair recurs ≥3 times.
  const attemptToConcept = new Map<string, string>(); // attemptId -> conceptId
  const allEdges = await prisma.kGEdge.findMany({
    where: { studentId, type: "practiced_in" },
  });
  for (const e of allEdges) attemptToConcept.set(e.fromId, e.toId);

  const errBuckets = new Map<string, KGNode[]>(); // key: `${conceptId}:${errorType}`
  for (const a of attemptNodes) {
    const ap = props(a);
    const errorType = ap.errorType as string | undefined;
    if (!errorType) continue;
    const conceptId = attemptToConcept.get(a.id);
    if (!conceptId) continue;
    const key = `${conceptId}:${errorType}`;
    const arr = errBuckets.get(key) ?? [];
    arr.push(a);
    errBuckets.set(key, arr);
  }
  for (const [key, attempts] of errBuckets.entries()) {
    if (attempts.length < 3) continue;
    const [conceptId, errorType] = key.split(":");
    const concept = conceptNodes.find((c) => c.id === conceptId);
    if (!concept) continue;
    const conceptProps = props(concept);
    const misconNode = await upsertNode({
      studentId,
      type: "misconception",
      label: `Recurring ${errorType} on ${conceptProps.code ?? "?"}`,
      externalKey: `${conceptId}:${errorType}`,
      props: {
        errorType,
        conceptId,
        occurrences: attempts.length,
        firstSeenAt: attempts[0].createdAt.toISOString(),
      },
    });
    for (const a of attempts) {
      await addEdgeIfMissing(studentId, a.id, misconNode.id, "evidences");
    }
  }

  // ===== Pattern extractors: strengths =====
  // For each concept where mastery ≥ 0.8 + hintRate < 0.2 + ≥ 5 attempts,
  // create/update a strength node and link the relevant attempts.
  for (const c of conceptNodes) {
    const cp = props(c);
    const mastery = (cp.mastery as number) ?? 0;
    const hintRate = (cp.hintRate as number) ?? 0;
    const totalAttempts = (cp.totalAttempts as number) ?? 0;
    if (mastery < 0.8 || hintRate >= 0.2 || totalAttempts < 5) continue;

    const strengthNode = await upsertNode({
      studentId,
      type: "strength",
      label: `Strong on ${cp.code ?? c.label}`,
      externalKey: c.externalKey ?? c.id,
      props: {
        conceptId: c.id,
        evidenceType: "no_hints",
      },
    });
    // Link recent successful attempts on this concept
    const successAttempts = attemptNodes.filter((a) => {
      const ap = props(a);
      return ap.isCorrect && attemptToConcept.get(a.id) === c.id;
    });
    for (const a of successAttempts.slice(-5)) {
      await addEdgeIfMissing(studentId, a.id, strengthNode.id, "demonstrates");
    }
  }

  // ===== Pattern extractor: curiosity threads =====
  // Group conceptual_why tutor messages by concept, create curiosity_thread
  // nodes if ≥ 2 messages on related concepts.
  const conceptualWhyByConcept = new Map<string, KGNode[]>();
  const tutorEdges = await prisma.kGEdge.findMany({
    where: { studentId, type: "asked_about" },
  });
  const msgToConcept = new Map<string, string>();
  for (const e of tutorEdges) msgToConcept.set(e.fromId, e.toId);

  for (const m of tutorMessageNodes) {
    const mp = props(m);
    if (mp.intent !== "conceptual_why") continue;
    const conceptId = msgToConcept.get(m.id);
    if (!conceptId) continue;
    const arr = conceptualWhyByConcept.get(conceptId) ?? [];
    arr.push(m);
    conceptualWhyByConcept.set(conceptId, arr);
  }
  for (const [conceptId, msgs] of conceptualWhyByConcept.entries()) {
    if (msgs.length < 2) continue;
    const concept = conceptNodes.find((c) => c.id === conceptId);
    if (!concept) continue;
    const cp = props(concept);
    const threadNode = await upsertNode({
      studentId,
      type: "curiosity_thread",
      label: `Curious about ${cp.code ?? concept.label}`,
      externalKey: conceptId,
      props: {
        topic: cp.name ?? concept.label,
        messageCount: msgs.length,
      },
    });
    for (const m of msgs) {
      await addEdgeIfMissing(studentId, m.id, threadNode.id, "evidences");
    }
  }

  return {
    behaviors: behaviorKinds.length,
    traits: traits.length,
    misconceptions: errBuckets.size,
    strengths: conceptNodes.filter((c) => ((props(c).mastery as number) ?? 0) >= 0.8).length,
  };
}

export async function recomputeAllStudentGraphs() {
  const profiles = await prisma.studentProfile.findMany({ select: { id: true } });
  const results = await Promise.all(profiles.map((p) => recomputeStudentGraphAggregates(p.id)));
  return { count: results.length };
}
