import Link from "next/link";
import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

const CLASSES = [
  { id: "7a", name: "Grade 7A · Period 1", students: 28, mastery: 0.72, color: C.cyan, due: 3 },
  { id: "7b", name: "Grade 7B · Period 3", students: 31, mastery: 0.64, color: C.violet, due: 1 },
  { id: "7c", name: "Grade 7C · Period 5", students: 28, mastery: 0.58, color: C.orange, due: 4 },
  { id: "honors", name: "Honors 7 · Period 6", students: 18, mastery: 0.84, color: C.green, due: 2 },
];

export default function ClassesPage() {
  return (
    <TeacherShell title="Classes">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, color: C.text1 }}>
          {CLASSES.length} classes · {CLASSES.reduce((s, c) => s + c.students, 0)} students total
        </div>
        <Btn kind="primary" size="md" iconRight={<Icon name="plus" size={13} color={C.bg0} />}>
          New Class
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {CLASSES.map((cls) => (
          <Link
            key={cls.id}
            href={`/teacher/classes/${cls.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: C.bg1,
                border: `1px solid ${C.bg2}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div style={{ height: 3, background: cls.color }} />
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{cls.name}</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  {cls.students} students
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 14, marginBottom: 14 }}>
                  {["Ratios", "Numbers", "Expressions", "Geometry", "Stats"].map((d, i) => {
                    const v = cls.mastery + (i - 2) * 0.08;
                    const c = v > 0.7 ? C.cyan : v > 0.5 ? C.violet : C.orange;
                    return (
                      <div key={d} style={{ flex: 1 }}>
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
                              width: `${Math.max(0.1, v) * 100}%`,
                              height: "100%",
                              background: c,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: C.text3,
                            marginTop: 4,
                            textAlign: "center",
                          }}
                        >
                          {d}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: C.text2,
                    paddingTop: 12,
                    borderTop: `1px solid ${C.bg2}`,
                  }}
                >
                  <span>{cls.due} assignments due</span>
                  <span style={{ color: C.cyan, display: "flex", alignItems: "center", gap: 4 }}>
                    View Class <Icon name="arrow" size={11} color={C.cyan} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </TeacherShell>
  );
}
