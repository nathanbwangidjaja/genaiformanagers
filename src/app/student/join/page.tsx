import Link from "next/link";
import { redirect } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { StudentShell } from "@/components/cortex/shells";
import { Card, Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { requireStudent } from "@/server/auth";
import { joinClass } from "@/server/actions";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function JoinClassPage() {
  const student = await requireStudent();

  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: student.id },
    include: {
      class: {
        include: { teacher: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // If a student arrives here with no classes, route them through the
  // canonical onboarding flow instead.
  if (enrollments.length === 0) redirect("/onboarding");

  return (
    <StudentShell>
      <div style={{ padding: "36px 48px", maxWidth: 720 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Join another class
        </div>
        <div style={{ fontSize: 14, color: C.text1, marginBottom: 28 }}>
          Got a code from a teacher? Enter it here. You can be in any number of classes.
        </div>

        <Card style={{ padding: 28, marginBottom: 28 }}>
          <form action={joinClass}>
            <label style={{ fontSize: 13, color: C.text1, marginBottom: 8, display: "block" }}>
              Invite code
            </label>
            <input
              name="inviteCode"
              required
              placeholder="ABC123"
              autoCapitalize="characters"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text0,
                fontSize: 18,
                fontFamily: FONT_MONO,
                letterSpacing: "0.2em",
                textAlign: "center",
                marginBottom: 18,
                outline: "none",
                textTransform: "uppercase",
              }}
            />
            <Btn
              kind="primary"
              size="lg"
              type="submit"
              style={{ width: "100%" }}
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Join Class
            </Btn>
          </form>
        </Card>

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Already in {enrollments.length} class{enrollments.length === 1 ? "" : "es"}
        </div>
        <Card style={{ padding: 0 }}>
          {enrollments.map((e, i) => {
            const teacherName = `${e.class.teacher.firstName} ${e.class.teacher.lastName}`.trim();
            return (
              <div
                key={e.id}
                style={{
                  padding: "14px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 100px",
                  gap: 14,
                  alignItems: "center",
                  borderBottom: i < enrollments.length - 1 ? `1px solid ${C.bg2}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{e.class.name}</div>
                  {teacherName && (
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{teacherName}</div>
                  )}
                </div>
                <Badge tone="zinc" style={{ fontFamily: FONT_MONO }}>
                  Code: {e.class.inviteCode}
                </Badge>
                <div style={{ fontSize: 11, color: C.text2 }}>
                  Joined {e.joinedAt.toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ marginTop: 24, fontSize: 13 }}>
          <Link href="/student/dashboard" style={{ color: C.cyan, textDecoration: "none" }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
