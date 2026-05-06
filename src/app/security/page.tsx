import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function SecurityPage() {
  return (
    <MarketingPage
      title="Security"
      subtitle="How we keep student data safe."
    >
      <MktSection title="Encryption">
        <p>
          All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
          Database backups are encrypted and stored in a separate AWS region.
          Application secrets are managed through Vercel&rsquo;s encrypted
          environment-variable store; no secrets are ever committed to source
          control.
        </p>
      </MktSection>
      <MktSection title="Access control">
        <p>
          Authentication is handled by Clerk, an SOC 2 Type II–certified
          identity provider. Production database access is restricted to a
          short list of named engineers, gated by hardware-key-backed SSH and
          audit-logged. Teachers can only see students enrolled in classes
          they own.
        </p>
      </MktSection>
      <MktSection title="Compliance roadmap">
        <p>
          Cortex is in active SOC 2 Type II audit. We maintain template Data
          Processing Agreements aligned with SOPPA (Illinois), SOPIPA
          (California), and the New York 2-d Bill of Rights. Districts can
          request our security questionnaire at{" "}
          <a href="mailto:security@cortex.app" style={{ color: "#7dd3fc" }}>
            security@cortex.app
          </a>
          .
        </p>
      </MktSection>
      <MktSection title="Incident response">
        <p>
          We notify affected districts within 72 hours of confirming any
          security incident involving student data, in accordance with FERPA
          and applicable state-law breach notification timelines.
        </p>
      </MktSection>
    </MarketingPage>
  );
}
