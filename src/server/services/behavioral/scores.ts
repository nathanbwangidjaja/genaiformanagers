// All scores are in [0, 1]. Recomputed in batch over a 30-day event window.

export interface BehavioralRawSignals {
  // Curiosity inputs
  exploreClicks: number;
  exploreOpportunities: number;
  voluntaryHarderAttempts: number;
  totalProblems: number;
  freeformQuestions: number;
  sessions: number;
  beyondAssignedConcepts: number; // distinct concepts the student touched outside assignments
  totalConcepts: number;

  // Motivation inputs
  retriesAfterIncorrect: number;
  abandonedAfterIncorrect: number;
  sessionsCompleted: number;
  sessionsStarted: number;
  returnedAfterBadSession: number;
  badSessions: number;
  engagementTrend: number; // -1 (declining) .. +1 (rising)

  // Engagement inputs
  sessionsLast7Days: number;
  expectedSessionsPerWeek: number;
  avgSessionMinutes: number;
  expectedSessionMinutes: number;
  assignmentsCompleted: number;
  assignmentsAssigned: number;
  daysSinceLastSession: number;
}

export interface BehavioralScores {
  curiosity: number;
  motivation: number;
  engagement: number;
  persistence: number;
}

const safeDiv = (n: number, d: number, fallback = 0) => (d === 0 ? fallback : n / d);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function computeCuriosity(s: BehavioralRawSignals): number {
  const exploration = clamp01(safeDiv(s.exploreClicks, s.exploreOpportunities, 0));
  const challengeSeeking = clamp01(safeDiv(s.voluntaryHarderAttempts, s.totalProblems, 0));
  const inquiry = clamp01(safeDiv(s.freeformQuestions, s.sessions, 0) / 2); // 2 freeform questions/session = max
  const beyond = clamp01(safeDiv(s.beyondAssignedConcepts, s.totalConcepts, 0));
  return clamp01(0.3 * exploration + 0.3 * challengeSeeking + 0.2 * inquiry + 0.2 * beyond);
}

export function computeMotivation(s: BehavioralRawSignals): number {
  const totalIncorrect = s.retriesAfterIncorrect + s.abandonedAfterIncorrect;
  const persistence = clamp01(safeDiv(s.retriesAfterIncorrect, totalIncorrect, 0.5));
  const completion = clamp01(safeDiv(s.sessionsCompleted, s.sessionsStarted, 0.5));
  const resilience = clamp01(safeDiv(s.returnedAfterBadSession, s.badSessions, 0.5));
  const trend = clamp01((s.engagementTrend + 1) / 2); // remap [-1, 1] → [0, 1]
  return clamp01(0.35 * persistence + 0.25 * completion + 0.2 * resilience + 0.2 * trend);
}

export function computeEngagement(s: BehavioralRawSignals): number {
  const frequency = clamp01(safeDiv(s.sessionsLast7Days, s.expectedSessionsPerWeek, 0));
  const duration = clamp01(safeDiv(s.avgSessionMinutes, s.expectedSessionMinutes, 0));
  const completion = clamp01(safeDiv(s.assignmentsCompleted, s.assignmentsAssigned, 0));
  const recency = clamp01(Math.exp(-s.daysSinceLastSession / 5));
  return clamp01(0.25 * frequency + 0.25 * duration + 0.3 * completion + 0.2 * recency);
}

export function computePersistence(s: BehavioralRawSignals): number {
  const totalIncorrect = s.retriesAfterIncorrect + s.abandonedAfterIncorrect;
  const retryRate = clamp01(safeDiv(s.retriesAfterIncorrect, totalIncorrect, 0.5));
  const sessionDuration = clamp01(safeDiv(s.avgSessionMinutes, s.expectedSessionMinutes, 0));
  return clamp01(0.6 * retryRate + 0.4 * sessionDuration);
}

export function computeAllScores(s: BehavioralRawSignals): BehavioralScores {
  return {
    curiosity: computeCuriosity(s),
    motivation: computeMotivation(s),
    engagement: computeEngagement(s),
    persistence: computePersistence(s),
  };
}
