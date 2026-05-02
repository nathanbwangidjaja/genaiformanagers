import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// When Clerk env vars are set, protect /teacher/*, /student/*, and /dashboard-redirect.
// Without them, everything falls through for local development without auth.

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

let clerkHandler: ((req: NextRequest) => Response | Promise<Response>) | null = null;

if (CLERK_ENABLED) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");
  const isProtected = createRouteMatcher(["/teacher(.*)", "/student(.*)", "/dashboard-redirect"]);
  clerkHandler = clerkMiddleware(async (auth: () => Promise<{ userId: string | null }>, req: NextRequest) => {
    if (isProtected(req)) {
      const { userId } = await auth();
      if (!userId) {
        const url = new URL("/sign-in", req.url);
        url.searchParams.set("redirect_url", req.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  });
}

export default function middleware(req: NextRequest) {
  if (clerkHandler) return clerkHandler(req);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
