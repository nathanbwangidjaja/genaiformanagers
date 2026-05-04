import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Card } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

const COLORS = [C.cyan, C.violet, C.orange, C.green, C.pink];

export default async function ClassesPage() {
  const teacher = await requireTeacher();
  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    include: { enrollments: true, assignments: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <TeacherShell
      title="Classes"
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
        <div style={{ fontSize: 14, color: C.text1 }}>
          {classes.length} class{classes.length === 1 ? "" : "es"} ·{" "}
          {classes.reduce((s, c) => s + c.enrollments.length, 0)} students total
        </div>
        <Link href="/teacher/classes/new" style={{ textDecoration: "none" }}>
          <Btn kind="primary" size="md" iconRight={<Icon name="plus" size={13} color={C.bg0} />}>
            New Class
          </Btn>
        </Link>
      </div>

      {classes.length === 0 ? (
        <Card style={{ padding: 60, textAlign: "center" }}>
          <Icon name="users" size={28} color={C.text3} />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No classes yet</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6, marginBottom: 18 }}>
            Create one and you&apos;ll get an invite code for your students.
          </div>
          <Link href="/teacher/classes/new" style={{ textDecoration: "none" }}>
            <Btn kind="primary" size="md">
              Create First Class
            </Btn>
          </Link>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {classes.map((cls, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: C.bg1,
                    border: `1px solid ${C.bg2}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ height: 3, background: color }} />
                  <div style={{ padding: 18 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                      {cls.enrollments.length} student
                      {cls.enrollments.length === 1 ? "" : "s"}
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        padding: "6px 10px",
                        background: C.bg2,
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: FONT_MONO,
                        color: C.cyan,
                        display: "inline-block",
                      }}
                    >
                      Code: {cls.inviteCode}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: C.text2,
                        paddingTop: 14,
                        marginTop: 14,
                        borderTop: `1px solid ${C.bg2}`,
                      }}
                    >
                      <span>{cls.assignments.length} assignments</span>
                      <span style={{ color: C.cyan, display: "flex", alignItems: "center", gap: 4 }}>
                        Open <Icon name="arrow" size={11} color={C.cyan} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </TeacherShell>
  );
}
