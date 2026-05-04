/**
 * Cognitive style — infers trait-style attributes from interaction patterns.
 *
 * Each trait has:
 *   - value: a 0-1 score on its primary dimension
 *   - confidence: 0-1, scales with sample size
 *   - evidence: short human-readable string
 *
 * Traits are intentionally simple, named in plain English, and grounded in
 * observable signals. They're meant for the teacher to skim, not for an
 * algorithm to act on alone.
 */

import { prisma } from "@/server/db";

export type CognitiveTrait = {
  trait: string;
  label: string;             // human-readable
  value: number;             // 0-1
  confidence: number;        // 0-1
  evidence: string;          // 1-line explanation
};

const N_FOR_FULL_CONF = 30; // attempts before we're "fully confident" in a trait

function confidence(n: number): number {
  return Math.min(1, n / N_FOR_FULL_CONF);
}

export async function computeCognitiveTraits(
  studentProfileId: string,
  windowDays = 30,
): Promise<CognitiveTrait[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const events = await prisma.interactionEvent.findMany({
    where: { studentId: studentProfileId, timestamp: { gte: since } },
    include: { question: { select: { difficulty: true, expectedTimeSec: true, format: true } } },
    orderBy: { timestamp: "asc" },
  });

  const traits: CognitiveTrait[] = [];

  // === Pace: median time ratio across question_attempts ===
  const ratios: number[] = [];
  let hintCount = 0;
  let attemptCount = 0;
  let correctCount = 0;
  let computationalTimes: number[] = [];
  let wordProblemTimes: number[] = [];
  const errorTypeCounts = { computational: 0, conceptual: 0, careless: 0, notation: 0 };
  let retryCount = 0;
  let lastWasIncorrect = false;
  const tutorIntents: Record<string, number> = {};
  const conceptsTouched = new Set<string>();
  const dayOfWeekHits: number[] = Array(7).fill(0);
  const hourHits: number[] = Array(24).fill(0);

  for (const ev of events) {
    const p = (ev.payload ?? {}) as Record<string, unknown>;

    if (ev.eventType === "question_attempt") {
      attemptCount += 1;
      const ts = typeof p.timeSpentMs === "number" ? p.timeSpentMs / 1000 : 0;
      const expected = ev.question?.expectedTimeSec ?? 90;
      if (ts > 0) ratios.push(ts / expected);
      const hu = typeof p.hintsUsed === "number" ? p.hintsUsed : 0;
      hintCount += hu;
      if (p.isCorrect) correctCount += 1;
      if (lastWasIncorrect && p.isCorrect) retryCount += 1;
      lastWasIncorrect = !p.isCorrect;

      const errType = p.errorType as string | undefined;
      if (errType && errType in errorTypeCounts) {
        errorTypeCounts[errType as keyof typeof errorTypeCounts] += 1;
      }

      const cId = p.curriculumNodeId as string | undefined;
      if (cId) conceptsTouched.add(cId);

      const fmt = ev.question?.format;
      if (fmt === "WORD_PROBLEM" && ts > 0) wordProblemTimes.push(ts);
      if (fmt === "COMPUTATION" && ts > 0) computationalTimes.push(ts);

      const d = ev.timestamp.getDay();
      const h = ev.timestamp.getHours();
      dayOfWeekHits[d] += 1;
      hourHits[h] += 1;
    }

    if (ev.eventType === "tutor_message") {
      const intent = (p.intent as string) || "unknown";
      tutorIntents[intent] = (tutorIntents[intent] ?? 0) + 1;
    }
  }

  // ===== Trait: Pace =====
  if (ratios.length >= 5) {
    ratios.sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    // value 0 = very slow/deliberate, 1 = very fast.
    // map: ratio 1.5 -> 0, ratio 0.4 -> 1, linear in between
    const v = Math.max(0, Math.min(1, (1.5 - median) / (1.5 - 0.4)));
    const label =
      v > 0.7 ? "Quick processor" : v < 0.3 ? "Deliberate thinker" : "Even pace";
    traits.push({
      trait: "pace",
      label,
      value: v,
      confidence: confidence(ratios.length),
      evidence: `Median time ${(median * 100).toFixed(0)}% of expected`,
    });
  }

  // ===== Trait: Hint dependence =====
  if (attemptCount >= 5) {
    const hintRate = hintCount / Math.max(1, attemptCount);
    // value 0 = solo, 1 = scaffolded
    const v = Math.min(1, hintRate / 1.5); // 1.5 hints/q = fully scaffolded
    const label =
      v < 0.2 ? "Independent solver" : v > 0.6 ? "Likes scaffolding" : "Selective scaffolder";
    traits.push({
      trait: "hint_dependence",
      label,
      value: v,
      confidence: confidence(attemptCount),
      evidence: `${(hintRate).toFixed(1)} hints per question on average`,
    });
  }

  // ===== Trait: Persistence =====
  if (attemptCount >= 5) {
    const wrongAttempts = attemptCount - correctCount;
    const retryRate = wrongAttempts > 0 ? retryCount / wrongAttempts : 0.5;
    const label =
      retryRate > 0.6 ? "Persistent — keeps trying" :
      retryRate < 0.3 ? "Moves on quickly after misses" : "Balanced retry behavior";
    traits.push({
      trait: "persistence",
      label,
      value: retryRate,
      confidence: confidence(wrongAttempts || 5),
      evidence: `Retried ${retryCount} of ${wrongAttempts} wrong answers`,
    });
  }

  // ===== Trait: Error signature =====
  const totalErrs = Object.values(errorTypeCounts).reduce((a, b) => a + b, 0);
  if (totalErrs >= 3) {
    const dominant = Object.entries(errorTypeCounts).sort((a, b) => b[1] - a[1])[0];
    const dominantType = dominant[0];
    const fraction = dominant[1] / totalErrs;
    const labelMap: Record<string, string> = {
      conceptual: "Conceptual gaps dominant",
      computational: "Computational slips dominant",
      careless: "Careless errors dominant",
      notation: "Notation/formatting errors dominant",
    };
    traits.push({
      trait: "error_signature",
      label: labelMap[dominantType] ?? "Mixed errors",
      value: fraction,
      confidence: confidence(totalErrs * 5),
      evidence: `${dominant[1]} of ${totalErrs} errors were ${dominantType}`,
    });
  }

  // ===== Trait: Inquiry style (from tutor messages) =====
  const totalIntents = Object.values(tutorIntents).reduce((a, b) => a + b, 0);
  if (totalIntents >= 3) {
    const conceptual = (tutorIntents["conceptual_why"] ?? 0) / totalIntents;
    const value = conceptual;
    const label =
      conceptual > 0.4 ? "Curious — asks 'why'" :
      (tutorIntents["procedural_how"] ?? 0) / totalIntents > 0.5 ? "Asks for procedural help" :
      "Mixed inquiry style";
    traits.push({
      trait: "inquiry_style",
      label,
      value,
      confidence: confidence(totalIntents * 5),
      evidence: `${tutorIntents["conceptual_why"] ?? 0} 'why' questions of ${totalIntents} tutor turns`,
    });
  }

  // ===== Trait: Concept reach =====
  if (attemptCount >= 5) {
    const reach = conceptsTouched.size / Math.max(1, attemptCount);
    const value = Math.min(1, reach * 3); // 1 unique concept per 3 attempts -> 1.0
    const label =
      value > 0.65 ? "Explores broadly" :
      value < 0.3 ? "Deep focus on few concepts" :
      "Balanced exploration";
    traits.push({
      trait: "concept_reach",
      label,
      value,
      confidence: confidence(attemptCount),
      evidence: `${conceptsTouched.size} concepts across ${attemptCount} attempts`,
    });
  }

  // ===== Trait: Time-of-day pattern =====
  if (attemptCount >= 8) {
    let maxH = 0, maxC = 0;
    hourHits.forEach((c, h) => { if (c > maxC) { maxC = c; maxH = h; } });
    const period =
      maxH < 6 ? "late night" :
      maxH < 12 ? "morning" :
      maxH < 17 ? "afternoon" :
      maxH < 21 ? "evening" : "night";
    const fraction = maxC / attemptCount;
    traits.push({
      trait: "time_of_day",
      label: `Most active in the ${period}`,
      value: fraction,
      confidence: confidence(attemptCount),
      evidence: `${maxC} of ${attemptCount} attempts were around ${maxH}:00`,
    });
  }

  return traits;
}
