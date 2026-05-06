/**
 * Generates one-time Clerk sign-in tokens for the teacher and student demo
 * accounts. Each token, when followed as a URL, signs the user in directly
 * — bypassing email verification, new-device checks, and any other sign-in
 * factors.
 *
 * Tokens are single-use and expire in 30 minutes (Clerk default), so
 * regenerate when sharing.
 */
import "@prisma/client"; // triggers .env load
import { createClerkClient } from "@clerk/backend";

const TEACHER_EMAIL = "demo.teacher@cortex.app";
const STUDENT_EMAIL = "demo.student@cortex.app";

async function main() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.error("CLERK_SECRET_KEY missing");
    process.exit(1);
  }
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const clerk = createClerkClient({ secretKey: secret });

  for (const email of [TEACHER_EMAIL, STUDENT_EMAIL]) {
    const list = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    const u = list.data[0];
    if (!u) {
      console.log(`skip ${email} — no user`);
      continue;
    }
    const token = await clerk.signInTokens.createSignInToken({
      userId: u.id,
      expiresInSeconds: 60 * 60 * 24, // 24 hours
    });
    const link = `${baseUrl}/sign-in?__clerk_ticket=${encodeURIComponent(token.token)}`;
    console.log(`\n${email}`);
    console.log(`  ${link}`);
  }
  console.log("\nLinks expire in 24 hours. Single-use. Regenerate by re-running this script.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
