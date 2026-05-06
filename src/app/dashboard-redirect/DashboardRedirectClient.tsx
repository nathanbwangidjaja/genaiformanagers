"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C } from "@/components/cortex/tokens";
import { Logo, Btn } from "@/components/cortex/primitives";

/**
 * Client fallback for /dashboard-redirect — shows a visible loading spinner
 * immediately, attempts a client-side navigation after 4 seconds, and
 * surfaces manual navigation buttons after 8 seconds. Prevents users from
 * staring at a black screen if the server-side redirect stalls.
 */
export function DashboardRedirectClient({
  fallbackHref,
}: {
  fallbackHref: string;
}) {
  const router = useRouter();
  const [stage, setStage] = React.useState<"loading" | "redirecting" | "manual">("loading");

  React.useEffect(() => {
    const t1 = setTimeout(() => {
      setStage("redirecting");
      router.push(fallbackHref);
    }, 4_000);
    const t2 = setTimeout(() => {
      setStage("manual");
    }, 8_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router, fallbackHref]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        color: C.text0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
      }}
    >
      <Logo size={28} />
      <Spinner />
      <div style={{ fontSize: 14, color: C.text2, marginTop: 8 }}>
        {stage === "loading" && "Loading your dashboard…"}
        {stage === "redirecting" && "Almost there…"}
        {stage === "manual" && "This is taking longer than usual."}
      </div>
      {stage === "manual" && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Link href="/teacher/dashboard" style={{ textDecoration: "none" }}>
            <Btn kind="primary" size="md">
              Teacher dashboard
            </Btn>
          </Link>
          <Link href="/student/dashboard" style={{ textDecoration: "none" }}>
            <Btn kind="secondary" size="md">
              Student dashboard
            </Btn>
          </Link>
          <Link href="/sign-in" style={{ textDecoration: "none" }}>
            <Btn kind="ghost" size="md">
              Sign in again
            </Btn>
          </Link>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: `3px solid ${C.bg2}`,
        borderTopColor: C.cyan,
        animation: "cortex-spin 0.9s linear infinite",
      }}
    >
      <style>{`@keyframes cortex-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
