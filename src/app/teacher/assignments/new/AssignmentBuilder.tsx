"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
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

type Concept = {
  id: string;
  code: string;
  name: string;
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
  questions: initialQuestions,
  concepts,
}: {
  classes: { id: string; name: string }[];
  initialClassId: string;
  questions: BankQuestion[];
  concepts: Concept[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [classId, setClassId] = React.useState(initialClassId);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [domainFilter, setDomainFilter] = React.useState<string>("");
  const [search, setSearch] = React.useState("");

  // AI question generation
  const [genOpen, setGenOpen] = React.useState(false);
  const [genConceptId, setGenConceptId] = React.useState(concepts[0]?.id ?? "");
  const [genDifficulty, setGenDifficulty] = React.useState(3);
  const [genUseRealWorld, setGenUseRealWorld] = React.useState(false);
  const [genLoading, setGenLoading] = React.useState(false);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [lastRealWorld, setLastRealWorld] = React.useState<{
    requested: boolean;
    eligibleSource: "weather" | "currency" | "none";
    used: boolean;
    source?: string;
  } | null>(null);

  // Mirror the server-side router: tells the user before they click Generate
  // whether real-time data is available for the selected standard.
  const eligibilityFor = (code: string): "weather" | "currency" | "none" => {
    if (/^7\.NS\.1/.test(code)) return "weather";
    if (/^7\.RP\./.test(code)) return "currency";
    if (/^7\.NS\.2/.test(code)) return "currency";
    if (/^7\.NS\.3/.test(code)) return "currency";
    if (/^7\.EE\.3/.test(code)) return "currency";
    return "none";
  };
  const selectedConcept = concepts.find((c) => c.id === genConceptId);
  const selectedEligibility = selectedConcept
    ? eligibilityFor(selectedConcept.code)
    : "none";

  // If the user picks a standard with no real-world source, auto-uncheck
  // the box so the option doesn't lie about what will happen.
  React.useEffect(() => {
    if (selectedEligibility === "none" && genUseRealWorld) {
      setGenUseRealWorld(false);
    }
  }, [selectedEligibility, genUseRealWorld]);

  const generateQuestion = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          curriculumNodeId: genConceptId,
          difficulty: genDifficulty,
          persist: true,
          useRealWorldContext: genUseRealWorld,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.message || data.error || "Failed");
      } else {
        if (data.realWorld) setLastRealWorld(data.realWorld);
        // Add to bank list and auto-select
        const concept = concepts.find((c) => c.id === genConceptId);
        if (concept && data.questionId) {
          const newQ: BankQuestion = {
            id: data.questionId,
            code: concept.code,
            text: data.generated.text,
            difficulty: data.generated.difficulty,
            domain: concept.domain,
          };
          setQuestions((prev) => [newQ, ...prev]);
          setSelected((prev) => [...prev, data.questionId]);
          setGenOpen(false);
          // Refresh server data on next nav
          router.refresh();
        }
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed");
    }
    setGenLoading(false);
  };

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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Question Bank ({questions.length})
              </div>
              <button
                type="button"
                onClick={() => setGenOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 99,
                  background: `${C.violet}10`,
                  color: C.violet,
                  border: `1px solid ${C.violet}33`,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Icon name="sparkle" size={11} color={C.violet} strokeWidth={2} /> Generate with AI
              </button>
            </div>
            {lastRealWorld && (
              <div
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  background: lastRealWorld.used ? `${C.green}10` : `${C.amber}10`,
                  border: `1px solid ${(lastRealWorld.used ? C.green : C.amber)}33`,
                  borderRadius: 8,
                  marginBottom: 10,
                  color: C.text1,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Icon
                  name={lastRealWorld.used ? "check" : "x"}
                  size={13}
                  color={lastRealWorld.used ? C.green : C.amber}
                  strokeWidth={2.5}
                />
                <div>
                  {lastRealWorld.used ? (
                    <>
                      <strong style={{ color: C.text0 }}>Real-time data attached.</strong>{" "}
                      {lastRealWorld.eligibleSource === "weather"
                        ? "Latest question is grounded in today's actual temperature data."
                        : "Latest question is grounded in today's actual currency exchange rate."}
                      {lastRealWorld.source ? (
                        <span style={{ display: "block", color: C.text3, marginTop: 2 }}>
                          Source: {lastRealWorld.source}
                        </span>
                      ) : null}
                    </>
                  ) : lastRealWorld.requested && lastRealWorld.eligibleSource === "none" ? (
                    <>
                      <strong style={{ color: C.text0 }}>No real-time data attached.</strong>{" "}
                      The selected standard has no applicable external API. Question was generated normally.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: C.text0 }}>External API unreachable.</strong>{" "}
                      Question was generated without real-time data this time. Try again to retry.
                    </>
                  )}
                </div>
              </div>
            )}
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

      {/* Generate-with-AI modal */}
      {genOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => !genLoading && setGenOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg1,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 28,
              width: "100%",
              maxWidth: 480,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Icon name="sparkle" size={18} color={C.violet} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Generate question with AI</div>
            </div>
            <div style={{ fontSize: 13, color: C.text1, lineHeight: 1.5, marginBottom: 22 }}>
              Cortex will generate a new multiple-choice question targeting the chosen Common Core
              standard at the difficulty you set. The question is saved to your bank.
            </div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              Standard
            </label>
            <select
              value={genConceptId}
              onChange={(e) => setGenConceptId(e.target.value)}
              disabled={genLoading}
              style={{ ...inputStyle, marginBottom: 14 }}
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              Difficulty: <span style={{ color: C.text0, fontFamily: FONT_MONO }}>{genDifficulty.toFixed(1)}</span>
              <span style={{ color: C.text3, marginLeft: 8 }}>(1 easy → 5 hard)</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={genDifficulty}
              onChange={(e) => setGenDifficulty(parseFloat(e.target.value))}
              disabled={genLoading}
              style={{ width: "100%", marginBottom: 14 }}
            />
            <label
              style={{
                fontSize: 13,
                color: C.text1,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 18,
                padding: 12,
                background: `${C.violet}08`,
                border: `1px solid ${C.violet}33`,
                borderRadius: 8,
                cursor: genLoading ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={genUseRealWorld}
                onChange={(e) => setGenUseRealWorld(e.target.checked)}
                disabled={genLoading || selectedEligibility === "none"}
                style={{ marginTop: 2 }}
              />
              <span>
                <span style={{ color: C.text0, fontWeight: 500 }}>Use real-time external data</span>
                <span style={{ color: C.text3, display: "block", fontSize: 11, marginTop: 2 }}>
                  {selectedEligibility === "weather" && (
                    <>This standard is signed-arithmetic — generation will pull today&rsquo;s actual temperature from Open-Meteo for a real US city.</>
                  )}
                  {selectedEligibility === "currency" && (
                    <>This standard involves rates / proportions — generation will pull today&rsquo;s actual USD exchange rate from open.er-api.com.</>
                  )}
                  {selectedEligibility === "none" && (
                    <span style={{ color: C.amber }}>
                      No real-time data source applies to this standard ({selectedConcept?.code}). Real-time grounding is available for signed-arithmetic (7.NS.1*), proportional reasoning (7.RP.*, 7.NS.2*, 7.NS.3), and multi-step real-world problems (7.EE.3). Pick one of those to enable this option.
                    </span>
                  )}
                </span>
              </span>
            </label>
            {genError && (
              <div
                style={{
                  fontSize: 13,
                  color: C.red,
                  background: `${C.red}06`,
                  border: `1px solid ${C.red}33`,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 14,
                }}
              >
                {genError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn
                kind="ghost"
                size="md"
                onClick={() => setGenOpen(false)}
                disabled={genLoading}
              >
                Cancel
              </Btn>
              <Btn
                kind="primary"
                size="md"
                onClick={generateQuestion}
                disabled={genLoading || !genConceptId}
                style={{ opacity: genLoading || !genConceptId ? 0.6 : 1 }}
                iconRight={
                  genLoading ? undefined : (
                    <Icon name="sparkle" size={13} color={C.bg0} strokeWidth={2} />
                  )
                }
              >
                {genLoading ? "Generating…" : "Generate"}
              </Btn>
            </div>
          </div>
        </div>
      )}
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
