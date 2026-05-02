// Bayesian Knowledge Tracing — models P(L), the probability a student knows a concept.
// After each observation: compute posterior, apply learning prior, apply forgetting decay.
//
// Default parameters from the ITS literature:
//   P(T) = 0.10  — learning rate per opportunity
//   P(G) = 0.25  — guess probability (4-option MC)
//   P(S) = 0.10  — slip probability (knows but answers wrong)

export interface BktParams {
  pT: number; // P(transition / learning)
  pG: number; // P(guess)
  pS: number; // P(slip)
  decayLambda: number; // forgetting rate per day
}

export const DEFAULT_BKT: BktParams = {
  pT: 0.1,
  pG: 0.25,
  pS: 0.1,
  decayLambda: 0.05,
};

export interface BktObservation {
  isCorrect: boolean;
  hintsUsed: number;          // 0-3
  expectedTimeSec: number;    // baseline for the question
  actualTimeSec: number;
  errorType?: "computational" | "conceptual" | "careless" | "notation" | null;
}

export function bktPosterior(prior: number, obs: BktObservation, params: BktParams = DEFAULT_BKT): number {
  // Hints or suspiciously fast response time both suggest guessing
  let effG = params.pG;
  if (obs.hintsUsed > 0) effG = Math.min(0.6, effG + 0.1 * obs.hintsUsed);
  if (obs.actualTimeSec < obs.expectedTimeSec * 0.25) effG = Math.min(0.6, effG + 0.1);

  // Computational/careless errors are slips; conceptual errors signal genuine not-knowing
  let effS = params.pS;
  if (obs.errorType === "computational" || obs.errorType === "careless") effS = Math.min(0.4, effS + 0.05);
  if (obs.errorType === "conceptual") effS = Math.max(0.02, effS - 0.05);

  if (obs.isCorrect) {
    const num = prior * (1 - effS);
    const den = prior * (1 - effS) + (1 - prior) * effG;
    return den === 0 ? prior : num / den;
  } else {
    const num = prior * effS;
    const den = prior * effS + (1 - prior) * (1 - effG);
    return den === 0 ? prior : num / den;
  }
}

export function bktLearn(posterior: number, params: BktParams = DEFAULT_BKT): number {
  return posterior + (1 - posterior) * params.pT;
}

export function bktDecay(prior: number, daysSinceLast: number, params: BktParams = DEFAULT_BKT): number {
  if (daysSinceLast <= 0) return prior;
  return prior * Math.exp(-params.decayLambda * daysSinceLast);
}

export function bktUpdate(
  oldMastery: number,
  daysSinceLast: number,
  obs: BktObservation,
  params: BktParams = DEFAULT_BKT,
): number {
  const decayed = bktDecay(oldMastery, daysSinceLast, params);
  const posterior = bktPosterior(decayed, obs, params);
  const learned = bktLearn(posterior, params);
  return Math.max(0, Math.min(1, learned));
}

// Saturates around ~30 attempts
export function bktConfidence(totalAttempts: number): number {
  return 1 - Math.exp(-totalAttempts / 12);
}
