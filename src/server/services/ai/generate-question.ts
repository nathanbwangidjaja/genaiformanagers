/**
 * AI Question Generator — creates a new MC math question for a specific
 * Common Core standard at a given difficulty level.
 */

import { anthropic, MODEL } from "./client";
import { fetchWeatherForSignedArithmetic } from "../external/weather";
import { fetchUsdRates } from "../external/currency";

export interface GenerateQuestionRequest {
  standardCode: string;
  standardName: string;
  standardDescription?: string;
  difficulty: number; // 1.0 - 5.0
  existingQuestionTexts?: string[];
  /**
   * If true, attempt to ground the question in real-time external data
   * (weather for signed-arithmetic standards, currency for proportional
   * reasoning). Falls back gracefully if the API is unreachable.
   */
  useRealWorldContext?: boolean;
}

export interface RealWorldContext {
  kind: "weather" | "currency" | "none";
  injected: string; // The text actually appended to the user message
  source: string; // Citation
}

type ErrorType = "computational" | "conceptual" | "careless" | "notation";

interface RawGenerated {
  text: string;
  options: { value: string; correct: boolean }[];
  hints: string[];
  expectedTimeSec: number;
  // Returned as an array because Claude strict outputs don't allow
  // additionalProperties: <schema> on objects (only `false` is allowed),
  // so a key→value map can't be expressed as a JSON Schema object.
  commonErrors: { value: string; errorType: ErrorType }[];
  difficulty: number;
}

export interface GeneratedQuestion {
  text: string;
  options: { value: string; correct: boolean }[];
  hints: string[];
  expectedTimeSec: number;
  commonErrors: Record<string, ErrorType>; // {wrongAnswer: errorType}
  difficulty: number;
  realWorldContext?: RealWorldContext; // populated when external APIs were used
}

/**
 * Decides which (if any) real-time external API is relevant for a given
 * Common Core standard. Returns "none" if no API is naturally applicable —
 * we'd rather surface that to the teacher than pretend by injecting
 * unrelated data the model would ignore.
 *
 *   Weather (Open-Meteo) — anywhere signed-arithmetic dominates the work:
 *     7.NS.1, 7.NS.1a/b/c/d  (add/subtract rationals)
 *
 *   Currency (open.er-api.com) — anywhere proportional or multiplicative
 *   reasoning naturally maps to a real-world rate:
 *     7.RP.*                  (all proportional reasoning)
 *     7.NS.2, 7.NS.2a/b/c/d  (multiply/divide rationals)
 *     7.NS.3                  (real-world rational ops)
 *     7.EE.3                  (multi-step real-world problems)
 *
 *   None — pure algebraic manipulation, geometry, statistics:
 *     7.EE.1, 7.EE.2, 7.EE.4* (factoring, equation-solving)
 *     7.G.*                   (scale, shapes, angles, area)
 *     7.SP.*                  (probability, sampling)
 */
export function pickExternalSource(
  standardCode: string,
): "weather" | "currency" | "none" {
  if (/^7\.NS\.1/.test(standardCode)) return "weather";
  if (/^7\.RP\./.test(standardCode)) return "currency";
  if (/^7\.NS\.2/.test(standardCode)) return "currency";
  if (/^7\.NS\.3/.test(standardCode)) return "currency";
  if (/^7\.EE\.3/.test(standardCode)) return "currency";
  return "none";
}

