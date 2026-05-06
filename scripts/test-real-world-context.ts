/**
 * End-to-end test of the two real-time external API integrations:
 *   - Open-Meteo for signed-arithmetic (7.NS.1*) questions
 *   - open.er-api.com for proportional-reasoning (7.RP.*) questions
 *
 * For each domain, generates a question with and without real-world context
 * so the difference is visible. Records:
 *   - whether each API call succeeded
 *   - latency of each external API call
 *   - the data each API returned
 *   - the resulting question for both modes
 *
 *   npx tsx scripts/test-real-world-context.ts
 */

import { fetchWeatherForSignedArithmetic } from "../src/server/services/external/weather";
import { fetchUsdRates } from "../src/server/services/external/currency";
import { generateQuestion } from "../src/server/services/ai/generate-question";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ result: T | null; ms: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - start };
  } catch (e: any) {
    console.error(`  ${label} threw:`, e?.message ?? e);
    return { result: null, ms: Date.now() - start };
  }
}

async function main() {
  // ===== Step 1: probe each external API directly =====
  console.log("=== STEP 1: External API probes ===\n");

  const w = await timed("Open-Meteo", fetchWeatherForSignedArithmetic);
  console.log(`Open-Meteo: ${w.result ? "OK" : "FAILED"} in ${w.ms} ms`);
  if (w.result) {
    console.log(`  Location: ${w.result.location}`);
    console.log(`  Current: ${w.result.current.tempF.toFixed(0)}°F at ${w.result.current.time}`);
    console.log(`  24h swing: ${w.result.swingLow.tempF.toFixed(0)}°F → ${w.result.swingHigh.tempF.toFixed(0)}°F`);
    console.log(`  Source: ${w.result.source}`);
  }

  const c = await timed("open.er-api.com", fetchUsdRates);
  console.log(`\nopen.er-api.com: ${c.result ? "OK" : "FAILED"} in ${c.ms} ms`);
  if (c.result) {
    console.log(`  As of: ${c.result.asOf}`);
    for (const r of c.result.rates) {
      console.log(`  1 USD = ${r.rate.toFixed(4)} ${r.code} (${r.name})`);
    }
  }

  // ===== Step 2: Generate a 7.NS.1d question WITHOUT real-world context =====
  console.log("\n\n=== STEP 2: 7.NS.1d (signed arithmetic) — WITHOUT real-world context ===\n");
  const baseline_ns = await timed("generate (no context)", () =>
    generateQuestion({
      standardCode: "7.NS.1d",
      standardName: "Add/subtract rationals using properties of operations",
      standardDescription:
        "Apply properties of operations as strategies to add and subtract rational numbers.",
      difficulty: 2.5,
      useRealWorldContext: false,
    }),
  );
  if (baseline_ns.result) {
    console.log(`(${baseline_ns.ms} ms)`);
    console.log(`Question: ${baseline_ns.result.text}`);
    for (const o of baseline_ns.result.options) {
      console.log(`  ${o.correct ? "✓" : " "} ${o.value}`);
    }
  }

  // ===== Step 3: Generate the same standard WITH real-world context =====
  console.log("\n\n=== STEP 3: 7.NS.1d — WITH real-world context (Open-Meteo) ===\n");
  const augmented_ns = await timed("generate (weather)", () =>
    generateQuestion({
      standardCode: "7.NS.1d",
      standardName: "Add/subtract rationals using properties of operations",
      standardDescription:
        "Apply properties of operations as strategies to add and subtract rational numbers.",
      difficulty: 2.5,
      useRealWorldContext: true,
    }),
  );
  if (augmented_ns.result) {
    console.log(`(${augmented_ns.ms} ms)`);
    console.log(`Question: ${augmented_ns.result.text}`);
    for (const o of augmented_ns.result.options) {
      console.log(`  ${o.correct ? "✓" : " "} ${o.value}`);
    }
    console.log(`Hints:`);
    for (const h of augmented_ns.result.hints) console.log(`  - ${h}`);
    if (augmented_ns.result.realWorldContext) {
      console.log(`External source: ${augmented_ns.result.realWorldContext.source}`);
    }
  }

  // ===== Step 4: 7.RP baseline =====
  console.log("\n\n=== STEP 4: 7.RP.3 (proportional reasoning) — WITHOUT real-world context ===\n");
  const baseline_rp = await timed("generate (no context)", () =>
    generateQuestion({
      standardCode: "7.RP.3",
      standardName: "Use proportional relationships to solve multistep ratio and percent problems",
      difficulty: 3.0,
      useRealWorldContext: false,
    }),
  );
  if (baseline_rp.result) {
    console.log(`(${baseline_rp.ms} ms)`);
    console.log(`Question: ${baseline_rp.result.text}`);
    for (const o of baseline_rp.result.options) {
      console.log(`  ${o.correct ? "✓" : " "} ${o.value}`);
    }
  }

  // ===== Step 5: 7.RP with real-world context =====
  console.log("\n\n=== STEP 5: 7.RP.3 — WITH real-world context (open.er-api.com) ===\n");
  const augmented_rp = await timed("generate (currency)", () =>
    generateQuestion({
      standardCode: "7.RP.3",
      standardName: "Use proportional relationships to solve multistep ratio and percent problems",
      difficulty: 3.0,
      useRealWorldContext: true,
    }),
  );
  if (augmented_rp.result) {
    console.log(`(${augmented_rp.ms} ms)`);
    console.log(`Question: ${augmented_rp.result.text}`);
    for (const o of augmented_rp.result.options) {
      console.log(`  ${o.correct ? "✓" : " "} ${o.value}`);
    }
    console.log(`Hints:`);
    for (const h of augmented_rp.result.hints) console.log(`  - ${h}`);
    if (augmented_rp.result.realWorldContext) {
      console.log(`External source: ${augmented_rp.result.realWorldContext.source}`);
    }
  }

  // ===== Step 6: graceful-fallback test (no API match) =====
  console.log("\n\n=== STEP 6: 7.G.4 (geometry) — useRealWorldContext=true should be a no-op ===\n");
  const geom = await timed("generate (geometry)", () =>
    generateQuestion({
      standardCode: "7.G.4",
      standardName: "Know the formulas for the area and circumference of a circle",
      difficulty: 2.5,
      useRealWorldContext: true,
    }),
  );
  if (geom.result) {
    console.log(`(${geom.ms} ms)`);
    console.log(`Question: ${geom.result.text}`);
    console.log(`realWorldContext attached? ${!!geom.result.realWorldContext}  (should be false — no matching API)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
