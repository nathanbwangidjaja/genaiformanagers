import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect teacher / student / onboarding / dashboard-redirect routes when Clerk is configured.
// Without Clerk env vars, the underlying auth() call short-circuits and we fall through.

const isProtected = createRouteMatcher([
  "/teacher(.*)",
  "/student(.*)",
  "/dashboard-redirect",
  "/onboarding",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return NextResponse.next();
  const { userId } = await auth();
  if (!userId) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and any files with extensions
    "/((?!_next|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
