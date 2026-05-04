import { C } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { createClass } from "@/server/actions";

export default async function NewClassPage() {
  const teacher = await requireTeacher();
  return (
    <TeacherShell
      title="New Class"
      breadcrumb={["Classes", "New"]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <form action={createClass} style={{ maxWidth: 480 }}>
        <label style={{ fontSize: 13, color: C.text1, marginBottom: 8, display: "block" }}>
          Class name
        </label>
        <input
          name="name"
          required
          placeholder="e.g. Grade 7A · Period 1"
          style={{
            width: "100%",
            padding: "12px 14px",
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text0,
            fontSize: 14,
            marginBottom: 24,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px 22px",
            background: C.text0,
            color: C.bg0,
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Create Class <Icon name="arrow" size={14} color={C.bg0} />
        </button>
      </form>
    </TeacherShell>
  );
}
