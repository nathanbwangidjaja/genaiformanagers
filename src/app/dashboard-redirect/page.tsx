// Looks up the user's role after sign-in, ensures the User row exists, and
// redirects to onboarding (no data yet) or the right dashboard.

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "TEACHER") {
    const cnt = await prisma.class.count({ where: { teacherId: user.id } });
    if (cnt === 0) redirect("/onboarding");
    redirect("/teacher/dashboard");
  } else {
    const cnt = await prisma.classEnrollment.count({ where: { studentId: user.id } });
    if (cnt === 0) redirect("/onboarding");
    redirect("/student/dashboard");
  }
}
