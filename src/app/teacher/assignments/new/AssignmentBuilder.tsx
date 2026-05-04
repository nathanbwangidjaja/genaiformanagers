"use client";
import * as React from "react";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { createAssignment } from "@/server/actions";

type BankQuestion = {
  id: string;
  code: string;
  text: string;
  difficulty: number;
  domain: string;
};

const DOMAIN_LABELS: Record<string, string> = {
  RATIOS_PROPORTIONAL: "Ratios",
  NUMBER_SYSTEM: "Numbers",
  EXPRESSIONS_EQUATIONS: "Expressions",
  GEOMETRY: "Geometry",
  STATISTICS_PROBABILITY: "Stats",
};

function diffLabel(d: number) {
  if (d < 2.5) return { l: "Easy", t: "green" as const };
  if (d < 3.8) return { l: "Medium", t: "amber" as const };
  return { l: "Hard", t: "red" as const };
}

export function AssignmentBuilder({
  classes,
  initialClassId,
  questions,
}: {
  classes: { id: string; name: string }[];
  initialClassId: string;
  questions: BankQuestion[];
}) {
  const [classId, setClassId] = React.useState(initialClassId);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [domainFilter, setDomainFilter] = React.useState<string>("");
  const [search, setSearch] = React.useState("");

  const filtered = questions.filter((q) => {
    if (domainFilter && q.domain !== domainFilter) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase()) && !q.code.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (formData: FormData) => {
    formData.set("classId", classId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("dueDate", dueDate);
    selected.forEach((qid) => formData.append("questionIds", qid));
    await createAssignment(formData);
  };

  return (
    <form action={submit}>
      {/* Top form */}
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.bg2}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr",
          gap: 16,
        }}
      >
        <div>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Ratios Quick Quiz"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
            Class
          </label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={inputStyle}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
            Due date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief instructions for students"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: 560 }}>
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
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Question Bank ({questions.length})
            </div>
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
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: C.text0,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setDomainFilter("")}
                style={pillStyle(domainFilter === "")}
              >
                All
              </button>
              {Object.entries(DOMAIN_LABELS).map(([d, l]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomainFilter(d)}
                  style={pillStyle(domainFilter === d)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: C.text2, fontSize: 13 }}>
                No questions match your filters.
              </div>
            ) : (
              filtered.map((q) => {
                const sel = selected.includes(q.id);
                const d = diffLabel(q.difficulty);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    style={{
                      padding: "14px 18px",
                      borderBottom: `1px solid ${C.bg2}`,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      background: sel ? `${C.cyan}05` : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: sel ? C.cyan : C.bg2,
                        border: `1px solid ${sel ? C.cyan : C.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={sel ? "check" : "plus"}
                        size={12}
                        color={sel ? C.bg0 : C.text1}
                        strokeWidth={sel ? 3 : 2}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <Badge tone="violet" style={{ fontSize: 10, padding: "1px 8px" }}>
                          {q.code}
                        </Badge>
                        <Badge tone={d.t} style={{ fontSize: 10, padding: "1px 8px" }}>
                          {d.l}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.45 }}>{q.text}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected */}
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>{title || "Untitled assignment"}</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                {selected.length} question{selected.length === 1 ? "" : "s"} selected
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            {selected.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: C.text2, fontSize: 13 }}>
                Click questions in the bank to add them.
              </div>
            ) : (
              selected.map((qid, i) => {
                const q = questions.find((x) => x.id === qid)!;
                const d = diffLabel(q.difficulty);
                return (
                  <div
                    key={qid}
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
                        <Badge tone={d.t} style={{ fontSize: 10, padding: "1px 8px" }}>
                          {d.l}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.45 }}>{q.text}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(qid)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: C.text2,
                      }}
                    >
                      <Icon name="x" size={14} color={C.text2} />
                    </button>
                  </div>
                );
              })
            )}
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
                {selected.length}
              </span>{" "}
              selected
            </div>
            <Btn
              kind="primary"
              size="md"
              type="submit"
              disabled={!title || selected.length === 0}
              style={{ opacity: !title || selected.length === 0 ? 0.5 : 1 }}
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Create Assignment
            </Btn>
          </div>
        </div>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: C.bg2,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text0,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: 99,
  fontSize: 11,
  background: active ? `${C.cyan}10` : "transparent",
  color: active ? C.cyan : C.text2,
  border: `1px solid ${active ? `${C.cyan}33` : C.border}`,
  cursor: "pointer",
  fontFamily: "inherit",
});
