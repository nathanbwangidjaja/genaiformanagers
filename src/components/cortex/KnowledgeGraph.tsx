"use client";
import * as React from "react";
import { C, FONT_MONO } from "./tokens";

export type KGNode = {
  id: string;
  x: number;
  y: number;
  r: number;
  m: number; // mastery 0..1, 0 = not started
  label: string;
  code: string;
  d: string; // domain key
};

export type KGEdge = [string, string];

export const DEFAULT_KG_NODES: KGNode[] = [
  // Ratios
  { id: "r1", x: 220, y: 130, r: 14, m: 0.85, label: "Unit Rates", code: "7.RP.1", d: "ratios" },
  { id: "r2", x: 320, y: 100, r: 18, m: 0.72, label: "Proportional Relationships", code: "7.RP.2", d: "ratios" },
  { id: "r3", x: 420, y: 150, r: 12, m: 0.65, label: "Constant of Proportionality", code: "7.RP.2b", d: "ratios" },
  { id: "r4", x: 280, y: 200, r: 11, m: 0.58, label: "Percent Problems", code: "7.RP.3", d: "ratios" },
  { id: "r5", x: 380, y: 230, r: 10, m: 0.42, label: "Multi-step Ratios", code: "7.RP.3a", d: "ratios" },
  // Number System
  { id: "n1", x: 600, y: 110, r: 13, m: 0.88, label: "Integer Operations", code: "7.NS.1", d: "numbers" },
  { id: "n2", x: 700, y: 170, r: 16, m: 0.34, label: "Adding Rationals", code: "7.NS.1d", d: "numbers" },
  { id: "n3", x: 620, y: 240, r: 11, m: 0.28, label: "Mult/Div Rationals", code: "7.NS.2", d: "numbers" },
  { id: "n4", x: 760, y: 260, r: 9, m: 0, label: "Convert Fractions/Decimals", code: "7.NS.2d", d: "numbers" },
  // Expressions
  { id: "e1", x: 860, y: 360, r: 14, m: 0.62, label: "Linear Expressions", code: "7.EE.1", d: "expressions" },
  { id: "e2", x: 780, y: 420, r: 12, m: 0.55, label: "Solve Equations", code: "7.EE.4", d: "expressions" },
  { id: "e3", x: 900, y: 470, r: 10, m: 0.48, label: "Inequalities", code: "7.EE.4b", d: "expressions" },
  { id: "e4", x: 700, y: 470, r: 9, m: 0, label: "Word Problems", code: "7.EE.3", d: "expressions" },
  // Geometry
  { id: "g1", x: 200, y: 380, r: 13, m: 0.92, label: "Scale Drawings", code: "7.G.1", d: "geometry" },
  { id: "g2", x: 320, y: 420, r: 11, m: 0.78, label: "Cross Sections", code: "7.G.3", d: "geometry" },
  { id: "g3", x: 250, y: 490, r: 10, m: 0.71, label: "Circumference", code: "7.G.4", d: "geometry" },
  { id: "g4", x: 410, y: 480, r: 9, m: 0.66, label: "Area Formulas", code: "7.G.6", d: "geometry" },
  // Statistics
  { id: "s1", x: 540, y: 460, r: 11, m: 0.51, label: "Random Samples", code: "7.SP.1", d: "stats" },
  { id: "s2", x: 600, y: 530, r: 10, m: 0.42, label: "Probability", code: "7.SP.5", d: "stats" },
  { id: "s3", x: 470, y: 540, r: 9, m: 0, label: "Compound Events", code: "7.SP.8", d: "stats" },
];

export const DEFAULT_KG_EDGES: KGEdge[] = [
  ["r1", "r2"], ["r2", "r3"], ["r2", "r4"], ["r4", "r5"], ["r3", "r5"],
  ["n1", "n2"], ["n2", "n3"], ["n3", "n4"],
  ["e1", "e2"], ["e2", "e3"], ["e2", "e4"],
  ["g1", "g2"], ["g1", "g3"], ["g2", "g4"], ["g3", "g4"],
  ["s1", "s2"], ["s1", "s3"], ["s2", "s3"],
  ["n2", "e1"], ["n3", "e2"], ["r3", "e1"], ["r4", "s1"], ["r5", "s2"], ["g4", "e3"],
];

export const DOMAIN_LABELS: Record<string, { name: string; color: string; x: number; y: number }> = {
  ratios: { name: "Ratios & Proportional Relationships", color: C.cyan, x: 320, y: 60 },
  numbers: { name: "The Number System", color: C.orange, x: 680, y: 60 },
  expressions: { name: "Expressions & Equations", color: C.violet, x: 800, y: 320 },
  geometry: { name: "Geometry", color: C.green, x: 280, y: 340 },
  stats: { name: "Statistics & Probability", color: C.pink, x: 540, y: 410 },
};

