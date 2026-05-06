import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function ChangelogPage() {
  return (
    <MarketingPage title="Changelog" subtitle="What we&rsquo;ve shipped recently.">
      <MktSection title="May 2026">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            Question generator now grounds signed-arithmetic and
            proportional-reasoning items in real-time public data (Open-Meteo
            for temperatures, open.er-api.com for currency rates).
          </li>
          <li style={{ marginBottom: 8 }}>
            Lesson plans now support iterative regeneration with focus notes
            directly on the saved-plan view.
          </li>
          <li style={{ marginBottom: 8 }}>
            Added a working teacher omnibar — search students, classes, and
            Common Core standards from anywhere with ⌘K.
          </li>
          <li style={{ marginBottom: 8 }}>
            Per-student insights cached by input hash; opening a student
            page is now instant when the underlying data hasn&rsquo;t changed.
          </li>
        </ul>
      </MktSection>
      <MktSection title="April 2026">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            Initial release. Grade 7 math, Common Core, full per-student
            knowledge graph with Bayesian Knowledge Tracing.
          </li>
        </ul>
      </MktSection>
    </MarketingPage>
  );
}
