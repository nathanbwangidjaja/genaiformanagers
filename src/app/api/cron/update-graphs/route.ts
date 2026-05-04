import { NextResponse } from "next/server";
import { recomputeAllStudentGraphs } from "@/server/services/kg/aggregator";

// Vercel cron: "0,15,30,45 * * * *" in vercel.json
// Recomputes the per-student knowledge graph aggregates: behavior nodes,
// trait nodes, and pattern-extracted nodes (misconceptions, strengths,
// curiosity threads).

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await recomputeAllStudentGraphs();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("cron update-graphs failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
