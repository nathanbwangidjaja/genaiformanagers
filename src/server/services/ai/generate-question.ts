/**
 * AI Question Generator — creates a new MC math question for a specific
 * Common Core standard at a given difficulty level.
 */

import { anthropic, MODEL } from "./client";

export interface GenerateQuestionRequest {
  standardCode: string;
  standardName: string;
  standardDescription?: string;
  difficulty: number; // 1.0 - 5.0
  existingQuestionTexts?: string[];
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
}

const SYSTEM = `You write Grade 7 math questions for an adaptive learning platform.

Question requirements:
- Write a single, well-scoped multiple-choice question with exactly 4 options
- The question must clearly target the specified Common Core standard
- Calibrate to the requested difficulty (1=very easy, 3=on grade level, 5=challenging stretch)
- Use real-world contexts when natural; abstract problems when not
- Distractors must be plausible — they reflect common student errors, not random wrong answers
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
- Return ONLY a JSON object matching the schema. No prose before or after.`;

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

  const userMessage = `Generate one multiple-choice question.

Standard: ${req.standardCode} — ${req.standardName}
${req.standardDescription ? `Description: ${req.standardDescription}` : ""}
Difficulty target: ${req.difficulty.toFixed(1)} / 5${avoidBlock}

Return only the JSON object.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: userMessage }],
  });

  for (const block of response.content) {
    if (block.type === "text") {
      const raw = JSON.parse(block.text) as RawGenerated;

      const correctCount = raw.options.filter((o) => o.correct).length;
      if (correctCount !== 1) {
        throw new Error(`Generated question has ${correctCount} correct options (expected 1)`);
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
      };
    }
  }
  throw new Error("No text content in generated question response");
}
