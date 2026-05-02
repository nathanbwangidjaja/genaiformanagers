"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C } from "@/components/cortex/tokens";
import { Logo, Btn, Avatar } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";
import { GraphBG } from "@/components/cortex/GraphBG";

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
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
          {CLERK_ENABLED ? <ClerkSignIn /> : <MockSignIn />}
        </div>
      </div>
    </div>
  );
}

function ClerkSignIn() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SignIn } = require("@clerk/nextjs") as typeof import("@clerk/nextjs");
  return (
    <div style={{ width: "100%", maxWidth: 480 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 14, color: C.text1, margin: "0 0 24px" }}>
        Log in to continue building knowledge.
      </p>
      <SignIn forceRedirectUrl="/dashboard-redirect" signUpUrl="/sign-up" />
    </div>
  );
}

function MockSignIn() {
  const router = useRouter();
  const handleLogin = () => {
    const role =
      typeof window !== "undefined" ? window.localStorage.getItem("cortex_role") : null;
    router.push(role === "student" ? "/student/dashboard" : "/teacher/dashboard");
  };
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 14, color: C.text1, margin: "0 0 28px" }}>
        Log in to continue building knowledge. <span style={{ color: C.amber }}>(mock mode)</span>
      </p>
      <input
        type="email"
        placeholder="you@school.edu"
        style={{
          width: "100%",
          padding: "10px 14px",
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text0,
          fontSize: 14,
          marginBottom: 16,
          outline: "none",
        }}
      />
      <input
        type="password"
        placeholder="••••••••"
        style={{
          width: "100%",
          padding: "10px 14px",
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text0,
          fontSize: 14,
          marginBottom: 24,
          outline: "none",
        }}
      />
      <Btn
        kind="primary"
        size="lg"
        onClick={handleLogin}
        style={{ width: "100%" }}
        iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
      >
        Log In
      </Btn>
      <div style={{ fontSize: 13, color: C.text2, textAlign: "center", marginTop: 32 }}>
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" style={{ color: C.cyan, textDecoration: "none" }}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