export function masteryColor(m: number): string {
  if (m === 0) return C.zinc700;
  if (m >= 0.8) return C.green;
  if (m >= 0.6) return C.cyan;
  if (m >= 0.3) return C.violet;
  return C.orange;
}

export function KnowledgeGraph({
  nodes = DEFAULT_KG_NODES,
  edges = DEFAULT_KG_EDGES,
  selectedId: initialSelectedId,
  width = 880,
  height = 620,
  onSelect,
  curiosityIds = ["r3", "g1", "r2"],
}: {
  nodes?: KGNode[];
  edges?: KGEdge[];
  selectedId?: string;
  width?: number;
  height?: number;
  onSelect?: (id: string | undefined) => void;
  curiosityIds?: string[];
}) {
  const [selectedId, setSelectedId] = React.useState<string | undefined>(initialSelectedId);
  React.useEffect(() => setSelectedId(initialSelectedId), [initialSelectedId]);

  const select = (id: string | undefined) => {
    setSelectedId(id);
    onSelect?.(id);
  };

  const connectedIds = new Set<string>();
  edges.forEach(([a, b]) => {
    if (a === selectedId) connectedIds.add(b);
    if (b === selectedId) connectedIds.add(a);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "100%", display: "block" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) select(undefined);
      }}
    >
      <defs>
        <linearGradient id="active-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.violet} />
        </linearGradient>
        {Object.entries(DOMAIN_LABELS).map(([k, d]) => (
          <radialGradient key={k} id={`hull-${k}`}>
            <stop offset="0%" stopColor={d.color} stopOpacity="0.05" />
            <stop offset="100%" stopColor={d.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {Object.entries(DOMAIN_LABELS).map(([k]) => {
        const ns = nodes.filter((n) => n.d === k);
        if (!ns.length) return null;
        const cx = ns.reduce((s, n) => s + n.x, 0) / ns.length;
        const cy = ns.reduce((s, n) => s + n.y, 0) / ns.length;
        return <ellipse key={k} cx={cx} cy={cy} rx={160} ry={120} fill={`url(#hull-${k})`} />;
      })}

      {Object.entries(DOMAIN_LABELS).map(([k, d]) => (
        <text
          key={k}
          x={d.x}
          y={d.y}
          fill={d.color}
          fontSize="10"
          textAnchor="middle"
          fontFamily={FONT_MONO}
          opacity={0.7}
          style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
        >
          {d.name}
        </text>
      ))}

      {edges.map(([a, b], i) => {
        const na = nodes.find((n) => n.id === a);
        const nb = nodes.find((n) => n.id === b);
        if (!na || !nb) return null;
        const isActive = a === selectedId || b === selectedId;
        return (
          <line
            key={i}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke={isActive ? "url(#active-edge)" : C.zinc700}
            strokeWidth={isActive ? 1.8 : 0.8}
            strokeDasharray={i % 6 === 0 ? "4 3" : ""}
            opacity={selectedId && !isActive ? 0.35 : 1}
          />
        );
      })}

      {nodes.map((n) => {
        const c = masteryColor(n.m);
        const isSelected = n.id === selectedId;
        const isConnected = connectedIds.has(n.id);
        const dimmed = !!selectedId && !isSelected && !isConnected;
        const hasCuriosity = curiosityIds.includes(n.id);
        return (
          <g
            key={n.id}
            opacity={dimmed ? 0.32 : 1}
            style={{ cursor: "pointer", transition: "opacity 200ms" }}
            onClick={() => select(n.id)}
          >
            <circle cx={n.x} cy={n.y} r={n.r * 2.5} fill={c} opacity={isSelected ? 0.18 : 0.06} />
            {isSelected && (
              <>
                <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
                <circle cx={n.x} cy={n.y} r={n.r + 14} fill="none" stroke={c} strokeWidth="0.5" opacity="0.25" />
              </>
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={c}
              fillOpacity={n.m === 0 ? 0.15 : 0.25}
              stroke={c}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            {hasCuriosity && (
              <g transform={`translate(${n.x + n.r - 2}, ${n.y - n.r - 2})`}>
                <circle r="3" fill={C.violet} opacity="0.3" />
                <circle r="1.5" fill={C.violet} />
              </g>
            )}
            {isSelected && (
              <text x={n.x} y={n.y - n.r - 12} fill={C.text0} fontSize="11" fontWeight="600" textAnchor="middle">
                {n.label}
              </text>
            )}
            {n.r >= 13 && !isSelected && (
              <text
                x={n.x}
                y={n.y - n.r - 6}
                fill={C.text1}
                fontSize="9"
                textAnchor="middle"
                fontFamily={FONT_MONO}
                opacity="0.7"
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
