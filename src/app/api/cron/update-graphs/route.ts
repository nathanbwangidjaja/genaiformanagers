import { NextResponse } from "next/server";
import { recomputeAllStudents } from "@/server/services/behavioral/aggregator";

// Vercel cron: "0,15,30,45 * * * *" in vercel.json
// Optionally gate with CRON_SECRET (Vercel attaches it as Bearer token on scheduled invocations)

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await recomputeAllStudents();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("cron update-graphs failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
