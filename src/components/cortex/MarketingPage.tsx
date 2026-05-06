import Link from "next/link";
import { C } from "./tokens";
import { Logo, Btn } from "./primitives";
import { Icon } from "./Icon";

export function MarketingPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        background: C.bg0,
        minHeight: "100vh",
        color: C.text0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          borderBottom: `1px solid ${C.bg2}`,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={22} />
        </Link>
        <div style={{ display: "flex", gap: 32, fontSize: 14, color: C.text1 }}>
          <Link href="/#product" style={{ color: "inherit", textDecoration: "none" }}>
            Product
          </Link>
          <Link href="/pricing" style={{ color: "inherit", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
            About
          </Link>
          <Link href="/#educators" style={{ color: "inherit", textDecoration: "none" }}>
            Educators
          </Link>
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

      <div
        style={{
          padding: "72px 80px 60px",
          maxWidth: 880,
          margin: "0 auto",
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            margin: 0,
            marginBottom: subtitle ? 16 : 32,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 18, color: C.text2, lineHeight: 1.55, marginBottom: 40, marginTop: 0 }}>
            {subtitle}
          </p>
        )}
        <div style={{ fontSize: 15, color: C.text1, lineHeight: 1.7 }}>{children}</div>
      </div>

      <footer style={{ padding: "32px 80px", borderTop: `1px solid ${C.bg2}`, fontSize: 12, color: C.text2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1280, margin: "0 auto" }}>
          <span>© 2026 Cortex Learning, Inc.</span>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/privacy" style={{ color: C.text2, textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ color: C.text2, textDecoration: "none" }}>Terms</Link>
            <Link href="/contact" style={{ color: C.text2, textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function MktSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 14, color: C.text0 }}>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
