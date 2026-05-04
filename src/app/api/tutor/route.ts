import { NextResponse } from "next/server";
import { z } from "zod";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import { streamTutor } from "@/server/services/ai/tutor";

const Schema = z.object({
  question: z.object({
    text: z.string(),
    code: z.string(),
    difficulty: z.number(),
    options: z
      .array(z.object({ value: z.string(), correct: z.boolean() }))
      .optional(),
  }),
  mastery: z.number().min(0).max(1),
  userMessage: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
  studentName: z.string().optional(),
});

export async function POST(req: Request) {
  if (!ANTHROPIC_ENABLED) {
    return NextResponse.json(aiNotConfiguredError(), { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Stream plain text deltas back to the client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamTutor(parsed.data)) {
          controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (e) {
        console.error("tutor stream failed", e);
        const msg = e instanceof Error ? e.message : "tutor failed";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
