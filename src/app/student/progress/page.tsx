import { C } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Btn, Badge, Radial } from "@/components/cortex/primitives";
import { Icon, type IconName } from "@/components/cortex/Icon";
import { KnowledgeGraph } from "@/components/cortex/KnowledgeGraph";

const ACHIEVEMENTS: Array<{ i: IconName; t: string; earned: boolean; c: string }> = [
  { i: "star", t: "First Perfect", earned: true, c: C.amber },
  { i: "flame", t: "5-Day Streak", earned: true, c: C.orange },
  { i: "telescope", t: "Curiosity Explorer", earned: true, c: C.violet },
  { i: "mountain", t: "Persistence", earned: true, c: C.green },
  { i: "sparkle", t: "Quick Thinker", earned: false, c: C.cyan },
  { i: "brain", t: "Master 20", earned: false, c: C.pink },
];

export default function StudentProgressPage() {
  return (
    <StudentShell>
      <div style={{ padding: "36px 48px" }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Your learning map
        </div>
        <div style={{ fontSize: 14, color: C.text1, marginTop: 4, marginBottom: 28 }}>
          Here&apos;s how your math skills are growing — tap any concept to explore.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
          <div
            style={{
              background: C.bg1,
              border: `1px solid ${C.bg2}`,
              borderRadius: 14,
              height: 540,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <KnowledgeGraph selectedId="r2" />
          </div>

          <div
            style={{
              background: C.bg1,
              border: `1px solid ${C.bg2}`,
              borderRadius: 14,
              padding: 22,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Badge tone="cyan">7.RP.2 · Ratios</Badge>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>
              Proportional Relationships
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
              <Radial value={0.72} size={86} color={C.cyan} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.cyan, fontWeight: 600 }}>Proficient</div>
                <div style={{ fontSize: 12, color: C.text1, marginTop: 6 }}>Practiced 15 times</div>
                <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>↑ Up 14% this week</div>
              </div>
            </div>
            <div
              style={{
                marginTop: 22,
                padding: 14,
                background: `${C.green}06`,
                border: `1px solid ${C.green}33`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.green,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Your strength
              </div>
              <div style={{ fontSize: 13, color: C.text0, marginTop: 4 }}>
                Solving &ldquo;find the missing value&rdquo; problems
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                padding: 14,
                background: `${C.orange}06`,
                border: `1px solid ${C.orange}33`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.orange,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Work on
              </div>
              <div style={{ fontSize: 13, color: C.text0, marginTop: 4 }}>
                Word problems with multiple steps
              </div>
            </div>
            <Btn
              kind="primary"
              size="md"
              style={{ marginTop: 22 }}
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Practice this topic
            </Btn>
          </div>
        </div>

        {/* Achievements */}
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 36, marginBottom: 14 }}>
          Your achievements
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {ACHIEVEMENTS.map((a, i) => (
            <div
              key={i}
              style={{
                background: a.earned ? `${a.c}06` : C.bg1,
                border: `1px solid ${a.earned ? `${a.c}44` : C.bg2}`,
                borderRadius: 12,
                padding: 18,
                textAlign: "center",
                opacity: a.earned ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 99,
                  margin: "0 auto 10px",
                  background: a.earned ? `${a.c}15` : C.bg2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: a.earned ? `0 0 20px ${a.c}33` : "none",
                }}
              >
                <Icon name={a.i} size={20} color={a.earned ? a.c : C.text3} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: a.earned ? C.text0 : C.text2 }}>
                {a.t}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
