/**
 * Per-concept weakness classifier.
 *
 * Goes beyond mastery % to characterize WHY a student is where they are
 * on a given concept. Combines mastery + dominant error type + hint usage
 * + flow fraction.
 *
 * Categories:
 *   SOLID                — high mastery (≥0.7), low hints (<0.3), few conceptual errors
 *   MEMORIZED_FRAGILE    — high mastery (≥0.7) BUT high hint dependence (>0.5) — passes when scaffolded
 *   CONCEPTUALLY_WEAK    — low mastery (<0.5) + dominant error type is conceptual — needs reteaching
 *   PROCEDURALLY_WEAK    — low mastery + dominant error is computational — needs practice
 *   CARELESS             — mid mastery (0.4-0.7) + dominant error is careless
 *   UNTESTED             — < 3 attempts; not enough signal
 */

import type { WeaknessCategory } from "@prisma/client";

export interface WeaknessInput {
  masteryLevel: number; // 0-1
  totalAttempts: number;
  hintUsageRate: number; // 0-1
  errorPatternCounts: Record<string, number>;
  flowFraction: number; // 0-1
}

export function classifyWeakness(w: WeaknessInput): WeaknessCategory {
  if (w.totalAttempts < 3) return "UNTESTED";

  const totalErrs = Object.values(w.errorPatternCounts).reduce((a, b) => a + b, 0);
  const dominant = Object.entries(w.errorPatternCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantType = dominant?.[0];
  const dominantFrac = dominant && totalErrs > 0 ? dominant[1] / totalErrs : 0;

  if (w.masteryLevel >= 0.7) {
    if (w.hintUsageRate > 0.5) return "MEMORIZED_FRAGILE";
    return "SOLID";
  }

  if (w.masteryLevel < 0.5) {
    if (dominantType === "conceptual" && dominantFrac > 0.4) return "CONCEPTUALLY_WEAK";
    if (dominantType === "computational" && dominantFrac > 0.4) return "PROCEDURALLY_WEAK";
    // Default for low mastery without clear pattern → conceptual (the safer default to flag)
    return "CONCEPTUALLY_WEAK";
  }

  // Mid mastery
  if (dominantType === "careless" && dominantFrac > 0.4) return "CARELESS";
  return "UNTESTED";
}

export const WEAKNESS_LABELS: Record<WeaknessCategory, { label: string; tone: string; advice: string }> = {
  SOLID: {
    label: "Solid",
    tone: "green",
    advice: "Push them with a stretch problem to keep them in flow.",
  },
  MEMORIZED_FRAGILE: {
    label: "Memorized but fragile",
    tone: "amber",
    advice: "Test recall without hints — they may not retain this independently.",
  },
  CONCEPTUALLY_WEAK: {
    label: "Conceptual gap",
    tone: "red",
    advice: "Re-teach with a concrete model or visual. Don't drill more practice yet.",
  },
  PROCEDURALLY_WEAK: {
    label: "Needs practice",
    tone: "orange",
    advice: "Repetition will help. Time-pressured drill or worked examples.",
  },
  CARELESS: {
    label: "Careless errors",
    tone: "violet",
    advice: "Encourage check-your-work strategy. They know it; they're rushing.",
  },
  UNTESTED: {
    label: "Not enough data",
    tone: "zinc",
    advice: "Need more attempts to characterize.",
  },
};
