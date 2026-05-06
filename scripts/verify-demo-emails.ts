/**
 * Marks the two demo Clerk emails as verified, so the team can sign in
 * without a verification-link ceremony.
 */
// Importing PrismaClient triggers @prisma/client's built-in .env loader,
// which populates CLERK_SECRET_KEY for us. We don't actually use prisma here.
import "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const EMAILS = ["demo.teacher@cortex.app", "demo.student@cortex.app"];

async function main() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.error("CLERK_SECRET_KEY missing — make sure tsx loaded .env");
    process.exit(1);
  }
  const clerk = createClerkClient({ secretKey: secret });

  for (const email of EMAILS) {
    const list = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    const u = list.data[0];
    if (!u) {
      console.log(`  skip ${email} (no user)`);
      continue;
    }
    for (const ea of u.emailAddresses) {
      const updated = await clerk.emailAddresses.updateEmailAddress(ea.id, {
        verified: true,
      });
      console.log(`  ${email} (${ea.id}) → verification: ${updated.verification?.status ?? "(unknown)"}`);
    }
  }
  console.log("\n✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
