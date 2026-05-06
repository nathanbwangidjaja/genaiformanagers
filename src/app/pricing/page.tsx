import Link from "next/link";
import { MarketingPage } from "@/components/cortex/MarketingPage";
import { C } from "@/components/cortex/tokens";
import { Btn } from "@/components/cortex/primitives";

const TIERS = [
  {
    name: "Pilot",
    price: "Free",
    period: "for one classroom",
    blurb:
      "Run Cortex with a single class. Full feature set, real teacher artifacts, no credit card.",
    features: [
      "Up to 30 students in one class",
      "AI lesson plans + per-student briefs",
      "Live knowledge graph",
      "AI tutor with mastery-calibrated responses",
      "Real-time public-API question grounding",
    ],
    ctaLabel: "Start a pilot",
    ctaHref: "/sign-up",
    highlight: false,
  },
  {
    name: "School",
    price: "$20",
    period: "per student / academic year",
    blurb:
      "Whole-school deployment. Multi-teacher access, shared curriculum, district reporting.",
    features: [
      "Unlimited classes and teachers",
      "Class + grade-level analytics",
      "Auto-drafted parent updates (English + Spanish)",
      "Common Core mastery exports for board reporting",
      "Email support, 24-hour response SLA",
    ],
    ctaLabel: "Talk to us",
    ctaHref: "/contact",
    highlight: true,
  },
  {
    name: "District",
    price: "Custom",
    period: "negotiated by enrollment",
    blurb:
      "District-wide deployment with full procurement compliance and SSO.",
    features: [
      "Everything in School",
      "SSO via SAML / OIDC",
      "Clever / ClassLink rostering",
      "SOC 2 Type II + SOPPA + state DPA",
      "Dedicated success engineer",
    ],
    ctaLabel: "Request a quote",
    ctaHref: "/contact",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingPage
      title="Pricing"
      subtitle="Pay for outcomes, not features. Start free with one classroom."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginTop: 24 }}>
        {TIERS.map((t) => (
          <div
            key={t.name}
            style={{
              background: t.highlight ? `${C.cyan}06` : C.bg1,
              border: `1px solid ${t.highlight ? C.cyan : C.bg2}`,
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 12, color: C.text2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              {t.name}
            </div>
            <div style={{ fontSize: 30, fontWeight: 600, color: C.text0, lineHeight: 1.1 }}>
              {t.price}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>{t.period}</div>
            <p style={{ fontSize: 13, color: C.text1, lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>
              {t.blurb}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 22 }}>
              {t.features.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: 13,
                    color: C.text1,
                    paddingLeft: 22,
                    position: "relative",
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ position: "absolute", left: 0, color: C.cyan }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href={t.ctaHref} style={{ textDecoration: "none", marginTop: "auto" }}>
              <Btn kind={t.highlight ? "primary" : "secondary"} size="md" style={{ width: "100%" }}>
                {t.ctaLabel}
              </Btn>
            </Link>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: C.text2, marginTop: 36, lineHeight: 1.6 }}>
        Pricing is anchored to existing district budget lines (family
        engagement, professional development, instructional software). We
        don&rsquo;t require new line items, and we&rsquo;ll happily run a
        cost-comparison against the tools you would replace.
      </p>
    </MarketingPage>
  );
}
