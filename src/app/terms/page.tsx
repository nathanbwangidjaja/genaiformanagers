import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function TermsPage() {
  return (
    <MarketingPage
      title="Terms of Service"
      subtitle="Last updated May 6, 2026."
    >
      <MktSection title="Acceptance">
        <p>
          By creating an account or using Cortex, you agree to these terms. If
          you&rsquo;re using Cortex on behalf of a school or district, you
          represent that you have authority to bind that organization.
        </p>
      </MktSection>
      <MktSection title="Acceptable use">
        <p>
          You may use Cortex only for legitimate educational purposes. You may
          not (a) reverse-engineer or attempt to extract our models, prompts,
          or training data; (b) use the service to harass, harm, or
          discriminate against any person; (c) upload student data you are not
          authorized to share; or (d) attempt to circumvent rate limits or
          access controls.
        </p>
      </MktSection>
      <MktSection title="AI-generated content">
        <p>
          Cortex generates lesson plans, student briefs, and practice questions
          using large language models. These outputs are tools, not authoritative
          sources. Teachers should review every generated artifact before
          using it with students.
        </p>
      </MktSection>
      <MktSection title="Service availability">
        <p>
          We aim for 99.5% monthly uptime but do not guarantee continuous,
          uninterrupted service. Planned maintenance is announced at least 48
          hours in advance.
        </p>
      </MktSection>
      <MktSection title="Termination">
        <p>
          You may delete your account at any time. We may suspend or terminate
          accounts that violate these terms or applicable law. Upon
          termination, student data is exported to your school administrator
          and deleted from our systems within 60 days.
        </p>
      </MktSection>
      <MktSection title="Liability">
        <p>
          Cortex is provided &ldquo;as is&rdquo; without warranties of any
          kind. To the fullest extent permitted by law, our aggregate
          liability is limited to the fees paid in the prior 12 months.
        </p>
      </MktSection>
    </MarketingPage>
  );
}
