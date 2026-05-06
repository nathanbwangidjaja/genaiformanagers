/**
 * Measures the actual prompt sizes (system + user) for every AI feature in the
 * codebase, by reconstructing the exact strings each service builds before
 * calling the Anthropic API.
 *
 * The API itself was unavailable for a live run (test account out of credits),
 * so we measure character / word / estimated-token counts directly off the
 * production prompt source. Token estimate uses 4.0 chars/token (Anthropic's
 * tokenizer is in this range for English; JSON-heavy outputs trend ~3.5).
 *
 * We also build representative output samples (~the right length and shape)
 * to estimate output tokens.
 *
 *   npx tsx scripts/ai-e2e-measure.ts
 */

import fs from "node:fs";
import path from "node:path";

const CHARS_PER_TOKEN_TEXT = 4.0;
const CHARS_PER_TOKEN_JSON = 3.5;

function tk(s: string, json = false) {
  const cpt = json ? CHARS_PER_TOKEN_JSON : CHARS_PER_TOKEN_TEXT;
  return Math.round(s.length / cpt);
}

// =====================================================================
// Reconstruct each service's prompt exactly (lifted from source files).
// =====================================================================

const TUTOR_SYSTEM = `You are a patient, encouraging Grade 7 math tutor named Cortex.

Your job is to help the student understand the math — never just give them the answer.

How to teach:
- Ask Socratic questions that lead the student toward the insight
- Reference the student's specific work when possible
- Keep explanations short and conversational — 2-3 sentences typically
- Use plain language, not jargon
- If the student is confused, scaffold: break the problem into smaller pieces
- Calibrate to the student's mastery level (provided in the user message context):
  - Low mastery (under 30%): focus on fundamentals, use concrete examples, be especially encouraging
  - Medium mastery (30-70%): help them see the pattern they're missing, ask "what would happen if…" questions
  - High mastery (over 70%): challenge them with the why behind the rule, connect to other concepts

Style:
- Warm, age-appropriate, never condescending
- Use math notation sparingly. Prefer plain text like "1/2" over "$\\frac{1}{2}$"
- Never reveal the multiple-choice answer letter directly. If they're stuck, hint at the approach.
- If asked an off-topic question (not math-related), gently redirect: "Let's focus on this problem first — we can chat about that another time."

Format:
- Plain text. No markdown headers, no bullet lists, no bold.
- Just conversational prose, like a tutor sitting next to them.`;

const LESSON_PLAN_SYSTEM = `You are an expert middle-school math instructional designer.

You produce concrete, classroom-ready lesson plans for Grade 7 math teachers based on class-wide mastery data.

Lesson plan principles:
- Target the 1-3 concepts where the most students are struggling
- Connect to prior knowledge — name the prerequisite concepts students likely missed
- Front-load with a quick concrete example or visual model, not a formula
- Include both teacher-led explanation and student practice
- Keep total time to 15-25 minutes — this is a mini-lesson, not a full class
- Be specific and actionable: "draw a number line from -10 to 10" not "use a visual aid"
- Use Common Core terminology where appropriate

Output requirements:
- Return ONLY a JSON object matching the provided schema. No prose before or after.
- Title should be specific and inviting, not generic. Bad: "Math Lesson". Good: "Why Subtracting a Negative Adds: A 15-Minute Number Line Lesson".
- Each section should have 1-3 specific activities. Activities should be imperatives a teacher can read aloud or follow step by step.
- Success criteria are observable: "students can solve 4 of 5 practice problems" not "students understand".`;

const INSIGHT_SYSTEM = `You are an experienced middle-school math instructional coach.

You receive structured data about a student — mastery, behavioral scores, cognitive traits, error patterns, tutor question patterns — and produce a short brief for their teacher.

Style:
- Direct, observational, never patronizing
- Treat the student as a whole person, not a dashboard
- Tie observations to specific evidence in the data when possible
- Avoid jargon — say "she asks a lot of 'why' questions" not "high inquiry-style score"
- Don't repeat numbers the teacher already sees on the page; interpret them

Format requirements:
- summary: 2-3 sentences, plain prose. Captures the most interesting/actionable thing about this student RIGHT NOW.
- highlights: 3-5 specific observations. Each tagged as strength / risk / curiosity / growth.
- recommendations: 1-3 concrete teaching actions. Each with a brief "why" tied to the evidence.

Return ONLY a JSON object matching the schema. No prose outside.`;

const QUESTION_SYSTEM = `You write Grade 7 math questions for an adaptive learning platform.

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

const CLASSIFY_SYSTEM = `You classify Grade 7 student messages to a math tutor.

