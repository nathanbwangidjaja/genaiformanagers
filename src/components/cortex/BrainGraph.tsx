"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { C } from "./tokens";

// react-force-graph-2d uses canvas; load it client-only to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.text2,
        fontSize: 13,
      }}
    >
      Loading graph…
    </div>
  ),
});

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  externalKey?: string | null;
  props?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  weight?: number;
};

interface ForceGraphNode {
  id: string;
  type: string;
  label: string;
  externalKey?: string | null;
  props: Record<string, unknown>;
  // injected by force-graph
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface ForceGraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  type: string;
  edgeId: string;
}

const TYPE_PALETTE: Record<string, string> = {
  concept: C.cyan,
  attempt: C.text2,
  question: C.text3,
  tutor_message: C.violet,
  misconception: C.red,
  strength: C.green,
  curiosity_thread: C.violet,
  behavior: C.pink,
  trait: C.amber,
  session: C.text3,
  insight: C.cyan,
};

function masteryColor(m: number) {
  if (m >= 0.8) return C.green;
  if (m >= 0.6) return C.cyan;
  if (m >= 0.3) return C.violet;
  if (m > 0) return C.orange;
  return C.text3;
}

/** Color picked from type + props (e.g. concepts colored by mastery). */
function nodeColor(n: ForceGraphNode): string {
  if (n.type === "concept") {
    const m = (n.props.mastery as number | undefined) ?? 0;
    return masteryColor(m);
  }
  if (n.type === "attempt") {
    return n.props.isCorrect ? C.green : C.orange;
  }
  return TYPE_PALETTE[n.type] ?? C.text3;
}

/** Radius varies by type and props. */
function nodeRadius(n: ForceGraphNode): number {
  if (n.type === "concept") {
    const a = (n.props.totalAttempts as number | undefined) ?? 0;
    return Math.min(18, 9 + a * 0.6);
  }
  if (n.type === "behavior") {
    const v = (n.props.value as number | undefined) ?? 0;
    return 11 + v * 12;
  }
  if (n.type === "trait") return 9;
  if (n.type === "misconception" || n.type === "strength") return 11;
  if (n.type === "curiosity_thread") return 9;
  if (n.type === "tutor_message") return 5;
  if (n.type === "attempt") return 4;
  if (n.type === "question") return 5;
  if (n.type === "session") return 6;
  if (n.type === "insight") return 10;
  return 5;
}

/** Edge color by type. */
function edgeColor(t: string): string {
  switch (t) {
    case "prerequisite_of":
      return `${C.text3}99`;
    case "manifests_in":
    case "contributes_to":
      return `${C.amber}77`;
    case "evidences":
    case "demonstrates":
      return `${C.violet}88`;
    case "asked_about":
      return `${C.violet}77`;
    case "confused_about":
      return `${C.red}88`;
    case "understood":
      return `${C.green}88`;
    case "practiced_in":
      return `${C.cyan}55`;
    case "instance_of":
      return `${C.text3}55`;
    case "tested_by":
      return `${C.text3}55`;
    case "during":
      return `${C.text3}44`;
    case "references":
      return `${C.cyan}66`;
    default:
      return `${C.text3}55`;
  }
}

/** Edge width by type. */
function edgeWidth(t: string): number {
  if (t === "prerequisite_of") return 1.5;
  if (t === "manifests_in" || t === "contributes_to") return 1.0;
  if (t === "evidences" || t === "demonstrates") return 1.2;
  if (t === "confused_about" || t === "understood") return 1.2;
  return 0.7;
}

