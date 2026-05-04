"use client";
import * as React from "react";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Card, Btn, Badge } from "@/components/cortex/primitives";
import { Icon, type IconName } from "@/components/cortex/Icon";
import { BrainGraph, type GraphNode } from "@/components/cortex/BrainGraph";

type SerializedNode = {
  id: string;
  type: string;
  label: string;
  externalKey?: string | null;
  props: Record<string, unknown>;
  createdAt: string;
};

type SerializedEdge = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  weight?: number;
};

type CachedInsight = {
  summary: string;
  highlights: { type: string; text: string }[];
  recommendations: { action: string; why: string }[];
  updatedAt: string;
} | null;

const TYPE_LABEL: Record<string, string> = {
  concept: "Concept",
  attempt: "Attempt",
  question: "Question",
  tutor_message: "Tutor message",
  misconception: "Misconception",
  strength: "Strength",
  curiosity_thread: "Curiosity thread",
  behavior: "Behavior",
  trait: "Cognitive trait",
  session: "Session",
  insight: "AI insight",
};

const TYPE_TONE: Record<string, "cyan" | "violet" | "amber" | "green" | "red" | "orange" | "pink" | "zinc"> = {
  concept: "cyan",
  attempt: "zinc",
  question: "zinc",
  tutor_message: "violet",
  misconception: "red",
  strength: "green",
  curiosity_thread: "violet",
  behavior: "pink",
  trait: "amber",
  session: "zinc",
  insight: "cyan",
};

