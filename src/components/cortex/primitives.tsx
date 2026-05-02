import * as React from "react";
import { C, FONT_SANS, FONT_MONO } from "./tokens";

// --- Logo ---
export function CortexMark({ size = 22, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <defs>
        <radialGradient id="cx-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <circle cx="12" cy="13" r="6" fill="url(#cx-glow)" />}
      <line x1="6" y1="18" x2="18" y2="18" stroke={C.text0} strokeWidth="1.2" />
      <line x1="6" y1="18" x2="12" y2="7" stroke={C.text0} strokeWidth="1.2" />
      <line x1="18" y1="18" x2="12" y2="7" stroke={C.text0} strokeWidth="1.2" />
      <circle cx="6" cy="18" r="1.8" fill={C.bg0} stroke={C.text0} strokeWidth="1.2" />
      <circle cx="18" cy="18" r="1.8" fill={C.bg0} stroke={C.text0} strokeWidth="1.2" />
      <circle cx="12" cy="7" r="2.2" fill={C.cyan} stroke={C.cyan} strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ size = 22, color = C.text0 }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <CortexMark size={size} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: size * 0.82,
          letterSpacing: "-0.01em",
          color,
        }}
      >
        cortex
      </span>
    </div>
  );
}

// --- Button ---
type BtnKind = "primary" | "primaryRound" | "secondary" | "secondaryRound" | "ghost" | "cyan";
type BtnSize = "sm" | "md" | "lg";

export function Btn({
  kind = "primary",
  size = "md",
  children,
  icon,
  iconRight,
  style,
  ...rest
}: {
  kind?: BtnKind;
  size?: BtnSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style">) {
  const sizes: Record<BtnSize, { p: string; fs: number }> = {
    sm: { p: "6px 12px", fs: 13 },
    md: { p: "10px 18px", fs: 14 },
    lg: { p: "14px 24px", fs: 15 },
  };
  const s = sizes[size];
  const variants: Record<BtnKind, { bg: string; color: string; border: string; radius?: number }> = {
    primary: { bg: C.text0, color: C.bg0, border: "none" },
    primaryRound: { bg: C.text0, color: C.bg0, border: "none", radius: 9999 },
    secondary: { bg: "transparent", color: C.text0, border: `1px solid ${C.border}` },
    secondaryRound: { bg: "transparent", color: C.text0, border: `1px solid ${C.border}`, radius: 9999 },
    ghost: { bg: "transparent", color: C.text1, border: "none" },
    cyan: { bg: "rgba(34,211,238,0.1)", color: C.cyan, border: "1px solid rgba(34,211,238,0.25)" },
  };
  const v = variants[kind];
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: s.p,
        fontSize: s.fs,
        fontWeight: 500,
        fontFamily: FONT_SANS,
        borderRadius: v.radius ?? 8,
        background: v.bg,
        color: v.color,
        border: v.border,
        cursor: "pointer",
        transition: "all 150ms ease",
        letterSpacing: "-0.005em",
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// --- Card ---
export function Card({
  children,
  style,
  glow,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.bg2}`,
        borderRadius: 12,
        padding: 24,
        position: "relative",
        ...(glow ? { boxShadow: `0 0 0 1px ${C.cyan}33, 0 0 40px ${C.cyan}15` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Badge ---
type BadgeTone = "cyan" | "violet" | "orange" | "green" | "amber" | "red" | "pink" | "zinc";
export function Badge({
  tone = "cyan",
  children,
  dot,
  style,
}: {
  tone?: BadgeTone;
  children?: React.ReactNode;
  dot?: boolean;
  style?: React.CSSProperties;
}) {
  const tones: Record<BadgeTone, { bg: string; fg: string; br: string }> = {
    cyan: { bg: "rgba(34,211,238,0.1)", fg: C.cyan, br: "rgba(34,211,238,0.2)" },
    violet: { bg: "rgba(167,139,250,0.1)", fg: C.violet, br: "rgba(167,139,250,0.2)" },
    orange: { bg: "rgba(251,146,60,0.1)", fg: C.orange, br: "rgba(251,146,60,0.2)" },
    green: { bg: "rgba(74,222,128,0.1)", fg: C.green, br: "rgba(74,222,128,0.2)" },
    amber: { bg: "rgba(251,191,36,0.1)", fg: C.amber, br: "rgba(251,191,36,0.2)" },
    red: { bg: "rgba(248,113,113,0.1)", fg: C.red, br: "rgba(248,113,113,0.2)" },
    pink: { bg: "rgba(244,114,182,0.1)", fg: C.pink, br: "rgba(244,114,182,0.2)" },
    zinc: { bg: C.bg2, fg: C.text1, br: C.border },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11.5,
        fontWeight: 500,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.br}`,
        fontFamily: FONT_SANS,
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: t.fg }} />}
      {children}
    </span>
  );
}

// --- Mastery Radial ---
export function Radial({
  value = 0,
  size = 80,
  color,
  stroke = 6,
  label,
}: {
  value?: number;
  size?: number;
  color?: string;
  stroke?: number;
  label?: string;
}) {
  const c = color ?? (value >= 0.8 ? C.green : value >= 0.6 ? C.cyan : value >= 0.3 ? C.violet : C.orange);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - value * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bg2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: FONT_MONO,
          color: C.text0,
        }}
      >
        <div style={{ fontSize: size * 0.26, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {Math.round(value * 100)}%
        </div>
        {label && <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{label}</div>}
      </div>
    </div>
  );
}

// --- Bar ---
export function Bar({
  value,
  color = C.cyan,
  height = 8,
  track = C.bg2,
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height,
        background: track,
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 600ms ease-out",
        }}
      />
    </div>
  );
}

// --- Avatar ---
export function Avatar({
  name,
  size = 32,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["#22D3EE", "#A78BFA", "#FB923C", "#4ADE80", "#F472B6"];
  const c = color ?? colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: `${c}22`,
        color: c,
        border: `1px solid ${c}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        fontFamily: FONT_SANS,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
