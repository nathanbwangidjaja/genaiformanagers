import Link from "next/link";
import { redirect } from "next/navigation";
import { C } from "@/components/cortex/tokens";
import { Logo } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { getCurrentUser } from "@/server/auth";
import { createClass, joinClass } from "@/server/actions";
import { prisma } from "@/server/db";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // If they already have data, skip onboarding
  if (user.role === "TEACHER") {
    const cnt = await prisma.class.count({ where: { teacherId: user.id } });
    if (cnt > 0) redirect("/teacher/dashboard");
  } else {
    const cnt = await prisma.classEnrollment.count({ where: { studentId: user.id } });
    if (cnt > 0) redirect("/student/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        color: C.text0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={22} />
        </Link>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 480, width: "100%" }}>
          {user.role === "TEACHER" ? (
            <CreateClassForm />
          ) : (
            <JoinClassForm />
          )}
        </div>
      </div>
    </div>
  );
}

function CreateClassForm() {
  return (
    <form action={createClass}>
      <div
        style={{
          fontSize: 12,
          color: C.cyan,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Welcome to Cortex
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Create your first class
      </h1>
      <p style={{ fontSize: 14, color: C.text1, margin: "0 0 28px", lineHeight: 1.5 }}>
        We&apos;ll generate an invite code your students can use to join. You can make more classes
        later.
      </p>
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
          width: "100%",
          padding: "14px 20px",
          background: C.text0,
          color: C.bg0,
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        Create Class <Icon name="arrow" size={14} color={C.bg0} />
      </button>
    </form>
  );
}

function JoinClassForm() {
  return (
    <form action={joinClass}>
      <div
        style={{
          fontSize: 12,
          color: C.cyan,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Welcome to Cortex
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Join a class
      </h1>
      <p style={{ fontSize: 14, color: C.text1, margin: "0 0 28px", lineHeight: 1.5 }}>
        Ask your teacher for the invite code (it looks like ABC123).
      </p>
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
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          letterSpacing: "0.2em",
          textAlign: "center",
          marginBottom: 24,
          outline: "none",
          textTransform: "uppercase",
        }}
      />
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "14px 20px",
          background: C.text0,
          color: C.bg0,
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        Join Class <Icon name="arrow" size={14} color={C.bg0} />
      </button>
    </form>
  );
}
