import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Btn, Badge, Bar } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const ASSIGNMENTS = [
  { id: "ratios-quiz", t: "Ratios & Proportions Quiz", due: "Due tomorrow", tone: "amber" as const, prog: 0, qs: 10, color: C.cyan },
  { id: "linear", t: "Linear Expressions Practice", due: "Due in 3 days", tone: "cyan" as const, prog: 0.4, qs: 8, color: C.violet },
  { id: "geom", t: "Geometry Review", due: "Due Friday", tone: "cyan" as const, prog: 0, qs: 12, color: C.green },
  { id: "fractions-old", t: "Adding Fractions Drill", due: "Completed", tone: "green" as const, prog: 1, qs: 8, color: C.green, score: 92 },
];

export default function StudentAssignmentsPage() {
  return (
    <StudentShell>
      <div style={{ padding: "36px 48px", maxWidth: 1100 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Assignments
        </div>
        <div style={{ fontSize: 14, color: C.text1, marginBottom: 28 }}>
          {ASSIGNMENTS.filter((a) => a.prog < 1).length} active ·{" "}
          {ASSIGNMENTS.filter((a) => a.prog === 1).length} completed
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ASSIGNMENTS.map((a) => (
            <Link
              key={a.id}
              href={`/student/assignments/${a.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: C.bg1,
                  border: `1px solid ${C.bg2}`,
                  borderRadius: 12,
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns: "8px 1fr 200px 160px 100px",
                  gap: 20,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 40,
                    background: a.color,
                    borderRadius: 99,
                  }}
                />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{a.t}</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                    {a.qs} questions
                  </div>
                </div>
                <Badge tone={a.tone}>{a.due}</Badge>
                <div>
                  <Bar value={a.prog} color={a.color} height={5} />
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
                    {Math.round(a.prog * a.qs)}/{a.qs} done
                    {a.score ? ` · ${a.score}%` : ""}
                  </div>
                </div>
                <Btn
                  kind={a.prog === 1 ? "secondary" : a.prog > 0 ? "primary" : "secondary"}
                  size="sm"
                  iconRight={<Icon name="arrow" size={11} color={a.prog > 0 && a.prog < 1 ? C.bg0 : undefined} />}
                >
                  {a.prog === 1 ? "Review" : a.prog > 0 ? "Continue" : "Start"}
                </Btn>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
