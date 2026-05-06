import { MarketingPage, MktSection } from "@/components/cortex/MarketingPage";

export default function AboutPage() {
  return (
    <MarketingPage
      title="About Cortex"
      subtitle="We build the substrate teachers wish they had."
    >
      <MktSection title="Why we exist">
        <p>
          Teachers spend 5–11 hours a week stitching together data from IXL, the
          gradebook, Google Classroom, and exit tickets — manually building a
          mental model of every student so they can decide what to teach
          tomorrow. Most of that work happens on Sundays and after 9 PM, and
          it&rsquo;s a leading driver of teacher burnout.
        </p>
        <p>
          Cortex is the platform that does the stitching. We build a live
          per-student knowledge graph — mastery, behavioral signals,
          error patterns, prerequisite gaps — and turn it into the artifacts
          teachers actually deliver: per-student briefs, lesson plans, custom
          assessments, and parent updates.
        </p>
      </MktSection>
      <MktSection title="What we believe">
        <p>
          Understanding a student goes well beyond tracking right and wrong
          answers. You need to know how curious they are, how motivated they
          stay after a failure, how consistently they show up, and how they
          engage with material that wasn&rsquo;t assigned to them. Cortex
          captures all of this and makes it usable.
        </p>
      </MktSection>
      <MktSection title="Where we are">
        <p>
          We launched with Grade 7 math (Common Core) as a tightly-scoped
          domain to prove out the model. ELA is next. Our architecture is
          designed to generalize across subjects and grade levels.
        </p>
      </MktSection>
    </MarketingPage>
  );
}
