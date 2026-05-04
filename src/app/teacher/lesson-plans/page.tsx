import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { LessonPlanGenerator } from "./LessonPlanGenerator";

export const dynamic = "force-dynamic";

export default async function LessonPlansPage() {
  const teacher = await requireTeacher();
  const [classes, savedPlans] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      include: { class: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <TeacherShell
      title="Lesson Plans"
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <div style={{ marginBottom: 24, fontSize: 14, color: C.text1, maxWidth: 720 }}>
        Generate a 15-25 minute mini-lesson tailored to your class&apos;s current mastery data.
        Saved plans appear below — open one to view or print as PDF.
      </div>
      <LessonPlanGenerator classes={classes} />

      <div style={{ marginTop: 40, marginBottom: 14, fontSize: 16, fontWeight: 600 }}>
        Saved Plans ({savedPlans.length})
      </div>
      {savedPlans.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <Icon name="bulb" size={24} color={C.text3} />
          <div style={{ fontSize: 13, color: C.text2, marginTop: 12 }}>
            No saved plans yet. Generate one above.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {savedPlans.map((p, i) => (
            <Link
              key={p.id}
              href={`/teacher/lesson-plans/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 160px 24px",
                  gap: 14,
                  alignItems: "center",
                  borderBottom: i < savedPlans.length - 1 ? `1px solid ${C.bg2}` : "none",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
                  {p.focusNotes && (
                    <div
                      style={{
                        fontSize: 11,
                        color: C.text2,
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.focusNotes}
                    </div>
                  )}
                </div>
                <Badge tone="cyan" dot>
                  {p.class?.name ?? "—"}
                </Badge>
                <div style={{ fontSize: 12, color: C.text2 }}>
                  {p.createdAt.toLocaleDateString()} · {p.createdAt.toLocaleTimeString()}
                </div>
                <Icon name="chevR" size={14} color={C.text2} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </TeacherShell>
  );
}
