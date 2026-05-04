"use client";
import * as React from "react";
import { C, FONT_MONO } from "./tokens";

// Maps Prisma MathDomain enum -> presentation color
const DOMAIN_COLORS: Record<string, string> = {
  RATIOS_PROPORTIONAL: C.cyan,
  NUMBER_SYSTEM: C.orange,
  EXPRESSIONS_EQUATIONS: C.violet,
  GEOMETRY: C.green,
  STATISTICS_PROBABILITY: C.pink,
};

const DOMAIN_LABELS: Record<string, string> = {
  RATIOS_PROPORTIONAL: "Ratios & Proportional",
  NUMBER_SYSTEM: "Number System",
  EXPRESSIONS_EQUATIONS: "Expressions & Equations",
  GEOMETRY: "Geometry",
  STATISTICS_PROBABILITY: "Statistics & Probability",
};

export type StudentKGNode = {
  id: string;
  code: string;
  name: string;
  domain: string;
  mastery: number; // 0..1
};

export type StudentKGEdge = { from: string; to: string };

function masteryColor(m: number) {
  if (m === 0) return C.zinc700;
  if (m >= 0.8) return C.green;
  if (m >= 0.6) return C.cyan;
  if (m >= 0.3) return C.violet;
  return C.orange;
}

/**
 * Data-driven knowledge graph. Auto-lays out concept nodes by domain cluster.
 */
export function StudentKnowledgeGraph({
  nodes,
  edges,
}: {
  nodes: StudentKGNode[];
  edges: StudentKGEdge[];
}) {
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);

  const W = 880;
  const H = 600;

  // Group nodes by domain
  const grouped = React.useMemo(() => {
    const g: Record<string, StudentKGNode[]> = {};
    for (const n of nodes) {
      (g[n.domain] ??= []).push(n);
    }
    return g;
  }, [nodes]);

  const domains = Object.keys(grouped);

  // Compute cluster centers in a simple grid
  const clusterCenters: Record<string, { x: number; y: number }> = {};
  const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(domains.length))));
  const rows = Math.ceil(domains.length / cols);
  domains.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    clusterCenters[d] = {
      x: ((col + 0.5) / cols) * W,
      y: ((row + 0.5) / rows) * H,
    };
  });

  // Position nodes around their cluster center on a small radial layout
  const positions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const d of domains) {
      const center = clusterCenters[d];
      const items = grouped[d];
      const count = items.length;
      const radius = Math.min(110, 30 + count * 8);
      items.forEach((n, idx) => {
        if (count === 1) {
          map.set(n.id, { x: center.x, y: center.y });
        } else {
          const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
          map.set(n.id, {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
          });
        }
      });
    }
    return map;
  }, [grouped, domains]);

  const connectedIds = new Set<string>();
  for (const e of edges) {
    if (e.from === selectedId) connectedIds.add(e.to);
    if (e.to === selectedId) connectedIds.add(e.from);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "100%", display: "block" }}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) setSelectedId(undefined);
      }}
    >
      <defs>
        <linearGradient id="active-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.violet} />
        </linearGradient>
        {domains.map((d) => (
          <radialGradient key={d} id={`hull-${d}`}>
            <stop offset="0%" stopColor={DOMAIN_COLORS[d] ?? C.cyan} stopOpacity="0.05" />
            <stop offset="100%" stopColor={DOMAIN_COLORS[d] ?? C.cyan} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* Cluster halos */}
      {domains.map((d) => {
        const c = clusterCenters[d];
        return <ellipse key={d} cx={c.x} cy={c.y} rx={150} ry={120} fill={`url(#hull-${d})`} />;
      })}

      {/* Cluster labels */}
      {domains.map((d) => {
        const c = clusterCenters[d];
        return (
          <text
            key={d}
            x={c.x}
            y={c.y - 130}
            fill={DOMAIN_COLORS[d] ?? C.cyan}
            fontSize="10"
            textAnchor="middle"
            fontFamily={FONT_MONO}
            opacity={0.7}
            style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
          >
            {DOMAIN_LABELS[d] ?? d}
          </text>
        );
      })}

      {/* Edges */}
      {edges.map((e, i) => {
        const a = positions.get(e.from);
        const b = positions.get(e.to);
        if (!a || !b) return null;
        const isActive = e.from === selectedId || e.to === selectedId;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={isActive ? "url(#active-edge)" : C.zinc700}
            strokeWidth={isActive ? 1.8 : 0.7}
            opacity={selectedId && !isActive ? 0.3 : 1}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        const c = masteryColor(n.mastery);
        const isSelected = n.id === selectedId;
        const isConnected = connectedIds.has(n.id);
        const dimmed = !!selectedId && !isSelected && !isConnected;
        const r = 10 + n.mastery * 6;
        return (
          <g
            key={n.id}
            opacity={dimmed ? 0.32 : 1}
            style={{ cursor: "pointer", transition: "opacity 200ms" }}
            onClick={() => setSelectedId(n.id === selectedId ? undefined : n.id)}
          >
            <circle cx={p.x} cy={p.y} r={r * 2.2} fill={c} opacity={isSelected ? 0.18 : 0.06} />
            {isSelected && (
              <circle
                cx={p.x}
                cy={p.y}
                r={r + 8}
                fill="none"
                stroke={c}
                strokeWidth="1"
                opacity="0.4"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={c}
              fillOpacity={n.mastery === 0 ? 0.15 : 0.25}
              stroke={c}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            {isSelected && (
              <text
                x={p.x}
                y={p.y - r - 12}
                fill={C.text0}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {n.name}
              </text>
            )}
            {!isSelected && (
              <text
                x={p.x}
                y={p.y - r - 6}
                fill={C.text1}
                fontSize="9"
                textAnchor="middle"
                fontFamily={FONT_MONO}
                opacity="0.6"
              >
                {n.code}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
