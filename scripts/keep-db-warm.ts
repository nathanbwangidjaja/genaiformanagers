/**
 * Pings the Neon database every 60 seconds to prevent the free-tier
 * auto-suspend that drops Prisma's pool connections mid-demo.
 *
 * Run in a separate terminal during the recording:
 *   npx tsx scripts/keep-db-warm.ts
 *
 * Stop with Ctrl+C when you're done recording.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function ping() {
  try {
    const t0 = Date.now();
    const n = await prisma.user.count();
    console.log(
      `[keep-warm] ${new Date().toISOString()}  user.count=${n}  ${Date.now() - t0}ms`,
    );
  } catch (e) {
    console.warn(`[keep-warm] ping failed: ${(e as Error).message}`);
  }
}

console.log("Keeping Neon DB warm — pinging every 60s. Ctrl+C to stop.");
await ping();
setInterval(ping, 60_000);

// Don't let the process exit
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
