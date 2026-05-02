import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Card, Badge, Btn } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

export default function LessonPlansPage() {
  return (
    <TeacherShell title="Lesson Plans">
      <div style={{ marginBottom: 24, fontSize: 14, color: C.text1 }}>
        AI-curated, standards-aligned lesson plans tailored to your class&apos;s knowledge graph.
      </div>

      <Card
        style={{
          padding: 28,
          background: `linear-gradient(135deg, ${C.violet}06, ${C.cyan}06)`,
          border: `1px solid ${C.violet}33`,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Icon name="sparkle" size={22} color={C.violet} />
          <div style={{ flex: 1 }}>
            <Badge tone="violet">SUGGESTED FOR YOU</Badge>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>
              Negative Numbers on the Number Line
            </div>
            <div style={{ fontSize: 13, color: C.text1, marginTop: 6, lineHeight: 1.5 }}>
              Built for 7C · 5 students struggling with 7.NS.1 · 15-min mini-lesson followed by an
              adaptive 8-question practice set.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Btn kind="primary" size="sm">
                View Plan
              </Btn>
              <Btn kind="ghost" size="sm">
                Regenerate
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 14, color: C.text2, textAlign: "center", padding: 60 }}>
        Lesson plan library — coming soon.
      </div>
    </TeacherShell>
  );
}
