/**
 * Open Exchange Rate API client — real-time USD-to-X conversion rates,
 * no API key required.
 *
 * Used to ground proportional-reasoning questions (7.RP.*, 7.NS.3) in
 * today's actual exchange rates rather than fabricated ratios. A teacher
 * generating a unit-rate question gets a question backed by the rate
 * Bloomberg quoted this morning, which (a) feels real to students and
 * (b) gives the teacher a primary-source citation.
 *
 * https://www.exchangerate-api.com/docs/free
 */

interface RatesResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
}

export interface ExchangeRateSnapshot {
  base: string; // "USD"
  asOf: string; // human-readable timestamp
  rates: { code: string; name: string; rate: number }[];
  source: string;
}

const CURRENCIES_OF_INTEREST: { code: string; name: string }[] = [
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "INR", name: "Indian Rupee" },
];

export async function fetchUsdRates(): Promise<ExchangeRateSnapshot | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { "User-Agent": "Cortex/0.1 (educational)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RatesResponse;
    if (data.result !== "success") return null;

    // Shuffle so successive currency-grounded questions don't all use the
    // same target currency. The model tends to pick the first listed rate.
    const shuffled = [...CURRENCIES_OF_INTEREST];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled
      .map((c) => ({ code: c.code, name: c.name, rate: data.rates[c.code] }))
      .filter((r) => Number.isFinite(r.rate));

    if (picked.length === 0) return null;

    return {
      base: data.base_code,
      asOf: data.time_last_update_utc,
      rates: picked,
      source: `open.er-api.com, last updated ${data.time_last_update_utc}`,
    };
  } catch {
    return null;
  }
}
