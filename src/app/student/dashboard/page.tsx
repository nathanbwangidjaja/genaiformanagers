import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Card, Btn, Badge, Bar, Radial } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireStudent } from "@/server/auth";
import { prisma } from "@/server/db";

const DOMAIN_NAMES: Record<string, string> = {
  RATIOS_PROPORTIONAL: "Ratios & Proportions",
  NUMBER_SYSTEM: "Number System",
  EXPRESSIONS_EQUATIONS: "Expressions & Equations",
  GEOMETRY: "Geometry",
  STATISTICS_PROBABILITY: "Statistics & Probability",
};

export default async function StudentDashboardPage() {
  const student = await requireStudent();
  const studentProfileId = student.studentProfile!.id;

  const [enrollments, mastery, assignmentRows, recentRecords] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: student.id },
      include: { class: { include: { assignments: true } } },
    }),
    prisma.studentConceptMastery.findMany({
      where: { studentId: studentProfileId },
      include: { curriculumNode: true },
    }),
    prisma.assignment.findMany({
      where: { class: { enrollments: { some: { studentId: student.id } } } },
      include: {
        questions: true,
        submissions: { where: { studentId: studentProfileId } },
        class: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.studentConceptMastery.findMany({
      where: { studentId: studentProfileId, masteryLevel: { lt: 0.6 } },
      include: { curriculumNode: true },
      take: 3,
      orderBy: { masteryLevel: "asc" },
    }),
  ]);

  const totalConcepts = await prisma.curriculumNode.count({ where: { depth: "STANDARD" } });
  const overallMastery =
    mastery.length > 0 ? mastery.reduce((s, r) => s + r.masteryLevel, 0) / mastery.length : 0;

  // Domain breakdown
  const byDomain = new Map<string, number[]>();
  for (const r of mastery) {
    const arr = byDomain.get(r.curriculumNode.domain) ?? [];
    arr.push(r.masteryLevel);
    byDomain.set(r.curriculumNode.domain, arr);
  }
  const domainProgress = Array.from(byDomain.entries())
    .map(([d, vals]) => ({
      domain: d,
      label: DOMAIN_NAMES[d] ?? d,
      value: vals.reduce((s, v) => s + v, 0) / vals.length,
    }))
    .sort((a, b) => b.value - a.value);

  // Active assignments (not yet completed)
  const dueAssignments = assignmentRows.filter((a) => {
    const completed = a.submissions.some((s) => s.completedAt);
    return !completed;
  });

  const firstName = student.firstName || "there";

  return (
    <StudentShell>
      <div style={{ padding: "36px 48px", maxWidth: 1100 }}>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Welcome,{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {firstName}
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: C.text1,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span>
            {enrollments.length === 0
              ? "Join a class to get started."
              : `Enrolled in ${enrollments.length} class${enrollments.length === 1 ? "" : "es"}.`}
          </span>
          {enrollments.length > 0 && (
            <Link href="/student/join" style={{ textDecoration: "none" }}>
              <Btn kind="ghost" size="sm" iconRight={<Icon name="plus" size={12} />}>
                Join another class
              </Btn>
            </Link>
          )}
        </div>

        {enrollments.length === 0 && (
          <Card style={{ padding: 28, marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Join your first class</div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 4, marginBottom: 16 }}>
              Ask your teacher for the invite code.
            </div>
            <Link href="/onboarding" style={{ textDecoration: "none" }}>
              <Btn kind="primary" size="md">
                Enter invite code
              </Btn>
            </Link>
          </Card>
        )}

        {/* Progress overview */}
        <Card style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 32, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <Radial value={overallMastery} size={140} stroke={10} color={C.cyan} />
              <div
                style={{
                  fontSize: 11,
                  color: C.text2,
                  marginTop: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Overall Mastery
              </div>
              <div style={{ fontSize: 12, color: C.text1, marginTop: 4 }}>
                {mastery.length} of {totalConcepts} concepts practiced
              </div>
            </div>
            <div>
              {domainProgress.length === 0 ? (
                <div style={{ fontSize: 13, color: C.text2 }}>
                  No practice yet. Start an assignment to begin building your map.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: C.text2, marginBottom: 14 }}>
                    Your progress across Grade 7 Math
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {domainProgress.map((d) => {
                      const c =
                        d.value >= 0.7 ? C.green : d.value >= 0.5 ? C.cyan : d.value >= 0.3 ? C.violet : C.orange;
                      return (
                        <div
                          key={d.domain}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "180px 1fr 50px",
                            alignItems: "center",
                            gap: 14,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: C.text1 }}>{d.label}</span>
                          <Bar value={d.value} color={c} height={8} />
                          <span style={{ color: c, fontFamily: FONT_MONO, fontWeight: 600, textAlign: "right" }}>
                            {Math.round(d.value * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Due assignments */}
        <div
          style={{
            marginTop: 32,
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Due Soon</div>
          {dueAssignments.length > 0 && (
            <Link href="/student/assignments" style={{ fontSize: 13, color: C.cyan, textDecoration: "none" }}>
              View all →
            </Link>
          )}
        </div>
        {dueAssignments.length === 0 ? (
          <Card style={{ padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.text1 }}>You&apos;re all caught up.</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>
              {enrollments.length === 0 ? "Join a class to receive assignments." : "No assignments due."}
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {dueAssignments.slice(0, 3).map((a) => {
              const sub = a.submissions[0];
              const total = a.questions.length;
              const done = sub
                ? // best-effort progress via responses - here we just check completion
                  sub.completedAt
                  ? total
                  : 0
                : 0;
              const prog = total > 0 ? done / total : 0;
              const dueLabel = a.dueDate
                ? a.dueDate.getTime() < Date.now()
                  ? "Overdue"
                  : `Due ${a.dueDate.toLocaleDateString()}`
                : "No due date";
              const tone =
                a.dueDate && a.dueDate.getTime() < Date.now() + 86_400_000
                  ? ("amber" as const)
                  : ("cyan" as const);
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
                      borderLeft: `3px solid ${C.cyan}`,
                      padding: 18,
                      cursor: "pointer",
                      height: "100%",
                    }}
                  >
                    <Badge tone={tone} style={{ fontSize: 10 }}>
                      {dueLabel}
                    </Badge>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                      {a.class.name} · {total} question{total === 1 ? "" : "s"}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Bar value={prog} color={C.cyan} height={4} />
                    </div>
                    <Btn
                      kind={prog > 0 ? "primary" : "secondary"}
                      size="sm"
                      style={{ width: "100%", marginTop: 14 }}
                    >
                      {prog > 0 ? "Continue" : "Start"}
                    </Btn>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Recommended */}
        {recentRecords.length > 0 && (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="sparkle" size={16} color={C.violet} /> Practice these
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {recentRecords.map((r) => {
                const m = r.masteryLevel;
                const color = m < 0.3 ? C.orange : m < 0.6 ? C.violet : C.cyan;
                const tone = m < 0.3 ? ("orange" as const) : m < 0.6 ? ("violet" as const) : ("cyan" as const);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: `${color}05`,
                      border: `1px solid ${color}33`,
                      borderRadius: 12,
                      padding: 18,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Badge tone={tone} dot>
                      {DOMAIN_NAMES[r.curriculumNode.domain] ?? r.curriculumNode.domain}
                    </Badge>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>
                      {r.curriculumNode.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.text1, marginTop: 6 }}>
                      You scored {Math.round(m * 100)}% — practice to grow
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </StudentShell>
  );
}
