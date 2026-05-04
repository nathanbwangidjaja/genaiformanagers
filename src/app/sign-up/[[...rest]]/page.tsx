"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { C } from "@/components/cortex/tokens";
import { Logo, Btn, Avatar } from "@/components/cortex/primitives";
import { Icon, type IconName } from "@/components/cortex/Icon";
import { GraphBG } from "@/components/cortex/GraphBG";

type Role = "teacher" | "student";

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignUpPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<Role>("teacher");
  const [showClerk, setShowClerk] = React.useState(false);

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cortex_role", role);
    }
    if (CLERK_ENABLED) {
      // Show Clerk's SignUp UI in step 2 — role is passed via unsafeMetadata
      setShowClerk(true);
    } else {
      // Mock mode — straight into the chosen dashboard
      router.push(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
    }
  };

  return (
    <div style={{ background: C.bg0, color: C.text0, minHeight: "100vh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }}>
        {/* Left brand panel */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: C.bg0,
            padding: 48,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <GraphBG density={45} opacity={0.25} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, transparent 0%, ${C.bg0} 100%)`,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 5 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Logo size={24} />
            </Link>
          </div>
          <div style={{ position: "relative", zIndex: 5, marginTop: "auto" }}>
            <div
              style={{
                fontSize: 32,
                lineHeight: 1.3,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                color: C.text0,
                maxWidth: 480,
              }}
            >
              &ldquo;Cortex showed me that Maya wasn&apos;t bad at math — she was curious about it
              in ways my tests never measured.&rdquo;
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
              <Avatar name="Sarah Johnson" size={40} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Sarah Johnson</div>
                <div style={{ fontSize: 12, color: C.text2 }}>7th Grade Math · Lincoln ISD</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div
          style={{
            background: C.bg1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          {showClerk && CLERK_ENABLED ? (
            <ClerkSignUp role={role} onBack={() => setShowClerk(false)} />
          ) : (
            <RoleStep role={role} setRole={setRole} onContinue={handleContinue} />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleStep({
  role,
  setRole,
  onContinue,
}: {
  role: Role;
  setRole: (r: Role) => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
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
        Step 1 of 2
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        I am a…
      </h1>
      <p style={{ fontSize: 14, color: C.text1, margin: "0 0 28px" }}>
        Choose your role to get started.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <RoleCard
          icon="grad"
          title="Teacher"
          desc="Create classes and track student progress."
          selected={role === "teacher"}
          onClick={() => setRole("teacher")}
        />
        <RoleCard
          icon="bookOpen"
          title="Student"
          desc="Join a class and start learning."
          selected={role === "student"}
          onClick={() => setRole("student")}
        />
      </div>
      <Btn
        kind="primary"
        size="lg"
        onClick={onContinue}
        style={{ width: "100%" }}
        iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
      >
        Continue
      </Btn>
      <div style={{ fontSize: 13, color: C.text2, textAlign: "center", marginTop: 32 }}>
        Already have an account?{" "}
        <Link href="/sign-in" style={{ color: C.cyan, textDecoration: "none" }}>
          Log in
        </Link>
      </div>
    </div>
  );
}

function ClerkSignUp({ role, onBack }: { role: Role; onBack: () => void }) {
  return (
    <div style={{ width: "100%", maxWidth: 480 }}>
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: C.text2,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon name="arrowL" size={12} color={C.text2} /> Back
      </button>
      <div
        style={{
          fontSize: 12,
          color: C.cyan,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Step 2 of 2 — Signing up as {role}
      </div>
      <SignUp
        forceRedirectUrl="/dashboard-redirect"
        signInUrl="/sign-in"
        unsafeMetadata={{ role: role === "teacher" ? "TEACHER" : "STUDENT" }}
      />
    </div>
  );
}

function RoleCard({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: IconName;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 12,
        position: "relative",
        cursor: "pointer",
        background: selected ? `${C.cyan}06` : C.bg2,
        border: `1px solid ${selected ? C.cyan : C.border}`,
        boxShadow: selected ? `0 0 0 3px ${C.cyan}15` : "none",
        transition: "all 150ms",
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 18,
            height: 18,
            borderRadius: 99,
            background: C.cyan,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={11} color={C.bg0} strokeWidth={3} />
        </div>
      )}
      <Icon name={icon} size={28} color={selected ? C.cyan : C.text1} />
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.text1, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}
