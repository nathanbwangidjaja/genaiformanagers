import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function ContactPage() {
  return (
    <MarketingPage
      title="Contact us"
      subtitle="We respond within one business day."
    >
      <MktSection title="Pilots and demos">
        <p>
          If you&rsquo;re a teacher, principal, or curriculum director and you
          want to run Cortex in one or more classrooms, email{" "}
          <a href="mailto:hello@cortex.app" style={{ color: "#7dd3fc" }}>
            hello@cortex.app
          </a>{" "}
          with the grade level and student count.
        </p>
      </MktSection>
      <MktSection title="Procurement and security">
        <p>
          For SOC 2 reports, SOPPA / state DPA templates, accessibility audits,
          and rostering integration questions, email{" "}
          <a href="mailto:security@cortex.app" style={{ color: "#7dd3fc" }}>
            security@cortex.app
          </a>
          .
        </p>
      </MktSection>
      <MktSection title="Press and partnerships">
        <p>
          For media inquiries or research partnerships, email{" "}
          <a href="mailto:press@cortex.app" style={{ color: "#7dd3fc" }}>
            press@cortex.app
          </a>
          .
        </p>
      </MktSection>
    </MarketingPage>
  );
}
