import { C } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Card, Badge, Bar } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireStudent } from "@/server/auth";
import { prisma } from "@/server/db";
import { StudentKnowledgeGraph } from "@/components/cortex/StudentKnowledgeGraph";

const DOMAIN_NAMES: Record<string, string> = {
  RATIOS_PROPORTIONAL: "Ratios & Proportions",
  NUMBER_SYSTEM: "Number System",
  EXPRESSIONS_EQUATIONS: "Expressions & Equations",
  GEOMETRY: "Geometry",
  STATISTICS_PROBABILITY: "Statistics & Probability",
};

export default async function StudentProgressPage() {
  const student = await requireStudent();
  const studentProfileId = student.studentProfile!.id;

  const [allNodes, mastery] = await Promise.all([
    prisma.curriculumNode.findMany({
      where: { depth: "STANDARD" },
      include: { prerequisites: true },
    }),
    prisma.studentConceptMastery.findMany({
      where: { studentId: studentProfileId },
      include: { curriculumNode: true },
    }),
  ]);

  const masteryByNode = new Map(mastery.map((m) => [m.curriculumNodeId, m]));

  const overallMastery =
    mastery.length > 0 ? mastery.reduce((s, r) => s + r.masteryLevel, 0) / mastery.length : 0;

  return (
    <StudentShell>
      <div style={{ padding: "36px 48px" }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Your learning map
        </div>
        <div style={{ fontSize: 14, color: C.text1, marginTop: 4, marginBottom: 28 }}>
          {mastery.length === 0
            ? "Complete your first assignment to start building your knowledge graph."
            : `${mastery.length} concept${mastery.length === 1 ? "" : "s"} practiced · overall mastery ${Math.round(overallMastery * 100)}%`}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
          <div
            style={{
              background: C.bg1,
              border: `1px solid ${C.bg2}`,
              borderRadius: 14,
              height: 540,
              position: "relative",
              overflow: "hidden",
            }}
          >
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

          <Card style={{ padding: 22, height: 540, overflow: "auto" }}>
            <Badge tone="cyan">Your strengths</Badge>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {mastery.length === 0 ? (
                <div style={{ fontSize: 13, color: C.text2 }}>
                  Once you start practicing, your strongest and weakest concepts will appear here.
                </div>
              ) : (
                mastery
                  .slice()
                  .sort((a, b) => b.masteryLevel - a.masteryLevel)
                  .slice(0, 5)
                  .map((r) => {
                    const c =
                      r.masteryLevel >= 0.8
                        ? C.green
                        : r.masteryLevel >= 0.6
                          ? C.cyan
                          : r.masteryLevel >= 0.3
                            ? C.violet
                            : C.orange;
                    return (
                      <div key={r.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          <span>{r.curriculumNode.name}</span>
                          <span style={{ color: c, fontWeight: 600 }}>
                            {Math.round(r.masteryLevel * 100)}%
                          </span>
                        </div>
                        <Bar value={r.masteryLevel} color={c} height={4} />
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
                          {DOMAIN_NAMES[r.curriculumNode.domain]} · {r.totalAttempts} attempts
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {mastery.length > 0 && (
              <>
                <Badge tone="orange" style={{ marginTop: 24 }}>
                  Work on
                </Badge>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {mastery
                    .slice()
                    .filter((r) => r.masteryLevel < 0.6)
                    .sort((a, b) => a.masteryLevel - b.masteryLevel)
                    .slice(0, 3)
                    .map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: 12,
                          background: C.bg2,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.curriculumNode.name}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>
                          {DOMAIN_NAMES[r.curriculumNode.domain]} ·{" "}
                          {Math.round(r.masteryLevel * 100)}%
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Achievements */}
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 36, marginBottom: 14 }}>
          Achievements
        </div>
        <Achievements
          totalMastery={overallMastery}
          masteredCount={mastery.filter((m) => m.masteryLevel >= 0.8).length}
          maxStreak={mastery.reduce((s, m) => Math.max(s, m.streak), 0)}
        />
      </div>
    </StudentShell>
  );
}

function Achievements({
  totalMastery,
  masteredCount,
  maxStreak,
}: {
  totalMastery: number;
  masteredCount: number;
  maxStreak: number;
}) {
  const items: Array<{ i: "star" | "flame" | "telescope" | "mountain" | "sparkle" | "brain"; t: string; earned: boolean; c: string }> = [
    { i: "star", t: "First Try", earned: masteredCount > 0, c: C.amber },
    { i: "flame", t: "5+ Streak", earned: maxStreak >= 5, c: C.orange },
    { i: "telescope", t: "Curious", earned: false, c: C.violet },
    { i: "mountain", t: "Persistent", earned: false, c: C.green },
    { i: "sparkle", t: "Quick Thinker", earned: false, c: C.cyan },
    { i: "brain", t: `Master ${Math.max(20, masteredCount)} concepts`, earned: masteredCount >= 20, c: C.pink },
  ];
  // Suppress unused arg warning
  void totalMastery;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {items.map((a, i) => (
        <div
          key={i}
          style={{
            background: a.earned ? `${a.c}06` : C.bg1,
            border: `1px solid ${a.earned ? `${a.c}44` : C.bg2}`,
            borderRadius: 12,
            padding: 18,
            textAlign: "center",
            opacity: a.earned ? 1 : 0.5,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 99,
              margin: "0 auto 10px",
              background: a.earned ? `${a.c}15` : C.bg2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: a.earned ? `0 0 20px ${a.c}33` : "none",
            }}
          >
            <Icon name={a.i} size={20} color={a.earned ? a.c : C.text3} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: a.earned ? C.text0 : C.text2 }}>
            {a.t}
          </div>
        </div>
      ))}
    </div>
  );
}