Categories — pick the SINGLE best one:
- conceptual_why: asking about the underlying logic / "why does this work?"
- procedural_how: asking what step to do next / how to compute something
- clarification: asking what a term, symbol, or part of the question means
- verification: showing their work and checking if it's right
- expressing_understanding: signaling they figured it out ("oh I get it", "that makes sense")
- expressing_confusion: signaling general confusion or frustration without a specific question
- off_topic: not about the current math problem

Return ONLY a JSON object: {"intent": "<category>", "confidence": <0-1>}.`;

// =====================================================================
// Realistic user-message bodies (what the services actually build)
// =====================================================================

const insightUserMsg = `Student: Student A
Window: last 30 days
Total attempts: 47
Overall mastery: 58%

Behavioral scores (0-1):
- Curiosity: 0.72
- Motivation: 0.55
- Engagement: 0.81
- Persistence: 0.43
- Flow state index: 0.61

Cognitive traits inferred:
- Perseverance after failure (value 0.42): abandons problem after 1.3 incorrect attempts on average vs class avg 2.1
- Self-directed exploration (value 0.78): attempted 5 problems beyond assigned scope this week

Concept breakdown:
- 7.NS.1d Add/subtract rationals using properties of operations: mastery 31%, conceptual, 12 attempts, dominant error: sign error in subtraction
- 7.RP.2a Decide whether two quantities are in proportional relationship: mastery 84%, minor, 8 attempts
- 7.EE.4a Solve word problems leading to equations of form px+q=r: mastery 45%, conceptual, 15 attempts, dominant error: translates English to expression incorrectly
- 7.G.1 Solve problems involving scale drawings: mastery 67%, minor, 6 attempts

Tutor question patterns: conceptual_why: 4, procedural_how: 9, clarification: 2, verification: 3

Produce the JSON brief.`;

const lessonUserMsg = `Class: Period 3 Pre-Algebra
Total students: 24

Concepts where the class needs the most help (weakest first):
- 7.NS.1d Add/subtract rationals using properties of operations (The Number System) — class avg 42%, 16/24 struggling
- 7.EE.4a Solve word problems leading to equations of form px+q=r (Expressions and Equations) — class avg 51%, 12/24 struggling
- 7.NS.2c Apply properties of operations to multiply rational numbers (The Number System) — class avg 55%, 11/24 struggling
- 7.RP.2c Represent proportional relationships by equations (Ratios and Proportional Relationships) — class avg 59%, 9/24 struggling
- 7.G.4 Know the formulas for the area and circumference of a circle (Geometry) — class avg 63%, 7/24 struggling
- 7.SP.5 Understand probability of a chance event (Statistics & Probability) — class avg 71%, 4/24 struggling

Produce a single 15-25 minute mini-lesson plan that targets the 1-3 most impactful concepts above. Pick concepts that have shared prerequisites if possible. Return only the JSON object.`;

const lessonUserMsgTargeted = lessonUserMsg + `\n\nTeacher focus notes: 20 minutes only. Focus only on 7.NS.1d. No group work. Opener for the week, so keep energy high.`;

const questionUserMsg = `Generate one multiple-choice question.

Standard: 7.NS.1d — Add/subtract rationals using properties of operations
Description: Apply properties of operations as strategies to add and subtract rational numbers.
Difficulty target: 2.5 / 5

Return only the JSON object.`;

const tutorContextBlock = `# Current problem
Standard: 7.NS.1d
Difficulty: 2.0 / 5
Question: Compute: 7 - (-3) = ?
Answer choices:
  A. 4
  B. 10
  C. -10
  D. -4

