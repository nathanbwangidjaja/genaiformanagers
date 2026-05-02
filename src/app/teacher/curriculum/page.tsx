import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { KnowledgeGraph } from "@/components/cortex/KnowledgeGraph";
import { Icon } from "@/components/cortex/Icon";
import { Badge } from "@/components/cortex/primitives";

export default function CurriculumPage() {
  return (
    <TeacherShell title="Curriculum" breadcrumb={["Curriculum", "Grade 7 Math"]}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Badge tone="cyan" dot>
          Grade 7 · Common Core
        </Badge>
        <span style={{ fontSize: 13, color: C.text2 }}>
          5 domains · 25 standards · prerequisite map
        </span>
      </div>

      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.bg2}`,
          borderRadius: 14,
          height: 620,
          position: "relative",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="brain" size={14} color={C.text1} />
          <span style={{ fontSize: 12, color: C.text1, fontWeight: 500 }}>
            Curriculum Knowledge Map
          </span>
        </div>
        <KnowledgeGraph />
      </div>
    </TeacherShell>
  );
}
