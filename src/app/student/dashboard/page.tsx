import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Card, Btn, Badge, Bar, Radial } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const DOMAIN_PROGRESS = [
  ["Geometry", 0.78, C.green],
  ["Ratios & Proportions", 0.65, C.cyan],
  ["Statistics & Probability", 0.45, C.violet],
  ["Expressions & Equations", 0.55, C.violet],
  ["Number System", 0.30, C.orange],
] as const;

const DUE = [
  { id: "ratios-quiz", t: "Ratios & Proportions Quiz", due: "Due tomorrow", tone: "amber" as const, prog: 0, qs: 10, color: C.cyan },
  { id: "linear", t: "Linear Expressions Practice", due: "Due in 3 days", tone: "cyan" as const, prog: 0.4, qs: 8, color: C.violet },
  { id: "geom", t: "Geometry Review", due: "Due Friday", tone: "cyan" as const, prog: 0, qs: 12, color: C.green },
];

const RECOMMENDED = [
  { t: "Adding Rationals", d: "Number System", s: 34, why: "You scored 34% — practice to grow", color: C.orange, tone: "orange" as const },
  { t: "Multi-step Ratios", d: "Ratios", s: 42, why: "Almost there! Just a few problems", color: C.violet, tone: "violet" as const },
  { t: "Compound Probability", d: "Statistics", s: 0, why: "You haven't tried this yet", color: C.cyan, tone: "cyan" as const },
];

export default function StudentDashboardPage() {
  return (
    <StudentShell>
      <div style={{ padding: "36px 48px", maxWidth: 1100 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          Good evening,{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Alex
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: C.text1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <Icon name="flame" size={14} color={C.orange} />
          <span>You&apos;re on a 5-day streak — nice work!</span>
        </div>

        {/* Progress overview */}
        <Card style={{ padding: 28, marginBottom: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 32,
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Radial value={0.34} size={140} stroke={10} color={C.cyan} />
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
                12 of 35 concepts
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.text2, marginBottom: 14 }}>
                Your strengths across Grade 7 Math
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {DOMAIN_PROGRESS.map(([n, v, c]) => (
                  <div
                    key={n}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 1fr 50px",
                      alignItems: "center",
                      gap: 14,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.text1 }}>{n}</span>
                    <Bar value={v} color={c} height={8} />
                    <span
                      style={{
                        color: c,
                        fontFamily: FONT_MONO,
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {Math.round(v * 100)}%
                    </span>
                  </div>
                ))}
              </div>
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
          <Link href="/student/assignments" style={{ fontSize: 13, color: C.cyan, textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {DUE.map((a, i) => (
            <Link
              key={i}
              href={`/student/assignments/${a.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: C.bg1,
                  border: `1px solid ${C.bg2}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderLeft: `3px solid ${a.color}`,
                  padding: 18,
                  cursor: "pointer",
                  height: "100%",
                }}
              >
                <Badge tone={a.tone} style={{ fontSize: 10 }}>
                  {a.due}
                </Badge>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{a.t}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                  {Math.round(a.prog * a.qs)}/{a.qs} questions completed
                </div>
                <div style={{ marginTop: 12 }}>
                  <Bar value={a.prog} color={a.color} height={4} />
                </div>
                <Btn
                  kind={a.prog > 0 ? "primary" : "secondary"}
                  size="sm"
                  style={{ width: "100%", marginTop: 14 }}
                >
                  {a.prog > 0 ? "Continue" : "Start"}
                </Btn>
              </div>
            </Link>
          ))}
        </div>

        {/* Recommended */}
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
          <Icon name="sparkle" size={16} color={C.violet} /> Recommended for you
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {RECOMMENDED.map((r, i) => (
            <div
              key={i}
              style={{
                background: `${r.color}05`,
                border: `1px solid ${r.color}33`,
                borderRadius: 12,
                padding: 18,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 100,
                  height: 100,
                  borderRadius: 99,
                  background: `radial-gradient(circle, ${r.color}20, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <Badge tone={r.tone} dot>
                {r.d}
              </Badge>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{r.t}</div>
              <div style={{ fontSize: 12, color: C.text1, marginTop: 6, lineHeight: 1.4 }}>
                {r.why}
              </div>
              <Btn
                kind="secondary"
                size="sm"
                style={{ marginTop: 14 }}
                iconRight={<Icon name="arrow" size={12} />}
              >
                Practice
              </Btn>
            </div>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
