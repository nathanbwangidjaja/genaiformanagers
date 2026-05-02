import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge, Avatar, Bar, Radial } from "@/components/cortex/primitives";
import { Icon, type IconName } from "@/components/cortex/Icon";
import {
  KnowledgeGraph,
  DEFAULT_KG_NODES,
  DEFAULT_KG_EDGES,
} from "@/components/cortex/KnowledgeGraph";

const STUDENTS: Record<string, { name: string; mastery: number; engagement: number; curiosity: number; persistence: number }> = {
  alex: { name: "Alex Thompson", mastery: 0.72, engagement: 0.85, curiosity: 0.91, persistence: 0.68 },
  maya: { name: "Maya Rodriguez", mastery: 0.92, engagement: 0.95, curiosity: 0.88, persistence: 0.82 },
  sarah: { name: "Sarah Kim", mastery: 0.78, engagement: 0.72, curiosity: 0.65, persistence: 0.7 },
};

const CLASS_INFO: Record<string, string> = {
  "7a": "Grade 7A · Period 1",
  "7b": "Grade 7B · Period 3",
  "7c": "Grade 7C · Period 5",
  honors: "Honors 7 · Period 6",
};

export default async function StudentGraphPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
  const student = STUDENTS[studentId] ?? STUDENTS["alex"];
  const className = CLASS_INFO[id] ?? "Grade 7A · Period 1";

  return (
    <TeacherShell breadcrumb={["Classes", className, student.name]}>
      {/* Student header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <Avatar name={student.name} size={56} color={C.cyan} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" }}>
            {student.name}
          </div>
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
            <span>Grade 7 · Active 12 minutes ago</span>
            <span style={{ color: C.text3 }}>·</span>
            <Badge tone="green" dot>
              Online
            </Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="secondary" size="md" icon={<Icon name="msg" size={14} />}>
            Message
          </Btn>
          <Btn kind="secondary" size="md" icon={<Icon name="clipboard" size={14} />}>
            Assign Practice
          </Btn>
        </div>
      </div>

      {/* Stats row */}
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
            ["Mastery", student.mastery, C.cyan],
            ["Engagement", student.engagement, C.cyan],
            ["Curiosity", student.curiosity, C.violet],
            ["Persistence", student.persistence, C.green],
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

      {/* Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1.85fr 1fr", gap: 16 }}>
        {/* Knowledge graph */}
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
            <span style={{ fontSize: 12, color: C.text1, fontWeight: 500 }}>Knowledge Map</span>
            <span style={{ fontSize: 11, color: C.text3 }}>
              · {DEFAULT_KG_NODES.length} concepts · {DEFAULT_KG_EDGES.length} connections
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              zIndex: 5,
              display: "flex",
              gap: 6,
            }}
          >
            {(["All", "Mastered", "Struggling", "Curiosity"] as const).map((t, i) => (
              <span
                key={t}
                style={{
                  padding: "4px 10px",
                  borderRadius: 99,
                  fontSize: 11,
                  background: i === 0 ? C.bg2 : "transparent",
                  color: i === 0 ? C.text0 : C.text2,
                  border: `1px solid ${i === 0 ? C.border : "transparent"}`,
                  cursor: "pointer",
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <KnowledgeGraph selectedId="n2" />
          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: "rgba(24,24,27,0.85)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${C.bg2}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 11,
            }}
          >
            <div
              style={{
                color: C.text2,
                marginBottom: 8,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Mastery
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(
                [
                  ["Mastered", C.green],
                  ["Proficient", C.cyan],
                  ["Developing", C.violet],
                  ["Struggling", C.orange],
                  ["Not started", C.zinc700],
                ] as const
              ).map(([l, c]) => (
                <div
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 8, color: C.text1 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      background: c,
                      opacity: 0.7,
                      border: `1.5px solid ${c}`,
                    }}
                  />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            height: 620,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 20, borderBottom: `1px solid ${C.bg2}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Badge tone="violet">7.NS.1d</Badge>
              <Badge tone="orange">Struggling</Badge>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>
              Adding Rational Numbers
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
              Number System · prerequisite for 6 concepts
            </div>
          </div>
          <div
            style={{
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 18,
              borderBottom: `1px solid ${C.bg2}`,
            }}
          >
            <Radial value={0.34} size={84} color={C.orange} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.orange, fontWeight: 600 }}>Struggling</div>
              <div style={{ fontSize: 12, color: C.text1, marginTop: 4 }}>
                Last practiced 2 days ago
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                Down from 41% last week
              </div>
            </div>
          </div>
          <div style={{ padding: 20, borderBottom: `1px solid ${C.bg2}` }}>
            <div
              style={{
                fontSize: 11,
                color: C.text2,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Performance
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12 }}>
              {(
                [
                  ["Attempts", "24"],
                  ["Avg Time", "72s"],
                  ["Hint Usage", "38%", C.amber],
                  ["Streak", "0"],
                ] as const
              ).map(([l, v, color]) => (
                <div key={l}>
                  <div style={{ color: C.text2 }}>{l}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily: FONT_MONO,
                      marginTop: 2,
                      color: color,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {l === "Streak" && <Icon name="flame" size={14} color={C.orange} />}
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>Error Types</div>
              <div
                style={{
                  display: "flex",
                  height: 8,
                  borderRadius: 99,
                  overflow: "hidden",
                  background: C.bg2,
                }}
              >
                <div style={{ width: "50%", background: C.red }} />
                <div style={{ width: "25%", background: C.orange }} />
                <div style={{ width: "15%", background: C.amber }} />
                <div style={{ width: "10%", background: C.text3 }} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: C.text2,
                  marginTop: 6,
                  flexWrap: "wrap",
                  gap: 4,
                }}
              >
                <span>
                  <span style={{ color: C.red }}>●</span> Sign errors 50%
                </span>
                <span>
                  <span style={{ color: C.orange }}>●</span> Computational 25%
                </span>
                <span>
                  <span style={{ color: C.amber }}>●</span> Careless 15%
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: 20, flex: 1, overflow: "auto" }}>
            <div
              style={{
                fontSize: 11,
                color: C.text2,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Behavioral Signals
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                [
                  ["sparkle", C.violet, '"Why does subtracting a negative add?"', "Asked yesterday"],
                  ["mountain", C.green, "Retried 5x on a hard problem before correct", "Persistence signal"],
                  ["flame", C.orange, "Spent 14 min on this concept this week", "Above avg time"],
                ] as const
              ).map(([icon, color, text, sub], i) => (
                <div
                  key={i}
                  style={{
                    background: C.bg2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <Icon name={icon as IconName} size={14} color={color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: C.text0, lineHeight: 1.4 }}>{text}</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              borderTop: `1px solid ${C.bg2}`,
              display: "flex",
              gap: 8,
            }}
          >
            <Btn
              kind="primary"
              size="md"
              style={{ flex: 1 }}
              icon={<Icon name="zap" size={13} color={C.bg0} />}
            >
              Assign Practice
            </Btn>
            <Btn kind="secondary" size="md">
              View Full
            </Btn>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
