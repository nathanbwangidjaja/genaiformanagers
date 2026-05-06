import { notFound } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Avatar, Bar } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { getStudentGraph } from "@/server/services/kg/store";
import { StudentBrainView } from "./StudentBrainView";

export const dynamic = "force-dynamic";

export default async function StudentBrainPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: classId, studentId } = await params;
  const teacher = await requireTeacher();

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: teacher.id },
    include: { enrollments: { where: { studentId } } },
  });
  if (!cls || cls.enrollments.length === 0) notFound();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { studentProfile: { include: { insight: true } } },
  });
  if (!student?.studentProfile) notFound();

  // Pull the entire knowledge graph for this student
  const { nodes, edges } = await getStudentGraph(student.studentProfile.id);

  // Compute the top-line scores from the behavior nodes
  const behaviorNodes = nodes.filter((n) => n.type === "behavior");
  const scoreOf = (kind: string) => {
    const n = behaviorNodes.find((b) => b.externalKey === kind);
    return n ? ((n.props as Record<string, unknown>).value as number) ?? 0 : 0;
  };
  const conceptNodes = nodes.filter((n) => n.type === "concept");
  const overallMastery =
    conceptNodes.length > 0
      ? conceptNodes.reduce(
          (s, n) => s + (((n.props as Record<string, unknown>).mastery as number) ?? 0),
          0,
        ) / conceptNodes.length
      : 0;

  const lastAttempt = nodes
    .filter((n) => n.type === "attempt")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const name = `${student.firstName} ${student.lastName}`.trim() || student.email;

  // Serialize nodes/edges for the client (Date → string)
  const serializedNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    externalKey: n.externalKey,
    props: (n.props as Record<string, unknown>) ?? {},
    createdAt: n.createdAt.toISOString(),
  }));
  const serializedEdges = edges.map((e) => ({
    id: e.id,
    fromId: e.fromId,
    toId: e.toId,
    type: e.type,
    weight: e.weight,
  }));

  return (
    <TeacherShell
      breadcrumb={["Classes", cls.name, name]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <Avatar name={name} size={56} color={C.cyan} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" }}>{name}</div>
          <div
            style={{
              fontSize: 13,
              color: C.text2,
              marginTop: 2,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span>
              Grade 7 ·{" "}
              {lastAttempt ? `Active ${timeAgo(lastAttempt.createdAt)}` : "Never active"}{" "}
              · {nodes.length} node{nodes.length === 1 ? "" : "s"} in graph
            </span>
          </div>
        </div>
        <a
          href={`mailto:${student.email}?subject=${encodeURIComponent(
            `${name} — note from your teacher`,
          )}`}
          style={{ textDecoration: "none" }}
        >
          <Btn kind="secondary" size="md" icon={<Icon name="msg" size={14} />}>
            Email
          </Btn>
        </a>
      </div>

      {/* Top-level scores derived from the graph */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {(
          [
            ["Mastery", overallMastery, C.cyan],
            ["Engagement", scoreOf("engagement"), C.cyan],
            ["Curiosity", scoreOf("curiosity"), C.violet],
            ["Persistence", scoreOf("persistence"), C.green],
            ["Flow", scoreOf("flow"), C.pink],
          ] as const
        ).map(([l, v, c]) => (
          <div
            key={l}
            style={{
              background: C.bg1,
              border: `1px solid ${C.bg2}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.text2,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {l}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: FONT_MONO }}>
                {Math.round(v * 100)}%
              </div>
            </div>
            <Bar value={v} color={c} height={4} />
          </div>
        ))}
      </div>

      <StudentBrainView
        studentId={student.id}
        studentName={name}
        nodes={serializedNodes}
        edges={serializedEdges}
        cachedInsight={
          student.studentProfile.insight
            ? {
                summary: student.studentProfile.insight.summary,
                highlights: student.studentProfile.insight.highlights as Array<{
                  type: string;
                  text: string;
                }>,
                recommendations: student.studentProfile.insight.recommendations as Array<{
                  action: string;
                  why: string;
                }>,
                updatedAt: student.studentProfile.insight.updatedAt.toISOString(),
              }
            : null
        }
      />
    </TeacherShell>
  );
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
