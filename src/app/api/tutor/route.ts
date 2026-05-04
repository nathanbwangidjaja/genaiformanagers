import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ANTHROPIC_ENABLED, aiNotConfiguredError } from "@/server/services/ai/client";
import { streamTutor } from "@/server/services/ai/tutor";
import { classifyTutorMessage } from "@/server/services/ai/classify-tutor-message";
import { prisma } from "@/server/db";
import { upsertNode, addEdge, getOrCreateConceptNode, patchNodeProps } from "@/server/services/kg/store";

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
  // Optional context for persistence — present when called from a real session
  studentProfileId: z.string().optional(),
  questionId: z.string().optional(),
  curriculumNodeId: z.string().optional(),
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

  // Persist the message + classify it asynchronously. Don't block streaming
  // on this — the user shouldn't wait for a classifier round-trip.
  if (parsed.data.studentProfileId) {
    void persistAndClassify(parsed.data);
  }

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

async function persistAndClassify(data: z.infer<typeof Schema>) {
  if (!data.studentProfileId) return;
  const studentId = data.studentProfileId;

  // 1. Always log to InteractionEvent (audit trail + replay)
  let evtId: string;
  try {
    const evt = await prisma.interactionEvent.create({
      data: {
        studentId,
        questionId: data.questionId,
        eventType: "tutor_message",
        payload: {
          text: data.userMessage,
          curriculumNodeId: data.curriculumNodeId,
          questionCode: data.question.code,
          questionDifficulty: data.question.difficulty,
          intent: "pending",
          confidence: 0,
        } as Prisma.InputJsonValue,
      },
    });
    evtId = evt.id;
  } catch (e) {
    console.warn("failed to persist tutor_message event", e);
    return;
  }

  // 2. Create the tutor_message KG node immediately (with intent=pending)
  let kgNodeId: string | null = null;
  try {
    const kgNode = await upsertNode({
      studentId,
      type: "tutor_message",
      label: data.userMessage.slice(0, 60),
      props: {
        text: data.userMessage,
        intent: "pending",
        confidence: 0,
        questionCode: data.question.code,
      },
    });
    kgNodeId = kgNode.id;

    // Link to the concept they asked about
    if (data.curriculumNodeId) {
      const curriculum = await prisma.curriculumNode.findUnique({
        where: { id: data.curriculumNodeId },
      });
      if (curriculum) {
        const conceptNode = await getOrCreateConceptNode(studentId, data.curriculumNodeId, {
          code: curriculum.code,
          name: curriculum.name,
          domain: curriculum.domain,
        });
        await addEdge(studentId, kgNode.id, conceptNode.id, "asked_about");
      }
    }
  } catch (e) {
    console.warn("failed to persist tutor_message KG node", e);
  }

  // 3. Classify intent in background, then patch both event + KG node
  try {
    const cls = await classifyTutorMessage(data.userMessage, data.question.text);
    await prisma.interactionEvent.update({
      where: { id: evtId },
      data: {
        payload: {
          text: data.userMessage,
          curriculumNodeId: data.curriculumNodeId,
          questionCode: data.question.code,
          questionDifficulty: data.question.difficulty,
          intent: cls.intent,
          confidence: cls.confidence,
        } as Prisma.InputJsonValue,
      },
    });
    if (kgNodeId) {
      await patchNodeProps(kgNodeId, {
        intent: cls.intent,
        confidence: cls.confidence,
      });
      // Add additional edges based on intent
      if (data.curriculumNodeId) {
        const conceptNode = await prisma.kGNode.findUnique({
          where: {
            studentId_type_externalKey: {
              studentId,
              type: "concept",
              externalKey: data.curriculumNodeId,
            },
          },
        });
        if (conceptNode) {
          if (cls.intent === "expressing_confusion") {
            await addEdge(studentId, kgNodeId, conceptNode.id, "confused_about");
          } else if (cls.intent === "expressing_understanding") {
            await addEdge(studentId, kgNodeId, conceptNode.id, "understood");
          }
        }
      }
    }
  } catch (e) {
    console.warn("classification failed", e);
  }
}