# Student context
Name: Student A
Current mastery on this concept: 31% (low — they're just getting started with this concept)

# Student's question
wait why do you flip the sign when you subtract a negative`;

const classifyUserMsg = `Question being worked on: Compute: 7 - (-3) = ?

Student message to tutor: "wait why do you flip the sign when you subtract a negative"

Classify the student's intent. Return only the JSON.`;

// =====================================================================
// Representative outputs (typical sizes the model produces).
// Lengths calibrated against the JSON schemas defined in each service.
// =====================================================================

const sampleInsightOutput = JSON.stringify({
  summary: "Student A is curious and explores beyond what's assigned, but gives up quickly when problems push back — she abandons after roughly one wrong try where the class average is two. The most actionable issue right now is sign handling in rational-number subtraction (7.NS.1d), which is dragging down work she'd otherwise have the conceptual base to do.",
  highlights: [
    { type: "strength", text: "Strong proportional-reasoning instincts — 84% mastery on 7.RP.2a with light practice." },
    { type: "risk", text: "Sign errors in subtraction with negatives are her dominant failure mode on 7.NS.1d." },
    { type: "curiosity", text: "Voluntarily attempted five problems beyond the assigned set this week." },
    { type: "growth", text: "Asks more 'how do I do this' than 'why does this work' — opportunity to nudge toward conceptual questions." },
  ],
  recommendations: [
    { action: "Pair her with a 7.NS.1d-only practice set framed around a number line, before moving to 7.EE.4a word problems.", why: "Her word-problem errors trace back to expression construction, which leans on the same sign rules she's missing." },
    { action: "When she gives up, prompt with a single 'what would you try next?' rather than a hint.", why: "Her perseverance score is well below class average; the goal is building the muscle, not solving the problem for her." },
  ],
}, null, 2);

const sampleLessonPlanOutput = JSON.stringify({
  title: "Why Subtracting a Negative Adds: A 20-Minute Number Line Opener",
  targetConcepts: [{ code: "7.NS.1d", name: "Add/subtract rationals using properties of operations" }],
  durationMinutes: 20,
  summary: "A high-energy week-opener that builds a concrete number-line model for subtracting negatives, attacking the class's weakest concept (42% average mastery, 16 of 24 struggling). Avoids group work; keeps every student individually engaged with mini-whiteboards. Connects forward to next week's expressions unit.",
  sections: [
    {
      heading: "Hook: the impossible jump (3 min)",
      durationMinutes: 3,
      description: "Show a number line from -10 to 10 on the board. Place a frog at 7. Tell the class the frog needs to get to 10. Ask: how far does it jump?",
      activities: [
        "Draw the number line, label every integer.",
        "Take three quick student answers without correction.",
        "Re-pose: 'What if I told you the frog jumped backwards by negative three? Same answer?'",
      ],
    },
    {
      heading: "Build the rule with movement (8 min)",
      durationMinutes: 8,
      description: "Walk through three guided examples that anchor 'subtracting a negative = adding a positive' to direction on the number line.",
      activities: [
        "On mini-whiteboards, students draw 7 - 3 = 4 as a leftward jump.",
        "Then 7 - (-3): pose the question, let them try, then model 'subtracting negative means flipping the direction.'",
        "Repeat with -2 - (-5). Have students hold up boards; cold-call two to explain their jump.",
      ],
    },
    {
      heading: "Independent reps (7 min)",
      durationMinutes: 7,
      description: "Five problems on individual whiteboards, ascending difficulty. Walk the room.",
      activities: [
        "Problems: 4 - (-1), -3 - (-7), 0 - (-9), -5 - 3, -8 - (-8).",
        "Student must show the number-line jump for the first three; just the answer for the last two.",
        "Stop at 7 minutes regardless. Collect boards for spot-check.",
      ],
    },
    {
      heading: "Exit ticket (2 min)",
      durationMinutes: 2,
      description: "Single question on a half-sheet to close.",
      activities: [
        "'Explain in one sentence why 5 - (-2) is bigger than 5.'",
        "Collect at the door.",
      ],
    },
  ],
  practiceProblemSuggestions: [
    { code: "7.NS.1d", description: "Compute: -4 - (-9). Show your number-line reasoning.", difficulty: "Easy" },
    { code: "7.NS.1d", description: "A submarine is at -120 ft. It rises by -(-30) ft. Where is it now?", difficulty: "Medium" },
    { code: "7.NS.1d", description: "Simplify: -(-(-7)) - (-(-7)). Explain each step.", difficulty: "Hard" },
  ],
  successCriteria: [
    "Students can correctly compute 4 of 5 independent-rep problems.",
    "Students can articulate the rule 'subtracting a negative is adding the positive' in their own words on the exit ticket.",
    "Students draw a correct directional jump for at least the first three rep problems.",
  ],
}, null, 2);

const sampleQuestionOutput = JSON.stringify({
  text: "A diver is at -45 feet (45 feet below sea level). She descends another -12 feet (12 more feet down). Then she rises 8 feet. What is her new depth, in feet, relative to sea level?",
  options: [
    { value: "-49", correct: true },
    { value: "-65", correct: false },
    { value: "-25", correct: false },
    { value: "49", correct: false },
  ],
  hints: [
    "Think about which direction each movement goes on a number line — descending is negative, rising is positive.",
    "Add the three signed values in order: start + descent + rise.",
  ],
  expectedTimeSec: 90,
  commonErrors: [
    { value: "-65", errorType: "conceptual" },
    { value: "-25", errorType: "computational" },
    { value: "49", errorType: "notation" },
  ],
  difficulty: 2.5,
}, null, 2);

const sampleTutorOutput =
  "Good question — that's the part most students stumble on. Picture a number line: when you subtract a positive, you walk left. So what direction would 'undoing' that walk go? Try 7 - (-3) as a left-walk that gets reversed, and tell me what number you land on.";

const sampleClassifyOutput = `{"intent": "conceptual_why", "confidence": 0.93}`;

// =====================================================================
// REPORT
// =====================================================================

interface Row {
  call: string;
  systemChars: number;
  systemTok: number;
  userChars: number;
  userTok: number;
  outChars: number;
  outTok: number;
}

const rows: Row[] = [
  {
    call: "student-insight",
    systemChars: INSIGHT_SYSTEM.length,
    systemTok: tk(INSIGHT_SYSTEM),
    userChars: insightUserMsg.length,
    userTok: tk(insightUserMsg),
    outChars: sampleInsightOutput.length,
    outTok: tk(sampleInsightOutput, true),
  },
  {
    call: "lesson-plan (initial)",
    systemChars: LESSON_PLAN_SYSTEM.length,
    systemTok: tk(LESSON_PLAN_SYSTEM),
    userChars: lessonUserMsg.length,
    userTok: tk(lessonUserMsg),
    outChars: sampleLessonPlanOutput.length,
    outTok: tk(sampleLessonPlanOutput, true),
  },
  {
    call: "lesson-plan (regenerate w/ focus notes)",
    systemChars: LESSON_PLAN_SYSTEM.length,
    systemTok: tk(LESSON_PLAN_SYSTEM),
    userChars: lessonUserMsgTargeted.length,
    userTok: tk(lessonUserMsgTargeted),
    outChars: sampleLessonPlanOutput.length,
    outTok: tk(sampleLessonPlanOutput, true),
  },
  {
    call: "generate-question",
    systemChars: QUESTION_SYSTEM.length,
    systemTok: tk(QUESTION_SYSTEM),
    userChars: questionUserMsg.length,
    userTok: tk(questionUserMsg),
    outChars: sampleQuestionOutput.length,
    outTok: tk(sampleQuestionOutput, true),
  },
  {
    call: "tutor (single turn, streaming)",
    systemChars: TUTOR_SYSTEM.length,
    systemTok: tk(TUTOR_SYSTEM),
    userChars: tutorContextBlock.length,
    userTok: tk(tutorContextBlock),
    outChars: sampleTutorOutput.length,
    outTok: tk(sampleTutorOutput),
  },
  {
    call: "classify-tutor-message",
    systemChars: CLASSIFY_SYSTEM.length,
    systemTok: tk(CLASSIFY_SYSTEM),
    userChars: classifyUserMsg.length,
    userTok: tk(classifyUserMsg),
    outChars: sampleClassifyOutput.length,
    outTok: tk(sampleClassifyOutput, true),
  },
];

console.log("\n=== PER-CALL TOKEN ESTIMATES (system | user | output) ===\n");
console.log(
  ["call", "sys_chars", "sys_tok", "user_chars", "user_tok", "out_chars", "out_tok"]
    .map((s) => s.padEnd(12))
    .join(""),
);
for (const r of rows) {
  console.log(
    [
      r.call,
      r.systemChars,
      r.systemTok,
      r.userChars,
      r.userTok,
      r.outChars,
      r.outTok,
    ]
      .map((v) => String(v).padEnd(12))
      .join(""),
  );
}

// ----- Simulate one full E2E "Monday-ready lesson plan" task -----
// Inferred call sequence from the UI flow: see scripts/ai-e2e-bench.ts
const calls = [
  { call: "student-insight (24 students × 1 cached after first)", count: 24, src: rows[0] },
  { call: "lesson-plan initial (1)", count: 1, src: rows[1] },
  { call: "lesson-plan regenerate (1.5 avg)", count: 1.5, src: rows[2] },
  { call: "generate-question (3 per lesson)", count: 3, src: rows[3] },
];

let inputTokensTotal = 0; // un-cached input
let cacheReadTotal = 0; // cached input (system on calls 2..N)
let outputTokensTotal = 0;

for (const c of calls) {
  // First call of each kind pays full system; rest read from cache
  inputTokensTotal += c.src.systemTok + c.src.userTok * c.count; // first user pays system once
  // Subtract: for each call beyond the first, system is cache-read
  if (c.count > 1) {
    inputTokensTotal -= c.src.systemTok * (c.count - 1);
    cacheReadTotal += c.src.systemTok * (c.count - 1);
  }
  outputTokensTotal += c.src.outTok * c.count;
}

console.log("\n=== ONE FULL TEACHER TASK (lesson-plan flow w/ insight refresh) ===");
console.log(`Total calls:           ${calls.reduce((a, c) => a + c.count, 0)}`);
console.log(`Uncached input tokens: ${Math.round(inputTokensTotal)}`);
console.log(`Cache-read tokens:     ${Math.round(cacheReadTotal)}`);
console.log(`Output tokens:         ${Math.round(outputTokensTotal)}`);

const cost =
  (inputTokensTotal / 1e6) * 3 + (cacheReadTotal / 1e6) * 0.3 + (outputTokensTotal / 1e6) * 15;
console.log(`Approx Sonnet 4.6 cost: $${cost.toFixed(4)} per teacher per E2E run`);
