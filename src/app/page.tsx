import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Logo, Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { GraphBG } from "@/components/cortex/GraphBG";

export default function LandingPage() {
  return (
    <main style={{ background: C.bg0, color: C.text0, minHeight: "100vh", overflow: "hidden" }}>
      {/* Nav */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 50,
          background: "rgba(9,9,11,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.bg2}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={22} />
        </Link>
        <div style={{ display: "flex", gap: 32, fontSize: 14, color: C.text1 }}>
          <span style={{ cursor: "pointer" }}>Product</span>
          <span style={{ cursor: "pointer" }}>Pricing</span>
          <span style={{ cursor: "pointer" }}>About</span>
          <span style={{ cursor: "pointer" }}>Educators</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/sign-in" style={{ textDecoration: "none" }}>
            <Btn kind="ghost" size="sm">
              Log In
            </Btn>
          </Link>
          <Link href="/sign-up" style={{ textDecoration: "none" }}>
            <Btn
              kind="primaryRound"
              size="sm"
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Get Started
            </Btn>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          minHeight: 880,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          paddingTop: 64,
        }}
      >
        <GraphBG density={70} opacity={0.25} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 60%, transparent 0%, ${C.bg0} 75%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            maxWidth: 900,
            padding: "60px 40px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              fontWeight: 500,
              color: C.cyan,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 99,
              border: `1px solid ${C.cyan}33`,
              background: `${C.cyan}10`,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: C.cyan,
                boxShadow: `0 0 8px ${C.cyan}`,
              }}
            />
            Personalized Learning, Powered by AI
          </div>
          <h1
            style={{
              fontSize: 80,
              lineHeight: 1.0,
              letterSpacing: "-0.035em",
              fontWeight: 700,
              margin: 0,
              color: C.text0,
            }}
          >
            Every student has
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.violet} 50%, ${C.pink} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              a unique mind
            </span>
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: C.text1,
              maxWidth: 580,
              margin: "32px auto 40px",
              fontWeight: 400,
            }}
          >
            Build living knowledge graphs that capture how each student thinks, struggles, and grows.
            Give teachers the intelligence to teach every child differently.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/sign-up" style={{ textDecoration: "none" }}>
              <Btn
                kind="primaryRound"
                size="lg"
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                Get Started — Free
              </Btn>
            </Link>
            <Link href="/sign-in" style={{ textDecoration: "none" }}>
              <Btn kind="secondaryRound" size="lg" icon={<Icon name="play" size={12} />}>
                Sign In
              </Btn>
            </Link>
          </div>
          <div style={{ marginTop: 80 }}>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 18 }}>
              Trusted by 50+ schools and districts
            </div>
            <div
              style={{
                display: "flex",
                gap: 48,
                justifyContent: "center",
                opacity: 0.4,
                flexWrap: "wrap",
              }}
            >
              {[
                "LINCOLN ISD",
                "WESTBROOK ACAD.",
                "NORTH RIDGE",
                "BAYVIEW DSD",
                "OAKMONT",
                "MERIDIAN K12",
              ].map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text1,
                    letterSpacing: "0.1em",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Graph Showcase */}
      <section style={{ padding: "120px 80px", borderTop: `1px solid ${C.bg2}` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div>
            <Badge tone="cyan">CORE TECHNOLOGY</Badge>
            <h2
              style={{
                fontSize: 56,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                fontWeight: 700,
                margin: "20px 0 24px",
              }}
            >
              See the whole
              <br />
              picture.
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                color: C.text1,
                marginBottom: 40,
                maxWidth: 480,
              }}
            >
              Every concept connects. Cortex maps your student&apos;s mathematical understanding as a
              living, breathing knowledge graph — mastery levels light up in real-time.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                {
                  i: "brain" as const,
                  t: "Spot the gaps instantly",
                  d: "See exactly where a student is strong, struggling, or curious — at a glance.",
                },
                {
                  i: "sparkle" as const,
                  t: "Beyond right and wrong",
                  d: "Capture curiosity, motivation, and persistence — the invisible signals that define a learner.",
                },
                {
                  i: "zap" as const,
                  t: "Adapts in real-time",
                  d: "The graph updates with every problem solved, every hint used, every question asked.",
                },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${C.cyan}10`,
                      border: `1px solid ${C.cyan}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={f.i} size={18} color={C.cyan} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{f.t}</div>
                    <div style={{ fontSize: 14, color: C.text1, lineHeight: 1.55 }}>{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              height: 540,
              borderRadius: 20,
              background: `radial-gradient(ellipse at center, ${C.cyan}10 0%, transparent 70%), ${C.bg1}`,
              border: `1px solid ${C.bg2}`,
              overflow: "hidden",
            }}
          >
            <KGraphFigure />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          padding: "120px 80px",
          position: "relative",
          borderTop: `1px solid ${C.bg2}`,
          borderBottom: `1px solid ${C.bg2}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${C.bg2} 1px, transparent 1px), linear-gradient(90deg, ${C.bg2} 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 48,
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          {[
            ["95%", "of students showed measurable improvement"],
            ["3×", "faster concept mastery with adaptive learning"],
            ["20+", "hours saved per teacher per month on planning"],
            ["50+", "schools using Cortex today"],
          ].map(([n, l]) => (
            <div key={n}>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.violet} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontFamily: FONT_MONO,
                }}
              >
                {n}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: C.text1,
                  marginTop: 12,
                  maxWidth: 200,
                  lineHeight: 1.5,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "140px 80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 50%, ${C.cyan}06 0%, ${C.violet}06 30%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontSize: 56,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            Ready to see every
            <br />
            student clearly?
          </h2>
          <p style={{ fontSize: 17, color: C.text1, margin: "0 0 36px" }}>
            Start building knowledge graphs for your classroom today.
          </p>
          <Link href="/sign-up" style={{ textDecoration: "none" }}>
            <Btn
              kind="primaryRound"
              size="lg"
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Get Started — Free
            </Btn>
          </Link>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 18 }}>
            No credit card required. Set up in 5 minutes.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "60px 80px 40px", borderTop: `1px solid ${C.bg2}` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
            maxWidth: 1280,
            margin: "0 auto 48px",
          }}
        >
          <div>
            <Logo size={22} />
            <p style={{ fontSize: 13, color: C.text2, marginTop: 14, maxWidth: 240, lineHeight: 1.5 }}>
              Personalized learning, powered by AI. For Grade 7 math and beyond.
            </p>
          </div>
          {(
            [
              ["Product", ["Dashboard", "Features", "Pricing", "Changelog"]],
              ["Company", ["About", "Blog", "Careers", "Contact"]],
              ["Legal", ["Privacy", "Terms", "Security", "DPA"]],
            ] as const
          ).map(([title, items]) => (
            <div key={title}>
              <div
                style={{
                  fontSize: 11,
                  color: C.text3,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                {title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((i) => (
                  <span key={i} style={{ fontSize: 14, color: C.text1, cursor: "pointer" }}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: `1px solid ${C.bg2}`,
            fontSize: 12,
            color: C.text2,
          }}
        >
          <span>© 2026 Cortex Learning, Inc.</span>
          <span>cortex.app</span>
        </div>
      </footer>
    </main>
  );
}

function KGraphFigure() {
  const nodes = [
    { x: 250, y: 80, r: 12, c: C.cyan, label: "Ratios" },
    { x: 380, y: 140, r: 10, c: C.cyan, label: "" },
    { x: 180, y: 200, r: 14, c: C.violet, label: "Fractions" },
    { x: 320, y: 240, r: 9, c: C.cyan, label: "" },
    { x: 460, y: 220, r: 11, c: C.violet, label: "Equations" },
    { x: 100, y: 320, r: 10, c: C.orange, label: "" },
    { x: 240, y: 380, r: 13, c: C.orange, label: "Geometry" },
    { x: 400, y: 360, r: 9, c: C.violet, label: "" },
    { x: 510, y: 320, r: 11, c: C.cyan, label: "" },
    { x: 350, y: 450, r: 10, c: C.green, label: "Stats" },
    { x: 130, y: 130, r: 7, c: C.zinc700, label: "" },
    { x: 540, y: 130, r: 7, c: C.zinc700, label: "" },
    { x: 80, y: 420, r: 7, c: C.zinc700, label: "" },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [3, 7],
    [7, 8], [4, 8], [6, 9], [7, 9], [0, 11], [10, 2], [5, 12],
  ];
  return (
    <svg viewBox="0 0 600 540" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="kg-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.violet} />
        </linearGradient>
      </defs>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke={i % 4 === 0 ? "url(#kg-edge)" : C.zinc700}
          strokeWidth={i % 4 === 0 ? 1.5 : 1}
          strokeDasharray={i % 7 === 0 ? "3 3" : ""}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.5} fill={n.c} opacity={0.08} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} fillOpacity={0.25} stroke={n.c} strokeWidth={1.5} />
          {n.label && (
            <text
              x={n.x}
              y={n.y - n.r - 8}
              fill={C.text1}
              fontSize="11"
              textAnchor="middle"
              fontFamily={FONT_MONO}
              style={{ letterSpacing: "0.04em" }}
            >
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
