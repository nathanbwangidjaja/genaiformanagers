import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card, Badge, Btn } from "@/components/cortex/primitives";
import { Icon, type IconName } from "@/components/cortex/Icon";

const STATS: Array<{
  label: string;
  value: string;
  trend: string;
  icon: IconName;
  gradient?: boolean;
  color?: string;
}> = [
  { label: "Total Students", value: "87", trend: "+4", icon: "users" },
  { label: "Active This Week", value: "72", trend: "+12%", icon: "zap" },
  { label: "Avg Mastery", value: "68%", trend: "+3.2%", icon: "trend", gradient: true },
  { label: "Alerts", value: "3", trend: "2 new", icon: "bell", color: C.orange },
];

const CLASSES = [
  { id: "7a", name: "Grade 7A · Period 1", students: 28, mastery: 0.72, color: C.cyan, due: 3 },
  { id: "7b", name: "Grade 7B · Period 3", students: 31, mastery: 0.64, color: C.violet, due: 1 },
  { id: "7c", name: "Grade 7C · Period 5", students: 28, mastery: 0.58, color: C.orange, due: 4 },
  { id: "honors", name: "Honors 7 · Period 6", students: 18, mastery: 0.84, color: C.green, due: 2 },
];

const ACTIVITY = [
  { tone: "green", icon: "check", t: "Sarah completed Ratios Assessment — 85%", sub: "2 min ago", who: "Sarah K." },
  { tone: "orange", icon: "flag", t: "5 students struggled with 7.NS.1 (Adding Rationals)", sub: "15 min ago", who: "7C · Period 5" },
  { tone: "violet", icon: "sparkle", t: '"Why do we flip and multiply?"', sub: "32 min ago", who: "Alex T." },
  { tone: "cyan", icon: "trend", t: "Maya leveled up: Proportional Reasoning → Mastered", sub: "1 hr ago", who: "Maya R." },
  { tone: "green", icon: "check", t: "Class 7A averaged 78% on Linear Equations quiz", sub: "2 hr ago", who: "7A · Period 1" },
] as const;

const TONE_COLOR: Record<string, string> = {
  green: C.green,
  orange: C.orange,
  violet: C.violet,
  cyan: C.cyan,
};

export default function TeacherDashboardPage() {
  return (
    <TeacherShell title="Dashboard">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.text1, marginBottom: 24 }}>
          Tuesday, May 5 · 3 alerts need your attention
        </div>
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
        {STATS.map((s) => (
          <Card key={s.label} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div
                style={{
                  fontSize: 11,
                  color: C.text2,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
              <Icon name={s.icon} size={16} color={C.text3} />
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 10,
                fontFamily: FONT_MONO,
                letterSpacing: "-0.02em",
                color: s.color,
                ...(s.gradient
                  ? {
                      background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }
                  : {}),
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
                fontSize: 12,
                color: C.green,
              }}
            >
              <Icon name="trend" size={11} color={C.green} />
              <span style={{ fontFamily: FONT_MONO }}>{s.trend}</span>
              <span style={{ color: C.text2, marginLeft: 4 }}>vs last week</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* Class cards */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>Your Classes</div>
            <Btn kind="ghost" size="sm" iconRight={<Icon name="plus" size={13} />}>
              New Class
            </Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {CLASSES.map((cls) => (
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
                    transition: "transform 200ms, border-color 200ms",
                  }}
                >
                  <div style={{ height: 3, background: cls.color }} />
                  <div style={{ padding: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                      {cls.students} students
                    </div>
                    <div style={{ display: "flex", gap: 3, marginTop: 14, marginBottom: 14 }}>
                      {["Ratios", "Numbers", "Expressions", "Geometry", "Stats"].map((d, i) => {
                        const v = cls.mastery + (i - 2) * 0.08;
                        const c = v > 0.7 ? C.cyan : v > 0.5 ? C.violet : C.orange;
                        return (
                          <div key={d} style={{ flex: 1 }}>
                            <div
                              style={{
                                height: 4,
                                background: C.bg2,
                                borderRadius: 99,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.max(0.1, v) * 100}%`,
                                  height: "100%",
                                  background: c,
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: C.text3,
                                marginTop: 4,
                                textAlign: "center",
                              }}
                            >
                              {d}
                            </div>
                          </div>
                        );
                      })}
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
                      <span>{cls.due} assignments due</span>
                      <span
                        style={{
                          color: C.cyan,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        View Class <Icon name="arrow" size={11} color={C.cyan} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Recent Activity</div>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: 4 }}>
              {ACTIVITY.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: 14,
                    borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${C.bg2}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: `${TONE_COLOR[e.tone]}10`,
                      border: `1px solid ${TONE_COLOR[e.tone]}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={e.icon as IconName} size={13} color={TONE_COLOR[e.tone]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.45 }}>{e.t}</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
                      {e.who} · {e.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: C.text2,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              AI Insight
            </div>
            <Card
              style={{
                padding: 18,
                background: `linear-gradient(135deg, ${C.violet}06, ${C.cyan}06)`,
                border: `1px solid ${C.violet}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Icon name="sparkle" size={16} color={C.violet} />
                <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text0 }}>
                  <b>7C struggles with negative-number operations.</b> Consider a 15-min mini-lesson
                  on number-line subtraction before Friday&apos;s quiz.{" "}
                  <span style={{ color: C.cyan, cursor: "pointer" }}>Generate plan →</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
