// Looks up the user's role after sign-in, ensures the User row exists, and
// redirects to onboarding (no data yet) or the right dashboard.
//
// The page renders a visible loading state immediately, then runs the
// server-side checks. A client-side fallback appears after 4s in case the
// server-side redirect stalls (Neon idle-suspend, etc.).

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { DashboardRedirectClient } from "./DashboardRedirectClient";

export const dynamic = "force-dynamic";

async function resolveRoute(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "/sign-in";

  try {
    if (user.role === "TEACHER") {
      const cnt = await prisma.class.count({ where: { teacherId: user.id } });
      return cnt === 0 ? "/onboarding" : "/teacher/dashboard";
    } else {
      const cnt = await prisma.classEnrollment.count({ where: { studentId: user.id } });
      return cnt === 0 ? "/onboarding" : "/student/dashboard";
    }
  } catch {
    // DB hiccup (Neon idle-suspend etc.) — fall back to a sane default.
    return user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard";
  }
}

export default async function DashboardRedirectPage() {
  let target: string | null = null;
  try {
    target = await resolveRoute();
  } catch {
    target = "/sign-in";
  }
  if (target) redirect(target);
  // If for some reason redirect() didn't fire, render the client fallback
  // so the user never sees a blank screen.
  return <DashboardRedirectClient fallbackHref="/teacher/dashboard" />;
}
