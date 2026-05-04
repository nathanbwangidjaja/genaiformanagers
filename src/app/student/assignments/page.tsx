import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Btn, Badge, Bar, Card } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireStudent } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function StudentAssignmentsPage() {
  const student = await requireStudent();
  const studentProfileId = student.studentProfile!.id;

  const assignments = await prisma.assignment.findMany({
    where: { class: { enrollments: { some: { studentId: student.id } } } },
    include: {
      questions: true,
      class: true,
      submissions: { where: { studentId: studentProfileId } },
    },
    orderBy: { dueDate: "asc" },
  });

  const active = assignments.filter((a) => !a.submissions.some((s) => s.completedAt));
  const completed = assignments.filter((a) => a.submissions.some((s) => s.completedAt));

  return (
    <StudentShell>
      <div style={{ padding: "36px 48px", maxWidth: 1100 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Assignments
        </div>
        <div style={{ fontSize: 14, color: C.text1, marginBottom: 28 }}>
          {active.length} active · {completed.length} completed
        </div>

        {assignments.length === 0 ? (
          <Card style={{ padding: 60, textAlign: "center" }}>
            <Icon name="clipboard" size={28} color={C.text3} />
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No assignments yet</div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>
              Your teacher hasn&apos;t assigned anything yet, or you haven&apos;t joined a class.
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map((a) => {
              const sub = a.submissions[0];
              const isComplete = !!sub?.completedAt;
              const total = a.questions.length;
              const dueLabel = a.dueDate
                ? a.dueDate.getTime() < Date.now()
                  ? "Overdue"
                  : `Due ${a.dueDate.toLocaleDateString()}`
                : "No due date";
              const tone = isComplete
                ? ("green" as const)
                : a.dueDate && a.dueDate.getTime() < Date.now()
                  ? ("red" as const)
                  : a.dueDate && a.dueDate.getTime() < Date.now() + 86_400_000
                    ? ("amber" as const)
                    : ("cyan" as const);
              const prog = isComplete ? 1 : sub ? 0.5 : 0; // simplified: started or done
              return (
                <Link
                  key={a.id}
                  href={`/student/assignments/${a.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: C.bg1,
                      border: `1px solid ${C.bg2}`,
                      borderRadius: 12,
                      padding: 20,
                      display: "grid",
                      gridTemplateColumns: "8px 1fr 200px 160px 100px",
                      gap: 20,
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 40,
                        background: C.cyan,
                        borderRadius: 99,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                        {a.class.name} · {total} question{total === 1 ? "" : "s"}
                      </div>
                    </div>
                    <Badge tone={tone}>{isComplete ? "Completed" : dueLabel}</Badge>
                    <div>
                      <Bar value={prog} color={C.cyan} height={5} />
                    </div>
                    <Btn
                      kind={isComplete ? "secondary" : sub ? "primary" : "secondary"}
                      size="sm"
                      iconRight={
                        <Icon
                          name="arrow"
                          size={11}
                          color={!isComplete && sub ? C.bg0 : undefined}
                        />
                      }
                    >
                      {isComplete ? "Review" : sub ? "Continue" : "Start"}
                    </Btn>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
