import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function DPAPage() {
  return (
    <MarketingPage
      title="Data Processing Agreement"
      subtitle="A template DPA for school districts."
    >
      <MktSection title="What this is">
        <p>
          A Data Processing Agreement (DPA) is the contract between Cortex
          and your district that governs how student data is handled. We
          maintain a template DPA aligned with FERPA, COPPA, SOPPA (Illinois),
          SOPIPA (California), and the New York Education Law 2-d Bill of
          Rights.
        </p>
      </MktSection>
      <MktSection title="Key terms">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            Cortex is a school official under FERPA &sect; 99.31(a)(1)(i)(B).
          </li>
          <li style={{ marginBottom: 8 }}>
            We do not sell student data, ever.
          </li>
          <li style={{ marginBottom: 8 }}>
            We do not use student data to train any third-party AI model.
          </li>
          <li style={{ marginBottom: 8 }}>
            Student data is encrypted in transit and at rest.
          </li>
          <li style={{ marginBottom: 8 }}>
            On contract termination, student data is exported to the district
            and deleted within 60 days.
          </li>
          <li style={{ marginBottom: 8 }}>
            Breach notification: districts notified within 72 hours of
            confirmation.
          </li>
        </ul>
      </MktSection>
      <MktSection title="How to get one">
        <p>
          Email{" "}
          <a href="mailto:legal@cortex.app" style={{ color: "#7dd3fc" }}>
            legal@cortex.app
          </a>{" "}
          with your district name and your state. We&rsquo;ll send a
          state-specific DPA within one business day. We accept district-
          provided DPAs and the Student Data Privacy Consortium (SDPC) National
          DPA as well.
        </p>
      </MktSection>
    </MarketingPage>
  );
}
