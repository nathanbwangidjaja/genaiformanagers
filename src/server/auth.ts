import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

type ClerkEmail = { id: string; emailAddress: string };

/**
 * Returns the Cortex User row for the currently signed-in Clerk user.
 * Auto-creates the User row + StudentProfile on first call.
 * Redirects to /sign-in if no Clerk session.
 */
export async function getCurrentUser() {
  if (!CLERK_ENABLED) return null;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { studentProfile: true },
  });
  if (user) return user;

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
    include: { studentProfile: true },
  });

  if (role === "STUDENT" && !user.studentProfile) {
    await prisma.studentProfile.create({ data: { userId: user.id } });
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { studentProfile: true },
    });
  }

  return user!;
}

export async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "TEACHER") redirect("/student/dashboard");
  return user;
}

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "STUDENT") redirect("/teacher/dashboard");
  if (!user.studentProfile) {
    const sp = await prisma.studentProfile.create({ data: { userId: user.id } });
    return { ...user, studentProfile: sp };
  }
  return user;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
