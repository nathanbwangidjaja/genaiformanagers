import Link from "next/link";
import { notFound } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card, Badge, Avatar } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();

  const assignment = await prisma.assignment.findFirst({
    where: { id, class: { teacherId: teacher.id } },
    include: {
      class: { include: { enrollments: { include: { student: true } } } },
      questions: { include: { question: { include: { curriculumNode: true } } }, orderBy: { orderIndex: "asc" } },
      submissions: {
        include: {
          responses: true,
        },
      },
    },
  });
  if (!assignment) notFound();

  // Build a map: studentId (StudentProfile.id) -> submission
  const submissionByProfile = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  // Profile lookup for student User
  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { in: assignment.class.enrollments.map((e) => e.studentId) } },
  });
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  return (
    <TeacherShell
      breadcrumb={["Assignments", assignment.title]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>
          {assignment.title}
        </div>
        <Badge tone="cyan" dot>
          {assignment.class.name}
        </Badge>
      </div>
      <div style={{ fontSize: 13, color: C.text2, marginBottom: 24 }}>
        {assignment.questions.length} question{assignment.questions.length === 1 ? "" : "s"} ·{" "}
        {assignment.dueDate ? `Due ${assignment.dueDate.toLocaleDateString()}` : "No due date"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Submissions */}
        <Card style={{ padding: 0 }}>
          <div
            style={{
              padding: 18,
              borderBottom: `1px solid ${C.bg2}`,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Submissions
          </div>
          {assignment.class.enrollments.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: C.text2, fontSize: 13 }}>
              No students enrolled in this class yet.
            </div>
          ) : (
            assignment.class.enrollments.map((enr, i) => {
              const profile = profileByUser.get(enr.studentId);
              const sub = profile ? submissionByProfile.get(profile.id) : undefined;
              const name = `${enr.student.firstName} ${enr.student.lastName}`.trim() || enr.student.email;
              const correct = sub?.responses.filter((r) => r.isCorrect).length ?? 0;
              const total = sub?.responses.length ?? 0;
              const score = total > 0 ? Math.round((correct / total) * 100) : null;
              return (
                <div
                  key={enr.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px",
                    padding: "14px 18px",
                    borderBottom:
                      i < assignment.class.enrollments.length - 1 ? `1px solid ${C.bg2}` : "none",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={name} size={28} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>
                        {sub?.completedAt
                          ? `Completed ${sub.completedAt.toLocaleString()}`
                          : sub
                            ? "In progress"
                            : "Not started"}
                      </div>
                    </div>
                  </div>
                  <Badge tone={sub?.completedAt ? "green" : sub ? "amber" : "zinc"}>
                    {sub?.completedAt ? "Done" : sub ? "Started" : "Not started"}
                  </Badge>
                  <div
                    style={{
                      fontSize: 14,
                      color: C.text0,
                      fontFamily: FONT_MONO,
                      textAlign: "right",
                    }}
                  >
                    {score !== null ? `${score}%` : "—"}
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* Questions */}
        <Card style={{ padding: 0 }}>
          <div
            style={{
              padding: 18,
              borderBottom: `1px solid ${C.bg2}`,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Questions
          </div>
          {assignment.questions.map((aq, i) => {
            const content = (aq.question.content ?? {}) as { text?: string };
            return (
              <div
                key={aq.id}
                style={{
                  padding: "14px 18px",
                  borderBottom:
                    i < assignment.questions.length - 1 ? `1px solid ${C.bg2}` : "none",
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <Badge tone="violet" style={{ fontSize: 10, padding: "1px 8px" }}>
                    {aq.question.curriculumNode.code}
                  </Badge>
                  <Badge tone="zinc" style={{ fontSize: 10, padding: "1px 8px" }}>
                    Q{i + 1}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, color: C.text0 }}>{content.text ?? "(no text)"}</div>
              </div>
            );
          })}
        </Card>
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: C.text2 }}>
        <Link href="/teacher/assignments" style={{ color: C.cyan, textDecoration: "none" }}>
          ← Back to assignments
        </Link>
      </div>
    </TeacherShell>
  );
}
