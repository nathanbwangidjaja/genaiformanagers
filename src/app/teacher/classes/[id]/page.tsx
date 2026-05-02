import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge, Avatar, Bar, Radial } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const CLASS_INFO: Record<string, { name: string; code: string; students: number }> = {
  "7a": { name: "Grade 7A · Period 1", code: "MATH-7A-X3K", students: 28 },
  "7b": { name: "Grade 7B · Period 3", code: "MATH-7B-Q9R", students: 31 },
  "7c": { name: "Grade 7C · Period 5", code: "MATH-7C-K2W", students: 28 },
  honors: { name: "Honors 7 · Period 6", code: "HON-7-M1J", students: 18 },
};

const ROSTER = [
  { id: "maya", n: "Maya Rodriguez", m: 0.92, e: 0.95, c: 0.88, l: "5 min ago" },
  { id: "alex", n: "Alex Thompson", m: 0.72, e: 0.85, c: 0.91, l: "12 min ago", highlight: true },
  { id: "sarah", n: "Sarah Kim", m: 0.78, e: 0.72, c: 0.65, l: "1 hr ago" },
  { id: "jordan", n: "Jordan Lee", m: 0.65, e: 0.78, c: 0.55, l: "2 hr ago" },
  { id: "priya", n: "Priya Patel", m: 0.81, e: 0.88, c: 0.82, l: "Today" },
  { id: "marcus", n: "Marcus Chen", m: 0.45, e: 0.52, c: 0.42, l: "Yesterday" },
  { id: "emma", n: "Emma Foster", m: 0.68, e: 0.71, c: 0.78, l: "Yesterday" },
  { id: "tyler", n: "Tyler Brooks", m: 0.32, e: 0.45, c: 0.38, l: "2 days ago" },
];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = CLASS_INFO[id] ?? CLASS_INFO["7a"];

  return (
    <TeacherShell breadcrumb={["Classes", info.name]}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{info.name}</div>
        <Badge tone="cyan" dot>
          {info.students} students
        </Badge>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            background: C.bg2,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: FONT_MONO,
            color: C.cyan,
          }}
        >
          {info.code}
          <Icon name="copy" size={12} color={C.text2} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${C.bg2}`,
          marginTop: 24,
          marginBottom: 24,
        }}
      >
        {(["Overview", "Students", "Assignments", "Analytics"] as const).map((t, i) => (
          <div
            key={t}
            style={{
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              color: i === 1 ? C.cyan : C.text1,
              borderBottom: `2px solid ${i === 1 ? C.cyan : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 8,
          }}
        >
          <Icon name="search" size={14} color={C.text2} />
          <span style={{ fontSize: 13, color: C.text2 }}>Search students…</span>
        </div>
        <Btn kind="secondary" size="md" icon={<Icon name="chevD" size={12} />}>
          Sort: Mastery ↓
        </Btn>
        <Btn kind="secondary" size="md">
          All Domains
        </Btn>
      </div>

      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.bg2}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.6fr",
            padding: "12px 20px",
            borderBottom: `1px solid ${C.bg2}`,
            fontSize: 11,
            color: C.text2,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div>Student</div>
          <div>Mastery</div>
          <div>Engagement</div>
          <div>Curiosity</div>
          <div>Last Active</div>
          <div></div>
        </div>
        {ROSTER.map((s, i) => (
          <Link
            key={s.id}
            href={`/teacher/classes/${id}/students/${s.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.6fr",
                padding: "14px 20px",
                borderBottom: i < ROSTER.length - 1 ? `1px solid ${C.bg2}` : "none",
                alignItems: "center",
                background: s.highlight ? `${C.cyan}05` : "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={s.n} size={32} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>Grade 7</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Radial value={s.m} size={28} stroke={3} />
                <span
                  style={{
                    fontSize: 13,
                    color: C.text0,
                    fontFamily: FONT_MONO,
                    fontWeight: 600,
                  }}
                >
                  {Math.round(s.m * 100)}%
                </span>
              </div>
              <div style={{ width: "80%" }}>
                <Bar value={s.e} color={C.cyan} height={5} />
              </div>
              <div style={{ width: "80%" }}>
                <Bar value={s.c} color={C.violet} height={5} />
              </div>
              <div style={{ fontSize: 12, color: C.text2 }}>{s.l}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Icon name="chevR" size={14} color={C.text2} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </TeacherShell>
  );
}