export function BrainGraph({
  nodes,
  edges,
  onSelect,
  selectedId,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelect?: (node: GraphNode | null) => void;
  selectedId?: string | null;
}) {
  const [containerSize, setContainerSize] = React.useState({ width: 800, height: 600 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = React.useRef<any>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const node = containerRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setContainerSize({ width: r.width, height: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build the data the force-graph library expects (nodes + links arrays)
  const graphData = React.useMemo(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const visibleNodes: ForceGraphNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      externalKey: n.externalKey,
      props: n.props ?? {},
    }));
    const visibleLinks: ForceGraphLink[] = edges
      .filter((e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId))
      .map((e) => ({
        source: e.fromId,
        target: e.toId,
        type: e.type,
        edgeId: e.id,
      }));
    return { nodes: visibleNodes, links: visibleLinks };
  }, [nodes, edges]);

  // Configure forces — strong repulsion + collision detection so the graph
  // breathes instead of collapsing into a blob.
  React.useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force?.("charge");
    if (charge?.strength) charge.strength(-180);
    const link = fg.d3Force?.("link");
    if (link?.distance) link.distance(60);
  }, [graphData]);

  // Track which node id is currently the "neighbor highlight" target
  const neighborIds = React.useMemo(() => {
    if (!selectedId) return null;
    const s = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.fromId === selectedId) s.add(e.toId);
      if (e.toId === selectedId) s.add(e.fromId);
    }
    return s;
  }, [selectedId, edges]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <ForceGraph2D
        ref={fgRef}
        width={containerSize.width}
        height={containerSize.height}
        graphData={graphData}
        backgroundColor={C.bg1}
        nodeRelSize={1}
        cooldownTicks={300}
        d3AlphaDecay={0.012}
        d3VelocityDecay={0.4}
        warmupTicks={50}
        linkColor={(link) => {
          const l = link as ForceGraphLink;
          // Dim non-related links when something is selected
          if (selectedId && neighborIds) {
            const fromId = typeof l.source === "string" ? l.source : l.source.id;
            const toId = typeof l.target === "string" ? l.target : l.target.id;
            const related = fromId === selectedId || toId === selectedId;
            return related ? edgeColor(l.type) : `${C.text3}15`;
          }
          return edgeColor(l.type);
        }}
        linkWidth={(link) => edgeWidth((link as ForceGraphLink).type)}
        linkDirectionalParticles={(link) => {
          const l = link as ForceGraphLink;
          if (!selectedId) return 0;
          const fromId = typeof l.source === "string" ? l.source : l.source.id;
          const toId = typeof l.target === "string" ? l.target : l.target.id;
          return fromId === selectedId || toId === selectedId ? 2 : 0;
        }}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        nodePointerAreaPaint={(node, color, ctx, globalScale) => {
          const n = node as ForceGraphNode;
          // Match the visible node size for accurate hit testing
          const r = nodeRadius(n) / Math.max(0.5, globalScale ?? 1);
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          ctx.beginPath();
          ctx.arc(x, y, r * 1.6, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as ForceGraphNode;
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          // Make sizes screen-relative — divide by zoom so nodes don't bloat
          // when you zoom in. Clamp the divisor so they don't vanish when
          // zoomed way out either.
          const scale = Math.max(0.5, Math.min(4, globalScale));
          const r = nodeRadius(n) / scale;
          const isSelected = selectedId === n.id;
          const dimmed = !!selectedId && neighborIds && !neighborIds.has(n.id);
          const fill = nodeColor(n);
          const alpha = dimmed ? 0.25 : 1;

          // Halo
          ctx.beginPath();
          ctx.arc(x, y, r * 2.2, 0, 2 * Math.PI);
          ctx.fillStyle = `${fill}${alpha < 1 ? "10" : "22"}`;
          ctx.fill();

          // Selection ring (also screen-relative)
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, r + 8 / scale, 0, 2 * Math.PI);
            ctx.strokeStyle = fill;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, r + 14 / scale, 0, 2 * Math.PI);
            ctx.strokeStyle = `${fill}55`;
            ctx.lineWidth = 1 / scale;
            ctx.stroke();
          }

          // Shape per type
          if (n.type === "trait") {
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r, y);
            ctx.lineTo(x, y + r);
            ctx.lineTo(x - r, y);
            ctx.closePath();
          } else if (n.type === "misconception" || n.type === "strength") {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const px = x + r * Math.cos(angle);
              const py = y + r * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
          } else if (n.type === "behavior") {
            // Hollow square for distinction
            ctx.beginPath();
            ctx.rect(x - r, y - r, r * 2, r * 2);
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
          }

          ctx.fillStyle = `${fill}${alpha < 1 ? "30" : "66"}`;
          ctx.fill();
          ctx.strokeStyle = dimmed ? `${fill}55` : fill;
          ctx.lineWidth = (isSelected ? 2.5 : 1.5) / scale;
          ctx.stroke();

          // Label rules: always show concept codes, behavior labels, misconception
          // labels, strength labels, traits at high zoom; show selected always
          const showLabel =
            isSelected ||
            n.type === "behavior" ||
            n.type === "misconception" ||
            n.type === "strength" ||
            n.type === "curiosity_thread" ||
            (n.type === "concept" && globalScale > 0.7) ||
            (n.type === "trait" && globalScale > 0.9);
          if (showLabel && !dimmed) {
            const label =
              n.type === "concept" ? ((n.props.code as string) ?? n.label) : n.label;
            // Screen-relative font size — stays readable at any zoom
            const fontSize = (isSelected ? 12 : 10) / scale;
            ctx.font = `${isSelected ? "600 " : ""}${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = isSelected ? C.text0 : C.text1;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(label, x, y + r + 4 / scale);
          }
        }}
        onNodeClick={(node) => {
          const n = node as ForceGraphNode;
          onSelect?.({
            id: n.id,
            type: n.type,
            label: n.label,
            externalKey: n.externalKey,
            props: n.props,
          });
        }}
        onBackgroundClick={() => onSelect?.(null)}
      />

      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 16,
          background: "rgba(24,24,27,0.85)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${C.bg2}`,
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 11,
          color: C.text1,
          pointerEvents: "none",
        }}
      >
        <div style={{ color: C.text2, marginBottom: 6, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Node types
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "4px 12px" }}>
          {[
            ["concept", "● concept"],
            ["attempt", "● attempt"],
            ["tutor_message", "● tutor msg"],
            ["misconception", "⬡ misconception"],
            ["strength", "⬡ strength"],
            ["trait", "◆ trait"],
            ["behavior", "■ behavior"],
            ["curiosity_thread", "● curiosity"],
          ].map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: TYPE_PALETTE[key] ?? C.text3 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