async function buildRealWorldContext(
  standardCode: string,
): Promise<RealWorldContext> {
  const kind = pickExternalSource(standardCode);
  if (kind === "weather") {
    const w = await fetchWeatherForSignedArithmetic();
    if (!w) return { kind: "none", injected: "", source: "" };
    const recentList = w.recentHours
      .slice(-12)
      .map((h) => `  ${h.time}: ${h.tempF.toFixed(0)}°F`)
      .join("\n");
    return {
      kind: "weather",
      injected: `\n\nReal-world context (use these actual numbers in your question):
Location: ${w.location}
Current temperature: ${w.current.tempF.toFixed(0)}°F at ${w.current.time}
24-hour swing: high ${w.swingHigh.tempF.toFixed(0)}°F (${w.swingHigh.time}), low ${w.swingLow.tempF.toFixed(0)}°F (${w.swingLow.time})
Recent hourly readings:
${recentList}

Write the question around an actual temperature change between two of these readings. Use the real location name. Cite that the data is from today.`,
      source: w.source,
    };
  }
  if (kind === "currency") {
    const r = await fetchUsdRates();
    if (!r) return { kind: "none", injected: "", source: "" };
    const list = r.rates
      .map((x) => `  1 USD = ${x.rate.toFixed(4)} ${x.code} (${x.name})`)
      .join("\n");
    return {
      kind: "currency",
      injected: `\n\nReal-world context (use these actual rates in your question):
Today's exchange rates (base: USD), as of ${r.asOf}:
${list}

Write the question around converting between USD and one of these currencies. Use the actual rate above (do not round more than 2 decimal places). Frame it as a realistic scenario (travel, online purchase, gift to a relative abroad).`,
      source: r.source,
    };
  }
  return { kind: "none", injected: "", source: "" };
}

const SYSTEM = `You write Grade 7 math questions for an adaptive learning platform.

Question requirements:
- Write a single, well-scoped multiple-choice question with exactly 4 options.
- Ask ONE thing only. Do NOT ask compound questions like "Which expression represents X *and* what is its value?" Pick one — either the expression OR the numeric value, not both.
- The question must clearly target the specified Common Core standard.
- Calibrate to the requested difficulty (1=very easy, 3=on grade level, 5=challenging stretch).
- Use real-world contexts when natural; abstract problems when not.
- Distractors must be plausible AND each must be a fully distinct value from the others — no two options may be syntactically equivalent or numerically equal. Each distractor reflects a different student error pattern, not the same error with different arithmetic.
- For EACH wrong answer, return a commonErrors entry with that wrong answer's value and the error type that produces it:
  - "computational" — student understood the approach but made an arithmetic error
  - "conceptual" — student misunderstood the concept (e.g. added when they should have multiplied)
  - "careless" — student knew it but slipped (sign error, copy mistake)
  - "notation" — student got the right value but in the wrong format
- Provide exactly 2 progressive hints that scaffold without giving away the answer
- Estimate solving time in seconds (30-180 typical, longer for multi-step)

Style:
- Plain text, no LaTeX
- Use "/" for fractions, "*" or "x" for multiplication, "^" for exponents
- Money in dollar format ($7.50)
- One question only — no preamble like "Solve this problem"

Output requirements:
- Return ONLY a JSON object matching this exact shape — no prose, no code fences, no commentary:

{
  "text": "string — the question prompt",
  "options": [
    {"value": "string", "correct": true},
    {"value": "string", "correct": false},
    {"value": "string", "correct": false},
    {"value": "string", "correct": false}
  ],
  "hints": ["string — gentle hint", "string — more direct hint"],
  "expectedTimeSec": 60,
  "commonErrors": [
    {"value": "wrong-option-value", "errorType": "computational|conceptual|careless|notation"}
  ],
  "difficulty": 2.5
}

Critical rules for the options array:
- Exactly 4 entries.
- Exactly one entry has "correct": true. The other three have "correct": false.
- The four "value" strings must all be DISTINCT — no duplicates, no near-duplicates that differ only in spacing or formatting.
- For numeric questions, the four values must be four different numbers. For expression questions, four different expressions.
- The "value" of every wrong option must appear in commonErrors with a matching errorType.`;

const SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string", description: "The question prompt itself" },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          correct: { type: "boolean" },
        },
        required: ["value", "correct"],
        additionalProperties: false,
      },
    },
    hints: {
      type: "array",
      items: { type: "string" },
      description: "Two progressive hints, ordered from gentle to direct",
    },
    expectedTimeSec: { type: "integer", description: "Estimated solve time, 30-180 typical" },
    commonErrors: {
      type: "array",
      description:
        "One entry per WRONG option. The 'value' must exactly match one of the wrong option values above.",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          errorType: {
            type: "string",
            enum: ["computational", "conceptual", "careless", "notation"],
          },
        },
        required: ["value", "errorType"],
        additionalProperties: false,
      },
    },
    difficulty: { type: "number", description: "Calibrated 1.0-5.0" },
  },
  required: ["text", "options", "hints", "expectedTimeSec", "commonErrors", "difficulty"],
  additionalProperties: false,
} as const;

export async function generateQuestion(
  req: GenerateQuestionRequest,
): Promise<GeneratedQuestion> {
  const client = anthropic();

  const avoidBlock =
    req.existingQuestionTexts && req.existingQuestionTexts.length > 0
      ? `\n\nAvoid producing a question too similar to these existing ones in the bank:\n${req.existingQuestionTexts
          .slice(0, 5)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}`
      : "";

  const realWorldCtx = req.useRealWorldContext
    ? await buildRealWorldContext(req.standardCode)
    : { kind: "none" as const, injected: "", source: "" };

  const userMessage = `Generate one multiple-choice question.

Standard: ${req.standardCode} — ${req.standardName}
${req.standardDescription ? `Description: ${req.standardDescription}` : ""}
Difficulty target: ${req.difficulty.toFixed(1)} / 5${avoidBlock}${realWorldCtx.injected}

Return only the JSON object.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  for (const block of response.content) {
    if (block.type === "text") {
      const raw = parseQJson(block.text) as RawGenerated;

      const correctCount = raw.options.filter((o) => o.correct).length;
      if (correctCount !== 1) {
        throw new Error(`Generated question has ${correctCount} correct options (expected 1)`);
      }
      // Reject duplicate option values (the model occasionally produces 3
      // distractors with the same expression but different equals-values,
      // which makes the item effectively 2-choice not 4-choice).
      const valueCounts = new Map<string, number>();
      for (const o of raw.options) {
        const v = o.value.trim();
        valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
      }
      const dupes = [...valueCounts.entries()].filter(([, n]) => n > 1);
      if (dupes.length > 0) {
        throw new Error(
          `Generated question has duplicate option values: ${dupes.map(([v]) => `"${v}"`).join(", ")}`,
        );
      }
      // Also reject when 3+ options share the same arithmetic expression
      // (e.g. "52 + (-11) = 41", "52 + (-11) = 63", "52 + (-11) = -41").
      // Heuristic: strip the part after "=" and check expression duplicates.
      const exprCounts = new Map<string, number>();
      for (const o of raw.options) {
        const left = o.value.split("=")[0]?.trim();
        if (!left) continue;
        exprCounts.set(left, (exprCounts.get(left) ?? 0) + 1);
      }
      const exprDupes = [...exprCounts.entries()].filter(([, n]) => n > 2);
      if (exprDupes.length > 0) {
        throw new Error(
          `Generated question has ${exprDupes[0][1]} options sharing the same expression "${exprDupes[0][0]}" — distractors are too similar.`,
        );
      }

      // Convert commonErrors array into the {value: errorType} map our DB stores
      const commonErrors: Record<string, ErrorType> = {};
      for (const ce of raw.commonErrors ?? []) {
        commonErrors[ce.value] = ce.errorType;
      }

      return {
        text: raw.text,
        options: raw.options,
        hints: raw.hints,
        expectedTimeSec: raw.expectedTimeSec,
        commonErrors,
        difficulty: raw.difficulty,
        realWorldContext:
          realWorldCtx.kind !== "none" ? realWorldCtx : undefined,
      };
    }
  }
  throw new Error("No text content in generated question response");
}

function parseQJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}
