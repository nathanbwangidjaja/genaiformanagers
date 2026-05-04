import { redirect } from "next/navigation";
import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card } from "@/components/cortex/primitives";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { AssignmentBuilder } from "./AssignmentBuilder";

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: queryClassId } = await searchParams;
  const teacher = await requireTeacher();

  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "asc" },
  });

  if (classes.length === 0) {
    redirect("/teacher/classes/new");
  }

  const questions = await prisma.question.findMany({
    include: { curriculumNode: true },
    orderBy: { difficulty: "asc" },
  });

  const concepts = await prisma.curriculumNode.findMany({
    where: { depth: "STANDARD" },
    select: { id: true, code: true, name: true, domain: true },
    orderBy: { code: "asc" },
  });

  if (questions.length === 0 && concepts.length === 0) {
    return (
      <TeacherShell
        title="New Assignment"
        breadcrumb={["Assignments", "New"]}
        teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
      >
        <Card style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No curriculum loaded</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>
            Run <code style={{ color: C.cyan }}>npm run db:seed</code> to populate the curriculum and
            sample questions.
          </div>
        </Card>
      </TeacherShell>
    );
  }

  const initialClassId =
    queryClassId && classes.some((c) => c.id === queryClassId) ? queryClassId : classes[0].id;

  return (
    <TeacherShell
      title="New Assignment"
      breadcrumb={["Assignments", "New"]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <AssignmentBuilder
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        initialClassId={initialClassId}
        questions={questions.map((q) => {
          const content = (q.content ?? {}) as { text?: string };
          return {
            id: q.id,
            code: q.curriculumNode.code,
            text: content.text ?? "",
            difficulty: q.difficulty,
            domain: q.curriculumNode.domain,
          };
        })}
        concepts={concepts.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          domain: c.domain,
        }))}
      />
    </TeacherShell>
  );
}
