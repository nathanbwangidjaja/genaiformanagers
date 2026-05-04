import { NextResponse } from "next/server";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { getStudentGraph } from "@/server/services/kg/store";
import type { NodeType } from "@/server/services/kg/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const teacher = await requireTeacher();
  const { studentId } = await params;

  // Authorization: teacher must own a class the student is enrolled in
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId, class: { teacherId: teacher.id } },
  });
  if (!enrollment) return NextResponse.json({ error: "not authorized" }, { status: 403 });

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
  });
  if (!studentProfile) return NextResponse.json({ nodes: [], edges: [] });

  const url = new URL(req.url);
  const typesParam = url.searchParams.get("types");
  const sinceDays = url.searchParams.get("sinceDays");

  const opts: { types?: NodeType[]; sinceDays?: number } = {};
  if (typesParam) opts.types = typesParam.split(",") as NodeType[];
  if (sinceDays) opts.sinceDays = parseInt(sinceDays, 10);

  const { nodes, edges } = await getStudentGraph(studentProfile.id, opts);
  return NextResponse.json({ nodes, edges });
}
