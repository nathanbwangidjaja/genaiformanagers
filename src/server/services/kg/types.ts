/**
 * Knowledge graph type vocabulary. The Prisma KGNode/KGEdge tables store
 * `type` as a string; these constants are the source of truth for valid
 * values. Use these everywhere instead of raw strings to keep the graph
 * vocabulary consistent.
 */

export const NODE_TYPES = {
  CONCEPT: "concept",
  ATTEMPT: "attempt",
  QUESTION: "question",
  TUTOR_MESSAGE: "tutor_message",
  MISCONCEPTION: "misconception",
  STRENGTH: "strength",
  CURIOSITY_THREAD: "curiosity_thread",
  BEHAVIOR: "behavior",
  TRAIT: "trait",
  SESSION: "session",
  INSIGHT: "insight",
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const EDGE_TYPES = {
  PRACTICED_IN: "practiced_in",
  INSTANCE_OF: "instance_of",
  TESTED_BY: "tested_by",
  PREREQUISITE_OF: "prerequisite_of",
  ASKED_ABOUT: "asked_about",
  EVIDENCES: "evidences",
  DEMONSTRATES: "demonstrates",
  MANIFESTS_IN: "manifests_in",
  CONTRIBUTES_TO: "contributes_to",
  DURING: "during",
  CONFUSED_ABOUT: "confused_about",
  UNDERSTOOD: "understood",
  REFERENCES: "references",
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

// ===== Per-type prop shapes (TypeScript-only — DB stores as JSON) =====

export interface ConceptNodeProps {
  code: string;
  name: string;
  domain: string;
  // Cached BKT aggregate; updated atomically with each new attempt edge
  mastery: number;
  confidence: number;
  totalAttempts: number;
  correctAttempts: number;
  hintRate: number;
  streak: number;
  avgTimePerQuestionSec?: number;
  lastPracticedAt?: string; // ISO
  weaknessCategory?:
    | "SOLID"
    | "MEMORIZED_FRAGILE"
    | "CONCEPTUALLY_WEAK"
    | "PROCEDURALLY_WEAK"
    | "CARELESS"
    | "UNTESTED";
  flowFraction?: number;
  errorPatternCounts?: Record<string, number>;
}

export interface AttemptNodeProps {
  isCorrect: boolean;
  timeMs: number;
  hintsUsed: number;
  errorType?: string | null;
  difficulty?: number;
  inFlow?: boolean;
}

export interface QuestionNodeProps {
  questionId: string;
  text: string;
  difficulty: number;
  format?: string;
}

export interface TutorMessageProps {
  text: string;
  intent: string;
  confidence: number;
}

export interface MisconceptionProps {
  errorType: string;
  conceptId: string;
  occurrences: number;
  firstSeenAt: string;
}

export interface StrengthProps {
  conceptId: string;
  evidenceType: "streak" | "fast_correct" | "no_hints";
}

export interface CuriosityThreadProps {
  topic: string;
  messageCount: number;
}

export interface BehaviorProps {
  kind:
    | "curiosity"
    | "motivation"
    | "engagement"
    | "persistence"
    | "flow";
  value: number;
  signals: Record<string, number>;
}

export interface TraitProps {
  name: string;
  label: string;
  value: number;
  confidence: number;
  evidence: string;
}

export interface InsightProps {
  summary: string;
  highlights: { type: string; text: string }[];
  recommendations: { action: string; why: string }[];
  modelInputHash: string;
}

export interface SessionProps {
  startedAt: string;
  endedAt?: string;
  type: string;
}

export type AnyNodeProps =
  | ConceptNodeProps
  | AttemptNodeProps
  | QuestionNodeProps
  | TutorMessageProps
  | MisconceptionProps
  | StrengthProps
  | CuriosityThreadProps
  | BehaviorProps
  | TraitProps
  | InsightProps
  | SessionProps;
