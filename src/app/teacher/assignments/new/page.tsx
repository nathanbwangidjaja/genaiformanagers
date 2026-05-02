import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const QUESTION_BANK = [
  { code: "7.RP.2b", diff: "Medium", t: "If 3 notebooks cost $7.50, how much do 8 notebooks cost?", sel: true },
  { code: "7.RP.1", diff: "Easy", t: "A car travels 240 miles in 4 hours. What is its unit rate?", sel: true },
  { code: "7.RP.3", diff: "Hard", t: "A jacket is on sale for 20% off. After tax (8%), the final price is $43.20…", sel: true },
  { code: "7.RP.2a", diff: "Medium", t: "Determine if the relationship in the table is proportional.", sel: false },
  { code: "7.RP.3a", diff: "Hard", t: "A recipe for 4 servings calls for 1.5 cups of flour. How much flour for 10 servings?", sel: false },
  { code: "7.RP.1", diff: "Easy", t: "Which is the better buy: 12 oz for $3.60 or 18 oz for $5.04?", sel: false },
];

const SELECTED = QUESTION_BANK.filter((q) => q.sel);

const STEPS = [
  { n: 1, t: "Details", s: "done" as const },
  { n: 2, t: "Questions", s: "active" as const },
  { n: 3, t: "Review", s: "future" as const },
  { n: 4, t: "Assign", s: "future" as const },
];

type Tone = "green" | "amber" | "red";
const diffTone = (d: string): Tone => (d === "Easy" ? "green" : d === "Medium" ? "amber" : "red");

export default function NewAssignmentPage() {
  return (
    <TeacherShell title="Create Assignment" breadcrumb={["Assignments", "New"]}>
      {/* Wizard */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 28,
          padding: "14px 20px",
          background: C.bg1,
          border: `1px solid ${C.bg2}`,
          borderRadius: 12,
        }}
      >
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "0 0 auto", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: s.s === "done" ? C.green : s.s === "active" ? C.cyan : C.bg2,
                  color: s.s === "future" ? C.text2 : C.bg0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT_MONO,
                }}
              >
                {s.s === "done" ? <Icon name="check" size={12} color={C.bg0} strokeWidth={3} /> : s.n}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: s.s === "future" ? C.text2 : C.text0,
                }}
              >
                {s.t}
              </span>
            </div>
            {i < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: s.s === "done" ? C.green : C.bg2,
                  margin: "0 16px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: 660 }}>
        {/* Question bank */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 18, borderBottom: `1px solid ${C.bg2}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Question Bank</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: C.bg2,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Icon name="search" size={13} color={C.text2} />
              <span style={{ fontSize: 13, color: C.text2 }}>Search 1,247 questions…</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge tone="cyan" dot>
                Ratios
              </Badge>
              <Badge tone="zinc">Numbers</Badge>
              <Badge tone="zinc">Expressions</Badge>
              <Badge tone="zinc">Geometry</Badge>
              <Badge tone="zinc">Stats</Badge>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {QUESTION_BANK.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${C.bg2}`,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  background: q.sel ? `${C.cyan}05` : "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: q.sel ? C.cyan : C.bg2,
                    border: `1px solid ${q.sel ? C.cyan : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    name={q.sel ? "check" : "plus"}
                    size={12}
                    color={q.sel ? C.bg0 : C.text1}
                    strokeWidth={q.sel ? 3 : 2}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <Badge tone="violet" style={{ fontSize: 10, padding: "1px 8px" }}>
                      {q.code}
                    </Badge>
                    <Badge tone={diffTone(q.diff)} style={{ fontSize: 10, padding: "1px 8px" }}>
                      {q.diff}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.45 }}>{q.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected questions */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom: `1px solid ${C.bg2}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Assignment: Ratios Quick Quiz</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                {SELECTED.length} questions · ~12 min · Medium difficulty
              </div>
            </div>
            <Badge tone="cyan" dot>
              Adaptive ON
            </Badge>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            {SELECTED.map((q, i) => (
              <div
                key={i}
                style={{
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: C.bg0,
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT_MONO,
                    color: C.cyan,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <Badge tone="violet" style={{ fontSize: 10, padding: "1px 8px" }}>
                      {q.code}
                    </Badge>
                    <Badge tone={diffTone(q.diff)} style={{ fontSize: 10, padding: "1px 8px" }}>
                      {q.diff}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.45 }}>{q.t}</div>
                </div>
                <Icon name="x" size={14} color={C.text2} />
              </div>
            ))}
            <div
              style={{
                border: `1px dashed ${C.violet}55`,
                borderRadius: 10,
                padding: 14,
                background: `${C.violet}05`,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Icon name="sparkle" size={14} color={C.violet} />
              <div style={{ flex: 1, fontSize: 12, color: C.text1 }}>
                <b style={{ color: C.text0 }}>AI suggests 2 more</b> to balance difficulty and cover
                7.RP.2a
              </div>
              <Btn kind="ghost" size="sm" style={{ color: C.violet }}>
                Add
              </Btn>
            </div>
          </div>
          <div
            style={{
              padding: 16,
              borderTop: `1px solid ${C.bg2}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: C.text2 }}>
              <span style={{ color: C.text0, fontWeight: 600, fontFamily: FONT_MONO }}>
                {SELECTED.length}
              </span>{" "}
              selected ·{" "}
              <span style={{ color: C.text0, fontFamily: FONT_MONO }}>~12</span> min
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="secondary" size="md">
                Save Draft
              </Btn>
              <Btn
                kind="primary"
                size="md"
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                Review
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
