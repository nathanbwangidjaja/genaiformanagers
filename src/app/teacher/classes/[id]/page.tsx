import Link from "next/link";
import { notFound } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { TeacherShell } from "@/components/cortex/shells";
import { Btn, Badge, Avatar, Bar, Radial, Card } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();

  const cls = await prisma.class.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  masteryRecords: true,
                  behavioralProfile: true,
                  interactionEvents: { orderBy: { timestamp: "desc" }, take: 1 },
                },
              },
            },
          },
        },
      },
      assignments: { include: { submissions: true } },
    },
  });
  if (!cls) notFound();

  return (
    <TeacherShell
      breadcrumb={["Classes", cls.name]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{cls.name}</div>
        <Badge tone="cyan" dot>
          {cls.enrollments.length} student{cls.enrollments.length === 1 ? "" : "s"}
        </Badge>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            background: C.bg2,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: FONT_MONO,
            color: C.cyan,
          }}
        >
          {cls.inviteCode}
          <Icon name="copy" size={12} color={C.text2} />
        </div>
        <div style={{ flex: 1 }} />
        <Link href={`/teacher/assignments/new?classId=${cls.id}`} style={{ textDecoration: "none" }}>
          <Btn kind="primary" size="md" iconRight={<Icon name="plus" size={13} color={C.bg0} />}>
            New Assignment
          </Btn>
        </Link>
      </div>

      <div style={{ fontSize: 13, color: C.text2, marginBottom: 24 }}>
        Share the invite code above with your students so they can join. They&apos;ll enter it after
        signing up.
      </div>

      {cls.enrollments.length === 0 ? (
        <Card style={{ padding: 60, textAlign: "center" }}>
          <Icon name="users" size={28} color={C.text3} />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No students yet</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>
            Send students this invite code:{" "}
            <span style={{ fontFamily: FONT_MONO, color: C.cyan }}>{cls.inviteCode}</span>
          </div>
        </Card>
      ) : (
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.6fr",
              padding: "12px 20px",
              borderBottom: `1px solid ${C.bg2}`,
              fontSize: 11,
              color: C.text2,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div>Student</div>
            <div>Mastery</div>
            <div>Engagement</div>
            <div>Curiosity</div>
            <div>Last Active</div>
            <div></div>
          </div>
          {cls.enrollments.map((enr, i) => {
            const sp = enr.student.studentProfile;
            const records = sp?.masteryRecords ?? [];
            const m =
              records.length > 0
                ? records.reduce((s, r) => s + r.masteryLevel, 0) / records.length
                : 0;
            const beh = sp?.behavioralProfile;
            const e = beh?.engagementScore ?? 0.5;
            const cu = beh?.curiosityScore ?? 0.5;
            const last = sp?.interactionEvents?.[0]?.timestamp;
            const lastStr = last ? timeAgo(last) : "Never";
            const name = `${enr.student.firstName} ${enr.student.lastName}`.trim() || enr.student.email;

            return (
              <Link
                key={enr.id}
                href={`/teacher/classes/${cls.id}/students/${enr.student.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.6fr",
                    padding: "14px 20px",
                    borderBottom: i < cls.enrollments.length - 1 ? `1px solid ${C.bg2}` : "none",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={name} size={32} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>{enr.student.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Radial value={m} size={28} stroke={3} />
                    <span
                      style={{
                        fontSize: 13,
                        color: C.text0,
                        fontFamily: FONT_MONO,
                        fontWeight: 600,
                      }}
                    >
                      {Math.round(m * 100)}%
                    </span>
                  </div>
                  <div style={{ width: "80%" }}>
                    <Bar value={e} color={C.cyan} height={5} />
                  </div>
                  <div style={{ width: "80%" }}>
                    <Bar value={cu} color={C.violet} height={5} />
                  </div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{lastStr}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Icon name="chevR" size={14} color={C.text2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Assignments section */}
      {cls.assignments.length > 0 && (
        <>
          <div style={{ marginTop: 32, fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
            Assignments
          </div>
          <Card style={{ padding: 0 }}>
            {cls.assignments.map((a, i) => (
              <Link
                key={a.id}
                href={`/teacher/assignments/${a.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 100px",
                    padding: "14px 20px",
                    borderBottom: i < cls.assignments.length - 1 ? `1px solid ${C.bg2}` : "none",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</div>
                    {a.description && (
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>
                        {a.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.text1 }}>
                    {a.dueDate ? `Due ${a.dueDate.toLocaleDateString()}` : "No due date"}
                  </div>
                  <div style={{ fontSize: 12, color: C.text1 }}>
                    {a.submissions.length} / {cls.enrollments.length} submitted
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Icon name="chevR" size={14} color={C.text2} />
                  </div>
                </div>
              </Link>
            ))}
          </Card>
        </>
      )}
    </TeacherShell>
  );
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
