import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card, Btn } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

const DOMAIN_COLORS = [C.cyan, C.violet, C.orange, C.green, C.pink];

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();

  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              studentProfile: { include: { masteryRecords: true } },
            },
          },
        },
      },
      assignments: { include: { submissions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalStudents = classes.reduce((s, c) => s + c.enrollments.length, 0);
  const allMastery = classes.flatMap((c) =>
    c.enrollments.flatMap((e) => e.student.studentProfile?.masteryRecords ?? []),
  );
  const avgMastery =
    allMastery.length > 0
      ? allMastery.reduce((s, m) => s + m.masteryLevel, 0) / allMastery.length
      : 0;

  const activeThisWeek = classes.reduce((s, c) => {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const active = new Set<string>();
    c.assignments.forEach((a) => {
      a.submissions.forEach((sub) => {
        if (sub.startedAt.getTime() >= week) active.add(sub.studentId);
      });
    });
    return s + active.size;
  }, 0);

  const totalAssignments = classes.reduce((s, c) => s + c.assignments.length, 0);

  return (
    <TeacherShell title="Dashboard" teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}>
      <div style={{ marginBottom: 24, fontSize: 14, color: C.text1 }}>
        Welcome back{teacher.firstName ? `, ${teacher.firstName}` : ""}.
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Classes" value={String(classes.length)} icon="users" />
        <StatCard label="Students" value={String(totalStudents)} icon="grad" />
        <StatCard
          label="Avg Mastery"
          value={`${Math.round(avgMastery * 100)}%`}
          icon="trend"
          gradient
        />
        <StatCard label="Active This Week" value={String(activeThisWeek)} icon="zap" />
      </div>

      {/* Classes */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>Your Classes</div>
        <Link href="/teacher/classes/new" style={{ textDecoration: "none" }}>
          <Btn kind="ghost" size="sm" iconRight={<Icon name="plus" size={13} />}>
            New Class
          </Btn>
        </Link>
      </div>

      {classes.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <Icon name="users" size={28} color={C.text3} />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No classes yet</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6, marginBottom: 18 }}>
            Create your first class to start tracking students.
          </div>
          <Link href="/teacher/classes/new" style={{ textDecoration: "none" }}>
            <Btn kind="primary" size="md">
              Create Class
            </Btn>
          </Link>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {classes.map((cls, i) => {
            const color = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
            const studentCount = cls.enrollments.length;
            const due = cls.assignments.filter((a) => a.dueDate && a.dueDate.getTime() > Date.now())
              .length;
            const masteryRecords = cls.enrollments.flatMap(
              (e) => e.student.studentProfile?.masteryRecords ?? [],
            );
            const m =
              masteryRecords.length > 0
                ? masteryRecords.reduce((s, x) => s + x.masteryLevel, 0) / masteryRecords.length
                : 0;
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
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                      {studentCount} student{studentCount === 1 ? "" : "s"} · code{" "}
                      <span style={{ color: C.cyan, fontFamily: FONT_MONO }}>{cls.inviteCode}</span>
                    </div>
                    <div
                      style={{
                        marginTop: 16,
                        marginBottom: 14,
                        height: 6,
                        background: C.bg2,
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0.05, m) * 100}%`,
                          height: "100%",
                          background: color,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: C.text2,
                        paddingTop: 12,
                        borderTop: `1px solid ${C.bg2}`,
                      }}
                    >
                      <span>
                        {due} assignment{due === 1 ? "" : "s"} due · avg {Math.round(m * 100)}%
                      </span>
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

      {/* Recent activity / empty state */}
      <div style={{ marginTop: 32, fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
        Recent Activity
      </div>
      <RecentActivity teacherId={teacher.id} hasAssignments={totalAssignments > 0} />
    </TeacherShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  icon: "users" | "grad" | "trend" | "zap";
  gradient?: boolean;
}) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            fontSize: 11,
            color: C.text2,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <Icon name={icon} size={16} color={C.text3} />
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginTop: 10,
          fontFamily: FONT_MONO,
          letterSpacing: "-0.02em",
          ...(gradient
            ? {
                background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : {}),
        }}
      >
        {value}
      </div>
    </Card>
  );
}

async function RecentActivity({ teacherId, hasAssignments }: { teacherId: string; hasAssignments: boolean }) {
  if (!hasAssignments) {
    return (
      <Card style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.text2 }}>
          Activity will appear here once students start practicing.
        </div>
      </Card>
    );
  }

  const submissions = await prisma.submission.findMany({
    where: { assignment: { class: { teacherId } } },
    include: {
      assignment: true,
      responses: true,
    },
    orderBy: { startedAt: "desc" },
    take: 8,
  });

  if (submissions.length === 0) {
    return (
      <Card style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.text2 }}>
          No submissions yet. Create an assignment to get started.
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: 4 }}>
        {submissions.map((sub, i) => {
          const correct = sub.responses.filter((r) => r.isCorrect).length;
          const total = sub.responses.length;
          const score = total > 0 ? Math.round((correct / total) * 100) : null;
          return (
            <div
              key={sub.id}
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                borderBottom: i < submissions.length - 1 ? `1px solid ${C.bg2}` : "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: `${C.cyan}10`,
                  border: `1px solid ${C.cyan}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={sub.completedAt ? "check" : "clipboard"} size={13} color={C.cyan} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text0 }}>
                  {sub.completedAt ? "Completed" : "Started"} <b>{sub.assignment.title}</b>
                  {score !== null ? ` — scored ${score}%` : ""}
                </div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
                  {sub.startedAt.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
