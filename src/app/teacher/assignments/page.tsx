import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const ASSIGNMENTS = [
  { id: "ratios-quiz", title: "Ratios Quick Quiz", class: "Grade 7A", due: "Tomorrow", submitted: 18, total: 28, tone: "amber" as const },
  { id: "linear-eq", title: "Linear Equations Practice", class: "Grade 7B", due: "Friday", submitted: 4, total: 31, tone: "cyan" as const },
  { id: "geom-rev", title: "Geometry Review", class: "Grade 7C", due: "Next Mon", submitted: 0, total: 28, tone: "cyan" as const },
  { id: "fractions", title: "Adding Fractions Drill", class: "Honors 7", due: "Done", submitted: 18, total: 18, tone: "green" as const },
];

export default function AssignmentsPage() {
  return (
    <TeacherShell title="Assignments">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, color: C.text1 }}>
          {ASSIGNMENTS.length} assignments · {ASSIGNMENTS.filter((a) => a.due !== "Done").length} active
        </div>
        <Link href="/teacher/assignments/new" style={{ textDecoration: "none" }}>
          <Btn kind="primary" size="md" iconRight={<Icon name="plus" size={13} color={C.bg0} />}>
            New Assignment
          </Btn>
        </Link>
      </div>

      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.bg2}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {ASSIGNMENTS.map((a, i) => (
          <div
            key={a.id}
            style={{
              padding: "18px 24px",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 100px",
              gap: 20,
              alignItems: "center",
              borderBottom: i < ASSIGNMENTS.length - 1 ? `1px solid ${C.bg2}` : "none",
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{a.class}</div>
            </div>
            <Badge tone={a.tone}>{a.due}</Badge>
            <div style={{ fontSize: 13, color: C.text1 }}>
              <span style={{ color: C.text0, fontWeight: 600 }}>{a.submitted}</span>
              <span style={{ color: C.text2 }}> / {a.total} submitted</span>
            </div>
            <div
              style={{
                height: 4,
                background: C.bg2,
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(a.submitted / a.total) * 100}%`,
                  height: "100%",
                  background: C.cyan,
                }}
              />
            </div>
            <Btn kind="secondary" size="sm">
              View
            </Btn>
          </div>
        ))}
      </div>
    </TeacherShell>
  );
}
