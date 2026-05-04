/**
 * KG store — read/write helpers for the per-student knowledge graph.
 *
 * All operations are scoped to a single student; never mix students.
 *
 * Upsert semantics: nodes have a uniqueness key on (studentId, type, externalKey).
 * If you don't pass externalKey, the node is always new. If you do, calls are
 * idempotent — repeated calls with the same key update the same node.
 */

import type { Prisma, KGNode, KGEdge } from "@prisma/client";
import { prisma } from "@/server/db";
import type { NodeType, EdgeType } from "./types";

export interface UpsertNodeInput {
  studentId: string;
  type: NodeType;
  label: string;
  externalKey?: string;
  props?: Record<string, unknown>;
}

export async function upsertNode(input: UpsertNodeInput): Promise<KGNode> {
  const { studentId, type, label, externalKey, props = {} } = input;
  if (externalKey) {
    return prisma.kGNode.upsert({
      where: {
        studentId_type_externalKey: {
          studentId,
          type,
          externalKey,
        },
      },
      update: { label, props: props as Prisma.InputJsonValue },
      create: {
        studentId,
        type,
        label,
        externalKey,
        props: props as Prisma.InputJsonValue,
      },
    });
  }
  return prisma.kGNode.create({
    data: {
      studentId,
      type,
      label,
      props: props as Prisma.InputJsonValue,
    },
  });
}

export async function patchNodeProps(
  nodeId: string,
  patch: Record<string, unknown>,
): Promise<KGNode> {
  const existing = await prisma.kGNode.findUnique({ where: { id: nodeId } });
  if (!existing) throw new Error(`KGNode ${nodeId} not found`);
  const merged = { ...((existing.props as Record<string, unknown>) ?? {}), ...patch };
  return prisma.kGNode.update({
    where: { id: nodeId },
    data: { props: merged as Prisma.InputJsonValue },
  });
}

export async function getOrCreateConceptNode(
  studentId: string,
  curriculumNodeId: string,
  curriculum: { code: string; name: string; domain: string },
): Promise<KGNode> {
  return upsertNode({
    studentId,
    type: "concept",
    label: curriculum.name,
    externalKey: curriculumNodeId,
    props: {
      code: curriculum.code,
      name: curriculum.name,
      domain: curriculum.domain,
      mastery: 0.1,
      confidence: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      hintRate: 0,
      streak: 0,
      weaknessCategory: "UNTESTED",
      flowFraction: 0,
      errorPatternCounts: {},
    },
  });
}

export async function addEdge(
  studentId: string,
  fromId: string,
  toId: string,
  type: EdgeType,
  weight = 1.0,
  props: Record<string, unknown> = {},
): Promise<KGEdge> {
  return prisma.kGEdge.create({
    data: {
      studentId,
      fromId,
      toId,
      type,
      weight,
      props: props as Prisma.InputJsonValue,
    },
  });
}

/** Add an edge only if no edge of the same type exists between (from, to). */
export async function addEdgeIfMissing(
  studentId: string,
  fromId: string,
  toId: string,
  type: EdgeType,
  weight = 1.0,
  props: Record<string, unknown> = {},
): Promise<KGEdge> {
  const existing = await prisma.kGEdge.findFirst({
    where: { studentId, fromId, toId, type },
  });
  if (existing) return existing;
  return addEdge(studentId, fromId, toId, type, weight, props);
}

export async function getStudentGraph(
  studentId: string,
  opts: {
    types?: NodeType[]; // restrict by node type
    sinceDays?: number; // only nodes/edges created in last N days
  } = {},
): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
  const where: Prisma.KGNodeWhereInput = { studentId };
  if (opts.types) where.type = { in: opts.types };
  if (opts.sinceDays) {
    where.createdAt = { gte: new Date(Date.now() - opts.sinceDays * 86_400_000) };
  }

  const [nodes, edges] = await Promise.all([
    prisma.kGNode.findMany({ where, orderBy: { createdAt: "asc" } }),
    prisma.kGEdge.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // If filtering by type, filter edges to only those between visible nodes
  if (opts.types) {
    const visibleIds = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges: edges.filter((e) => visibleIds.has(e.fromId) && visibleIds.has(e.toId)),
    };
  }
  return { nodes, edges };
}

export async function findConceptNode(
  studentId: string,
  curriculumNodeId: string,
): Promise<KGNode | null> {
  return prisma.kGNode.findUnique({
    where: {
      studentId_type_externalKey: {
        studentId,
        type: "concept",
        externalKey: curriculumNodeId,
      },
    },
  });
}

export async function findBehaviorNode(
  studentId: string,
  kind: string,
): Promise<KGNode | null> {
  return prisma.kGNode.findUnique({
    where: {
      studentId_type_externalKey: {
        studentId,
        type: "behavior",
        externalKey: kind,
      },
    },
  });
}

export async function findTraitNode(
  studentId: string,
  name: string,
): Promise<KGNode | null> {
  return prisma.kGNode.findUnique({
    where: {
      studentId_type_externalKey: {
        studentId,
        type: "trait",
        externalKey: name,
      },
    },
  });
}
