import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge, Card } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AssignmentsPage() {
  const teacher = await requireTeacher();
  const assignments = await prisma.assignment.findMany({
    where: { class: { teacherId: teacher.id } },
    include: {
      class: { include: { enrollments: true } },
      submissions: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <TeacherShell
      title="Assignments"
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, color: C.text1 }}>{assignments.length} total</div>
        <Link href="/teacher/assignments/new" style={{ textDecoration: "none" }}>
          <Btn kind="primary" size="md" iconRight={<Icon name="plus" size={13} color={C.bg0} />}>
            New Assignment
          </Btn>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <Card style={{ padding: 60, textAlign: "center" }}>
          <Icon name="clipboard" size={28} color={C.text3} />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No assignments yet</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6, marginBottom: 18 }}>
            Build one and assign it to a class.
          </div>
          <Link href="/teacher/assignments/new" style={{ textDecoration: "none" }}>
            <Btn kind="primary" size="md">
              Create Assignment
            </Btn>
          </Link>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {assignments.map((a, i) => {
            const total = a.class.enrollments.length;
            const submitted = a.submissions.filter((s) => s.completedAt).length;
            const tone =
              !a.dueDate
                ? ("zinc" as const)
                : a.dueDate.getTime() < Date.now()
                  ? ("red" as const)
                  : ("cyan" as const);
            const dueLabel = a.dueDate
              ? a.dueDate.getTime() < Date.now()
                ? "Overdue"
                : `Due ${a.dueDate.toLocaleDateString()}`
              : "No due date";
            return (
              <Link
                key={a.id}
                href={`/teacher/assignments/${a.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    padding: "18px 24px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 100px",
                    gap: 20,
                    alignItems: "center",
                    borderBottom: i < assignments.length - 1 ? `1px solid ${C.bg2}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                      {a.class.name} · {a.questions.length} question
                      {a.questions.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Badge tone={tone}>{dueLabel}</Badge>
                  <div style={{ fontSize: 13, color: C.text1 }}>
                    <span style={{ color: C.text0, fontWeight: 600 }}>{submitted}</span>
                    <span style={{ color: C.text2 }}> / {total} submitted</span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: C.bg2,
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: total > 0 ? `${(submitted / total) * 100}%` : "0%",
                        height: "100%",
                        background: C.cyan,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Icon name="chevR" size={14} color={C.text2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </TeacherShell>
  );
}
