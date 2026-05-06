/**
 * Generate one question end-to-end with full real-world context, and dump
 * EVERYTHING — the API data we sent the model, the question, the options,
 * the marked-correct option, the commonErrors, the hints. So we can spot
 * inconsistencies between the live API data and what the model produced.
 */

import { fetchWeatherForSignedArithmetic } from "../src/server/services/external/weather";
import { fetchUsdRates } from "../src/server/services/external/currency";
import { generateQuestion } from "../src/server/services/ai/generate-question";

async function main() {
  // 1. What did Open-Meteo actually return?
  console.log("=== OPEN-METEO RAW ===");
  const w = await fetchWeatherForSignedArithmetic();
  if (!w) { console.log("Open-Meteo failed"); return; }
  console.log(`Location: ${w.location}`);
  console.log(`Current: ${w.current.tempF.toFixed(0)}°F at ${w.current.time}`);
  console.log(`24h swing: low ${w.swingLow.tempF.toFixed(0)}°F at ${w.swingLow.time}, high ${w.swingHigh.tempF.toFixed(0)}°F at ${w.swingHigh.time}`);
  console.log(`Recent hours:`);
  for (const h of w.recentHours.slice(-12)) {
    console.log(`  ${h.time}: ${h.tempF.toFixed(0)}°F`);
  }

  // 2. Generate a 7.NS.1d question with real-world context
  console.log("\n=== GENERATED QUESTION (7.NS.1d, weather context) ===");
  const q = await generateQuestion({
    standardCode: "7.NS.1d",
    standardName: "Adding Rational Numbers",
    standardDescription: "Add rational numbers with different signs.",
    difficulty: 2.5,
    useRealWorldContext: true,
  });
  console.log(`TEXT:`);
  console.log(q.text);
  console.log(`\nOPTIONS:`);
  for (const o of q.options) {
    console.log(`  ${o.correct ? "✓ CORRECT:" : "  wrong:  "} ${o.value}`);
  }
  console.log(`\nHINTS:`);
  for (const h of q.hints) console.log(`  - ${h}`);
  console.log(`\nCOMMON ERRORS:`);
  for (const [val, err] of Object.entries(q.commonErrors)) {
    console.log(`  ${val} → ${err}`);
  }
  console.log(`\nDIFFICULTY: ${q.difficulty}`);
  console.log(`EXPECTED TIME: ${q.expectedTimeSec}s`);
  console.log(`SOURCE: ${q.realWorldContext?.source}`);

  // 3. Sanity check — does the question's reported temperature appear in the recent hours?
  console.log("\n=== SANITY CHECK ===");
  const recentValues = new Set(w.recentHours.map((h) => Math.round(h.tempF)));
  const recentValuesStr = Array.from(recentValues).sort((a, b) => a - b).join(", ");
  console.log(`Recent temperature values seen by API (rounded): ${recentValuesStr}`);
  // Pull every integer from the question text, find the temperature-like ones
  const tempsInText = (q.text.match(/(-?\d+)°F/g) ?? []).map((s) => parseInt(s));
  console.log(`Temperatures appearing in question text: ${tempsInText.join(", ")}`);
  for (const t of tempsInText) {
    const inRange = w.recentHours.some((h) => Math.abs(h.tempF - t) < 1);
    console.log(`  ${t}°F → ${inRange ? "✓ matches a real reading" : "✗ NOT in API data — model fabricated"}`);
  }

  // 4. Currency variant
  console.log("\n=== OPEN.ER-API.COM RAW ===");
  const c = await fetchUsdRates();
  if (c) {
    console.log(`As of: ${c.asOf}`);
    for (const r of c.rates) console.log(`  1 USD = ${r.rate.toFixed(4)} ${r.code}`);
  }

  console.log("\n=== GENERATED QUESTION (7.RP.3, currency context) ===");
  const q2 = await generateQuestion({
    standardCode: "7.RP.3",
    standardName: "Multi-step Ratio & Percent Problems",
    difficulty: 3.0,
    useRealWorldContext: true,
  });
  console.log(`TEXT:\n${q2.text}`);
  console.log(`\nOPTIONS:`);
  for (const o of q2.options) console.log(`  ${o.correct ? "✓ CORRECT:" : "  wrong:  "} ${o.value}`);
  console.log(`\nSOURCE: ${q2.realWorldContext?.source}`);

  // Sanity check rates
  if (c) {
    console.log("\n=== CURRENCY SANITY CHECK ===");
    const rateRegex = /1\s*USD\s*=\s*([0-9.]+)\s*([A-Z]{3})/i;
    const m = q2.text.match(rateRegex);
    if (m) {
      const claimed = parseFloat(m[1]);
      const code = m[2].toUpperCase();
      const actual = c.rates.find((r) => r.code === code)?.rate;
      console.log(`Question claims: 1 USD = ${claimed} ${code}`);
      console.log(`API says:        1 USD = ${actual?.toFixed(4) ?? "(not in our basket)"} ${code}`);
      if (actual && Math.abs(claimed - actual) > 0.05 * actual) {
        console.log(`  ✗ MISMATCH > 5% — model fabricated or rounded heavily`);
      } else if (actual) {
        console.log(`  ✓ Matches`);
      }
    } else {
      console.log("Could not find a rate claim in the question text.");
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
