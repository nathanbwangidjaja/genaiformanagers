import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function PrivacyPage() {
  return (
    <MarketingPage
      title="Privacy Policy"
      subtitle="Last updated May 6, 2026."
    >
      <MktSection title="What we collect">
        <p>
          Cortex collects only the data needed to support a student&rsquo;s
          learning: their name, the email address used for sign-in,
          assignment submissions, question attempts, and free-form messages
          they send to the AI tutor. We do not collect financial information,
          government IDs, biometric data, or precise geolocation.
        </p>
      </MktSection>
      <MktSection title="How we use it">
        <p>
          Student data is used solely to (a) compute mastery and behavioral
          signals visible to the student&rsquo;s teacher, (b) generate the
          AI artifacts the teacher requests, and (c) operate and maintain the
          service. We never sell student data, and we never use it to train
          third-party models.
        </p>
      </MktSection>
      <MktSection title="FERPA and COPPA">
        <p>
          Cortex is designed to comply with FERPA, COPPA, and U.S. state
          student-data-protection laws (including SOPPA in Illinois,
          SOPIPA in California, and similar statutes). Schools and districts
          act as the data-controller under these laws, and we operate as a
          school official under FERPA &sect; 99.31(a)(1).
        </p>
      </MktSection>
      <MktSection title="Behavioral signals">
        <p>
          We compute behavioral observations (curiosity, motivation,
          engagement, persistence) for the teacher view only. These signals
          are never shown to students, parents, or any third party, and they
          are not used for grading, discipline, or college admissions.
        </p>
      </MktSection>
      <MktSection title="Your rights">
        <p>
          Students and parents may request a copy of, correction to, or
          deletion of any data Cortex holds about them. Email{" "}
          <a href="mailto:privacy@cortex.app" style={{ color: "#7dd3fc" }}>
            privacy@cortex.app
          </a>{" "}
          to exercise these rights. We respond within 30 days.
        </p>
      </MktSection>
    </MarketingPage>
  );
}
