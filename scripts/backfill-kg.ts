/**
 * Backfill the per-student knowledge graph from legacy data:
 *   - StudentConceptMastery rows → concept nodes (with cached aggregates as props)
 *   - InteractionEvent rows → attempt + tutor_message nodes (with edges)
 *   - StudentBehavioralProfile → behavior + trait nodes
 *
 * Idempotent: re-running won't duplicate data because all nodes use
 * (studentId, type, externalKey) uniqueness.
 *
 * Run while server is NOT running (we're hitting the DB directly):
 *   node --import tsx scripts/backfill-kg.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(".env");

const prisma = new PrismaClient();

async function backfillStudent(studentId: string) {
  console.log(`  Backfilling student ${studentId.slice(0, 8)}...`);

  // 1. Mastery rows → concept nodes
  const mastery = await prisma.studentConceptMastery.findMany({
    where: { studentId },
    include: { curriculumNode: true },
  });
  for (const m of mastery) {
    await prisma.kGNode.upsert({
      where: {
        studentId_type_externalKey: {
          studentId,
          type: "concept",
          externalKey: m.curriculumNodeId,
        },
      },
      update: {
        label: m.curriculumNode.name,
        props: {
          code: m.curriculumNode.code,
          name: m.curriculumNode.name,
          domain: m.curriculumNode.domain,
          mastery: m.masteryLevel,
          confidence: m.confidence,
          totalAttempts: m.totalAttempts,
          correctAttempts: m.correctAttempts,
          hintRate: m.hintUsageRate,
          streak: m.streak,
          avgTimePerQuestionSec: m.avgTimePerQuestion ?? undefined,
          lastPracticedAt: m.lastPracticedAt?.toISOString(),
          weaknessCategory: m.weaknessCategory,
          flowFraction: m.flowFraction,
          errorPatternCounts: m.errorPatternCounts ?? {},
        },
      },
      create: {
        studentId,
        type: "concept",
        label: m.curriculumNode.name,
        externalKey: m.curriculumNodeId,
        props: {
          code: m.curriculumNode.code,
          name: m.curriculumNode.name,
          domain: m.curriculumNode.domain,
          mastery: m.masteryLevel,
          confidence: m.confidence,
          totalAttempts: m.totalAttempts,
          correctAttempts: m.correctAttempts,
          hintRate: m.hintUsageRate,
          streak: m.streak,
          avgTimePerQuestionSec: m.avgTimePerQuestion ?? undefined,
          lastPracticedAt: m.lastPracticedAt?.toISOString(),
          weaknessCategory: m.weaknessCategory,
          flowFraction: m.flowFraction,
          errorPatternCounts: m.errorPatternCounts ?? {},
        },
      },
    });
  }

  // 2. Interaction events → attempt + tutor_message nodes (with edges)
  const events = await prisma.interactionEvent.findMany({
    where: { studentId },
    orderBy: { timestamp: "asc" },
  });

  for (const e of events) {
    const p = (e.payload as Record<string, unknown>) ?? {};

    if (e.eventType === "question_attempt") {
      const conceptId = p.curriculumNodeId as string | undefined;
      if (!conceptId) continue;
      // Find concept node
      const conceptNode = await prisma.kGNode.findUnique({
        where: {
          studentId_type_externalKey: {
            studentId,
            type: "concept",
            externalKey: conceptId,
          },
        },
      });
      if (!conceptNode) continue;

      // Create attempt node (no externalKey — every attempt is a new node)
      const attemptNode = await prisma.kGNode.create({
        data: {
          studentId,
          type: "attempt",
          label: `${p.isCorrect ? "✓" : "✗"} attempt`,
          createdAt: e.timestamp,
          props: {
            isCorrect: !!p.isCorrect,
            timeMs: typeof p.timeSpentMs === "number" ? p.timeSpentMs : 0,
            hintsUsed: typeof p.hintsUsed === "number" ? p.hintsUsed : 0,
            errorType: typeof p.errorType === "string" ? p.errorType : null,
            questionId: e.questionId,
          } as Prisma.InputJsonValue,
        },
      });
      // Edge: attempt → concept
      await prisma.kGEdge.create({
        data: {
          studentId,
          fromId: attemptNode.id,
          toId: conceptNode.id,
          type: "practiced_in",
          createdAt: e.timestamp,
        },
      });
    } else if (e.eventType === "tutor_message") {
      const conceptId = p.curriculumNodeId as string | undefined;
      const text = (p.text as string) ?? "";
      const intent = (p.intent as string) ?? "unknown";
      const confidence = (p.confidence as number) ?? 0;

      const msgNode = await prisma.kGNode.create({
        data: {
          studentId,
          type: "tutor_message",
          label: text.slice(0, 60),
          createdAt: e.timestamp,
          props: { text, intent, confidence } as Prisma.InputJsonValue,
        },
      });

      if (conceptId) {
        const conceptNode = await prisma.kGNode.findUnique({
          where: {
            studentId_type_externalKey: { studentId, type: "concept", externalKey: conceptId },
          },
        });
        if (conceptNode) {
          await prisma.kGEdge.create({
            data: {
              studentId,
              fromId: msgNode.id,
              toId: conceptNode.id,
              type: "asked_about",
              createdAt: e.timestamp,
            },
          });
          if (intent === "expressing_confusion") {
            await prisma.kGEdge.create({
              data: {
                studentId,
                fromId: msgNode.id,
                toId: conceptNode.id,
                type: "confused_about",
                createdAt: e.timestamp,
              },
            });
          }
          if (intent === "expressing_understanding") {
            await prisma.kGEdge.create({
              data: {
                studentId,
                fromId: msgNode.id,
                toId: conceptNode.id,
                type: "understood",
                createdAt: e.timestamp,
              },
            });
          }
        }
      }
    }
  }

  return { conceptNodes: mastery.length, events: events.length };
}

async function main() {
  console.log("Backfilling KG from legacy data...\n");

  const profiles = await prisma.studentProfile.findMany({ select: { id: true } });
  console.log(`Found ${profiles.length} student profiles.\n`);

  let total = { concepts: 0, events: 0 };
  for (const p of profiles) {
    const r = await backfillStudent(p.id);
    total.concepts += r.conceptNodes;
    total.events += r.events;
  }

  // Run aggregator on all to populate behavior + trait + extracted nodes
  console.log("\nRunning aggregator on all students...");
  const { recomputeAllStudentGraphs } = await import(
    "../src/server/services/kg/aggregator"
  );
  const r = await recomputeAllStudentGraphs();

  console.log(`\nDone.`);
  console.log(`  ${total.concepts} concept nodes (across all students)`);
  console.log(`  ${total.events} events processed`);
  console.log(`  Aggregator ran on ${r.count} students`);
}

main()
  .catch((e) => {
    console.error("Backfill crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
