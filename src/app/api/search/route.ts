/**
 * Search index for the teacher topbar omnibar.
 *
 * Returns every class, student, and curriculum standard the current
 * teacher has access to. The client filters this in-memory by substring
 * match — no server-side fuzzy search needed at this scale.
 */

import { NextResponse } from "next/server";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

export type SearchItem =
  | { kind: "class"; id: string; label: string; href: string }
  | { kind: "student"; id: string; label: string; href: string; subtitle: string }
  | { kind: "concept"; id: string; label: string; href: string; subtitle: string };

export async function GET() {
  const teacher = await requireTeacher();

  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    include: { enrollments: { include: { student: true } } },
    orderBy: { createdAt: "asc" },
  });

  const items: SearchItem[] = [];

  for (const c of classes) {
    items.push({
      kind: "class",
      id: c.id,
      label: c.name,
      href: `/teacher/classes/${c.id}`,
    });
    for (const e of c.enrollments) {
      const fullName = `${e.student.firstName} ${e.student.lastName}`.trim() || e.student.email;
      items.push({
        kind: "student",
        id: e.student.id,
        label: fullName,
        subtitle: c.name,
        href: `/teacher/classes/${c.id}/students/${e.student.id}`,
      });
    }
  }

  const standards = await prisma.curriculumNode.findMany({
    where: { depth: "STANDARD" },
    orderBy: { code: "asc" },
  });
  for (const s of standards) {
    items.push({
      kind: "concept",
      id: s.id,
      label: `${s.code} ${s.name}`,
      subtitle: s.description ?? "",
      href: `/teacher/curriculum?node=${s.id}`,
    });
  }

  return NextResponse.json({ items });
}
