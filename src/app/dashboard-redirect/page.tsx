// Looks up the user's role after sign-in and redirects to the right dashboard.
// Creates the User row inline if the Clerk webhook hasn't fired yet.

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

type ClerkEmail = { id: string; emailAddress: string };

export default async function DashboardRedirectPage() {
  if (!CLERK_ENABLED) {
    redirect("/teacher/dashboard");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { auth, currentUser } = require("@clerk/nextjs/server") as typeof import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    const cu = await currentUser();
    if (!cu) redirect("/sign-in");
    const emails = cu.emailAddresses as unknown as ClerkEmail[];
    const primary =
      emails.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
      emails[0]?.emailAddress;
    if (!primary) redirect("/sign-in");

    const meta = (cu.unsafeMetadata ?? cu.publicMetadata ?? {}) as { role?: "TEACHER" | "STUDENT" };
    const role: "TEACHER" | "STUDENT" = meta.role === "TEACHER" ? "TEACHER" : "STUDENT";

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: primary,
        firstName: cu.firstName ?? "",
        lastName: cu.lastName ?? "",
        role,
      },
    });

    if (role === "STUDENT") {
      await prisma.studentProfile.create({ data: { userId: user.id } });
    }
  }

  redirect(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
}
