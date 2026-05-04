import { notFound } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge, Avatar, Bar, Radial, Card } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { StudentKnowledgeGraph } from "@/components/cortex/StudentKnowledgeGraph";

export default async function StudentGraphPage({
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
    include: {
      studentProfile: {
        include: {
          masteryRecords: { include: { curriculumNode: true } },
          behavioralProfile: true,
          interactionEvents: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!student || !student.studentProfile) notFound();

  const sp = student.studentProfile;
  const beh = sp.behavioralProfile;
  const records = sp.masteryRecords;
  const overallMastery =
    records.length > 0 ? records.reduce((s, r) => s + r.masteryLevel, 0) / records.length : 0;
  const lastActive = sp.interactionEvents[0]?.timestamp;

  const allNodes = await prisma.curriculumNode.findMany({
    where: { depth: "STANDARD" },
    include: { prerequisites: true },
    orderBy: { code: "asc" },
  });

  const masteryByNode = new Map(records.map((r) => [r.curriculumNodeId, r]));

  const name = `${student.firstName} ${student.lastName}`.trim() || student.email;

  return (
    <TeacherShell
      breadcrumb={["Classes", cls.name, name]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      {/* Student header */}
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
            <span>Grade 7 · {lastActive ? `Active ${timeAgo(lastActive)}` : "Never active"}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {(
          [
            ["Mastery", overallMastery, C.cyan],
            ["Engagement", beh?.engagementScore ?? 0, C.cyan],
            ["Curiosity", beh?.curiosityScore ?? 0, C.violet],
            ["Persistence", beh?.persistenceScore ?? 0, C.green],
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
                marginBottom: 10,
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

      {/* Knowledge graph + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1.85fr 1fr", gap: 16 }}>
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            height: 620,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 16,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="brain" size={14} color={C.text1} />
            <span style={{ fontSize: 12, color: C.text1, fontWeight: 500 }}>
              Knowledge Map
            </span>
            <span style={{ fontSize: 11, color: C.text3 }}>
              · {allNodes.length} concepts · {records.length} practiced
            </span>
          </div>
          <StudentKnowledgeGraph
            nodes={allNodes.map((n) => ({
              id: n.id,
              code: n.code,
              name: n.name,
              domain: n.domain,
              mastery: masteryByNode.get(n.id)?.masteryLevel ?? 0,
            }))}
            edges={allNodes.flatMap((n) =>
              n.prerequisites.map((p) => ({ from: p.sourceNodeId, to: p.targetNodeId })),
            )}
          />
        </div>

        {/* Detail panel */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            height: 620,
            overflow: "auto",
            padding: 20,
          }}
        >
          {records.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <Icon name="brain" size={28} color={C.text3} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>
                No practice yet
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>
                {name.split(" ")[0]} hasn&apos;t completed any questions. Assign one to get
                started.
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: C.text2,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                Concept Mastery ({records.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {records
                  .slice()
                  .sort((a, b) => a.masteryLevel - b.masteryLevel)
                  .map((r) => {
                    const node = r.curriculumNode;
                    const m = r.masteryLevel;
                    const color =
                      m >= 0.8 ? C.green : m >= 0.6 ? C.cyan : m >= 0.3 ? C.violet : C.orange;
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: C.bg2,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{node.name}</div>
                          <span
                            style={{
                              fontSize: 12,
                              color,
                              fontFamily: FONT_MONO,
                              fontWeight: 600,
                            }}
                          >
                            {Math.round(m * 100)}%
                          </span>
                        </div>
                        <Bar value={m} color={color} height={4} />
                        <div
                          style={{
                            fontSize: 11,
                            color: C.text2,
                            marginTop: 6,
                            display: "flex",
                            gap: 12,
                          }}
                        >
                          <span>{r.totalAttempts} attempts</span>
                          <span>·</span>
                          <span>{r.streak} streak</span>
                          {r.lastPracticedAt && (
                            <>
                              <span>·</span>
                              <span>last {timeAgo(r.lastPracticedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>
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