export function StudentBrainView({
  studentId,
  studentName,
  nodes,
  edges,
  cachedInsight,
}: {
  studentId: string;
  studentName: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  cachedInsight: CachedInsight;
}) {
  const [selected, setSelected] = React.useState<GraphNode | null>(null);
  const [insight, setInsight] = React.useState(cachedInsight);
  const [insightLoading, setInsightLoading] = React.useState(false);
  const [insightError, setInsightError] = React.useState<string | null>(null);

  const generateInsight = async () => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await fetch(`/api/insight/${studentId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setInsightError(data.message || data.error || "Failed");
      } else {
        setInsight({
          summary: data.insight.summary,
          highlights: data.insight.highlights,
          recommendations: data.insight.recommendations,
          updatedAt: data.insight.updatedAt,
        });
      }
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Failed");
    }
    setInsightLoading(false);
  };

  // Stat strip — count by node type, useful at-a-glance
  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [nodes]);

  return (
    <>
      {/* Stats strip */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          fontSize: 12,
          color: C.text2,
          alignItems: "center",
        }}
      >
        <span>The graph contains:</span>
        {[
          ["concept", "concepts"],
          ["attempt", "attempts"],
          ["tutor_message", "tutor msgs"],
          ["misconception", "misconceptions"],
          ["strength", "strengths"],
          ["curiosity_thread", "curiosity threads"],
          ["trait", "traits"],
          ["behavior", "behaviors"],
        ].map(([type, label]) =>
          counts[type] ? (
            <Badge key={type} tone={TYPE_TONE[type] ?? "zinc"}>
              {counts[type]} {label}
            </Badge>
          ) : null,
        )}
      </div>

      {/* Two columns: graph + detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.85fr 1fr", gap: 16 }}>
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            height: 700,
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
              pointerEvents: "none",
            }}
          >
            <Icon name="brain" size={14} color={C.text1} />
            <span style={{ fontSize: 12, color: C.text1, fontWeight: 500 }}>
              {studentName}&apos;s brain
            </span>
            <span style={{ fontSize: 11, color: C.text3 }}>
              · click clusters to expand · drag nodes
            </span>
          </div>
          <BrainGraph
            nodes={nodes}
            edges={edges}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, height: 700 }}>
          {/* AI insight card (always visible at top) */}
          <Card
            style={{
              padding: 18,
              background: `linear-gradient(135deg, ${C.violet}06, ${C.cyan}06)`,
              border: `1px solid ${C.violet}33`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Icon name="sparkle" size={14} color={C.violet} />
              <Badge tone="violet" style={{ fontSize: 10 }}>
                AI BRIEF
              </Badge>
              {insight && (
                <span style={{ fontSize: 10, color: C.text3, marginLeft: "auto" }}>
                  {new Date(insight.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
            {insight ? (
              <>
                <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.55, marginBottom: 12 }}>
                  {insight.summary}
                </div>
                <Btn
                  kind="ghost"
                  size="sm"
                  onClick={generateInsight}
                  disabled={insightLoading}
                  icon={<Icon name="sparkle" size={11} color={C.violet} strokeWidth={2} />}
                >
                  {insightLoading ? "Refreshing…" : "Refresh"}
                </Btn>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginBottom: 12 }}>
                  Generate a teacher-facing summary of {studentName}&apos;s brain.
                </div>
                <Btn
                  kind="primary"
                  size="sm"
                  onClick={generateInsight}
                  disabled={insightLoading}
                  iconRight={<Icon name="sparkle" size={11} color={C.bg0} strokeWidth={2} />}
                >
                  {insightLoading ? "Generating…" : "Generate Insight"}
                </Btn>
              </>
            )}
            {insightError && (
              <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{insightError}</div>
            )}
          </Card>

          {/* Detail panel — what's selected in the graph */}
          <Card style={{ padding: 22, flex: 1, overflow: "auto" }}>
            {selected ? (
              <NodeDetail node={selected} allNodes={nodes} allEdges={edges} />
            ) : insight ? (
              <InsightDetail insight={insight} />
            ) : (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <Icon name="brain" size={28} color={C.text3} />
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 14 }}>
                  Click any node to inspect
                </div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>
                  Each node tells a story. Concepts show mastery + weakness. Attempts show
                  their context. Tutor messages show what&apos;s on the student&apos;s mind.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Detail panel renderers per node type
// ============================================================================

function NodeDetail({
  node,
  allNodes,
  allEdges,
}: {
  node: GraphNode;
  allNodes: SerializedNode[];
  allEdges: SerializedEdge[];
}) {
  // Find connected neighbors
  const connectedEdges = allEdges.filter((e) => e.fromId === node.id || e.toId === node.id);
  const neighborIds = new Set(
    connectedEdges.flatMap((e) => [e.fromId, e.toId]).filter((id) => id !== node.id),
  );
  const neighbors = allNodes.filter((n) => neighborIds.has(n.id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Badge tone={TYPE_TONE[node.type] ?? "zinc"}>{TYPE_LABEL[node.type] ?? node.type}</Badge>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{node.label}</div>

      {node.type === "concept" && <ConceptDetail props={node.props ?? {}} />}
      {node.type === "behavior" && <BehaviorDetail props={node.props ?? {}} />}
      {node.type === "trait" && <TraitDetail props={node.props ?? {}} />}
      {node.type === "misconception" && <MisconceptionDetail props={node.props ?? {}} />}
      {node.type === "strength" && <StrengthDetail props={node.props ?? {}} />}
      {node.type === "curiosity_thread" && <CuriosityDetail props={node.props ?? {}} />}
      {node.type === "tutor_message" && <TutorMessageDetail props={node.props ?? {}} />}
      {node.type === "attempt" && <AttemptDetail props={node.props ?? {}} />}

      {neighbors.length > 0 && (
        <>
          <div
            style={{
              marginTop: 24,
              fontSize: 11,
              color: C.text2,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Connected to ({neighbors.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {neighbors.slice(0, 12).map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: C.bg2,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <Badge tone={TYPE_TONE[n.type] ?? "zinc"} style={{ fontSize: 9 }}>
                  {TYPE_LABEL[n.type] ?? n.type}
                </Badge>
                <span
                  style={{
                    flex: 1,
                    color: C.text1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {n.label}
                </span>
              </div>
            ))}
            {neighbors.length > 12 && (
              <div style={{ fontSize: 11, color: C.text3, textAlign: "center", marginTop: 4 }}>
                + {neighbors.length - 12} more
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ConceptDetail({ props: p }: { props: Record<string, unknown> }) {
  const mastery = (p.mastery as number) ?? 0;
  const flow = (p.flowFraction as number) ?? 0;
  const weakness = (p.weaknessCategory as string) ?? "UNTESTED";
  const errs = (p.errorPatternCounts as Record<string, number> | undefined) ?? {};
  const totalErrs = Object.values(errs).reduce((a, b) => a + b, 0);
  return (
    <>
      <DetailRow label="Mastery" value={`${Math.round(mastery * 100)}%`} bar={mastery} barColor={C.cyan} />
      <DetailRow label="Time in flow" value={`${Math.round(flow * 100)}%`} bar={flow} barColor={C.pink} />
      <DetailRow label="Attempts" value={`${(p.totalAttempts as number) ?? 0}`} />
      <DetailRow label="Streak" value={`${(p.streak as number) ?? 0}`} />
      <DetailRow label="Hint usage" value={`${Math.round(((p.hintRate as number) ?? 0) * 100)}%`} />
      <DetailRow label="Weakness" value={weakness.replace(/_/g, " ")} />
      {totalErrs > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 6 }}>Error mix</div>
          {Object.entries(errs).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.text1 }}>{k}</span>
              <span style={{ color: C.text0, fontFamily: FONT_MONO }}>
                {v} ({Math.round((v / totalErrs) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BehaviorDetail({ props: p }: { props: Record<string, unknown> }) {
  const v = (p.value as number) ?? 0;
  return (
    <>
      <DetailRow label={(p.kind as string) ?? "Behavior"} value={`${Math.round(v * 100)}%`} bar={v} barColor={C.pink} />
      <div style={{ fontSize: 12, color: C.text2, marginTop: 12 }}>
        Composite score derived from this student&apos;s interaction patterns over the last 30 days.
      </div>
    </>
  );
}

function TraitDetail({ props: p }: { props: Record<string, unknown> }) {
  const v = (p.value as number) ?? 0;
  const conf = (p.confidence as number) ?? 0;
  return (
    <>
      <DetailRow label="Strength" value={`${Math.round(v * 100)}%`} bar={v} barColor={C.amber} />
      <DetailRow label="Confidence" value={`${Math.round(conf * 100)}%`} bar={conf} barColor={C.cyan} />
      <div style={{ fontSize: 12, color: C.text1, marginTop: 12, lineHeight: 1.5 }}>
        {(p.evidence as string) ?? "No evidence recorded."}
      </div>
    </>
  );
}

function MisconceptionDetail({ props: p }: { props: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Error type" value={(p.errorType as string) ?? "?"} />
      <DetailRow label="Occurrences" value={`${(p.occurrences as number) ?? 0}`} />
      <DetailRow label="First seen" value={p.firstSeenAt ? new Date(p.firstSeenAt as string).toLocaleString() : "—"} />
      <div style={{ fontSize: 12, color: C.text1, marginTop: 12, lineHeight: 1.5 }}>
        This student has made the same kind of mistake on this concept multiple times — a pattern,
        not a one-off slip.
      </div>
    </>
  );
}

function StrengthDetail({ props: p }: { props: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Evidence type" value={(p.evidenceType as string)?.replace(/_/g, " ") ?? "?"} />
      <div style={{ fontSize: 12, color: C.text1, marginTop: 12, lineHeight: 1.5 }}>
        Sustained success without scaffolding. Push them with a stretch problem in this area.
      </div>
    </>
  );
}

function CuriosityDetail({ props: p }: { props: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Topic" value={(p.topic as string) ?? "?"} />
      <DetailRow label="Tutor messages" value={`${(p.messageCount as number) ?? 0}`} />
      <div style={{ fontSize: 12, color: C.text1, marginTop: 12, lineHeight: 1.5 }}>
        This student has asked multiple &ldquo;why&rdquo; questions about this topic — a strong signal
        of genuine curiosity.
      </div>
    </>
  );
}

function TutorMessageDetail({ props: p }: { props: Record<string, unknown> }) {
  const intent = (p.intent as string) ?? "unknown";
  return (
    <>
      <DetailRow label="Intent" value={intent.replace(/_/g, " ")} />
      <DetailRow
        label="Confidence"
        value={`${Math.round(((p.confidence as number) ?? 0) * 100)}%`}
      />
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          fontSize: 13,
          color: C.text0,
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        &ldquo;{(p.text as string) ?? "(no text)"}&rdquo;
      </div>
    </>
  );
}

function AttemptDetail({ props: p }: { props: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Result" value={p.isCorrect ? "Correct" : "Incorrect"} />
      <DetailRow
        label="Time"
        value={p.timeMs ? `${Math.round((p.timeMs as number) / 1000)}s` : "—"}
      />
      <DetailRow label="Hints used" value={`${(p.hintsUsed as number) ?? 0}`} />
      {p.errorType ? <DetailRow label="Error type" value={p.errorType as string} /> : null}
      {p.inFlow !== undefined ? (
        <DetailRow label="In flow" value={p.inFlow ? "Yes" : "No"} />
      ) : null}
    </>
  );
}

function DetailRow({
  label,
  value,
  bar,
  barColor,
}: {
  label: string;
  value: string;
  bar?: number;
  barColor?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: C.text2 }}>{label}</span>
        <span style={{ color: C.text0, fontFamily: FONT_MONO }}>{value}</span>
      </div>
      {bar !== undefined && (
        <div style={{ marginTop: 4 }}>
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
                width: `${Math.max(0, Math.min(1, bar)) * 100}%`,
                height: "100%",
                background: barColor ?? C.cyan,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InsightDetail({ insight }: { insight: NonNullable<CachedInsight> }) {
  const HIGHLIGHT_META: Record<string, { color: string; icon: IconName; label: string }> = {
    strength: { color: C.green, icon: "check", label: "Strength" },
    risk: { color: C.red, icon: "flag", label: "Risk" },
    curiosity: { color: C.violet, icon: "sparkle", label: "Curiosity" },
    growth: { color: C.cyan, icon: "trend", label: "Growth" },
  };
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: C.text2,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Highlights
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {insight.highlights.map((h, i) => {
          const meta = HIGHLIGHT_META[h.type] ?? HIGHLIGHT_META.growth;
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  flexShrink: 0,
                  background: `${meta.color}10`,
                  border: `1px solid ${meta.color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={meta.icon} size={12} color={meta.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: meta.color,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {meta.label}
                </div>
                <div style={{ fontSize: 13, color: C.text0, lineHeight: 1.5 }}>{h.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 11,
          color: C.text2,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Recommended actions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {insight.recommendations.map((r, i) => (
          <div
            key={i}
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text0 }}>{r.action}</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{r.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
