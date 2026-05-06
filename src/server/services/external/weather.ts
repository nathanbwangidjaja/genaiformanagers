/**
 * Open-Meteo client — real-time temperature data, no API key required.
 *
 * Used to ground signed-arithmetic questions (7.NS.1*) in *today's* actual
 * weather rather than fabricated numbers. The model gets current and recent
 * hourly temperatures for a real location, picks one with a meaningful
 * positive→negative swing, and writes a question around it.
 *
 * https://open-meteo.com/en/docs
 */

interface MeteoResponse {
  current: { time: string; temperature_2m: number };
  hourly: { time: string[]; temperature_2m: number[] };
  current_units: { temperature_2m: string };
}

export interface WeatherSnapshot {
  location: string;
  current: { time: string; tempF: number };
  recentHours: { time: string; tempF: number }[];
  swingHigh: { time: string; tempF: number };
  swingLow: { time: string; tempF: number };
  source: string;
}

const LOCATIONS: { name: string; lat: number; lon: number }[] = [
  { name: "Anchorage, AK", lat: 61.22, lon: -149.9 },
  { name: "Fairbanks, AK", lat: 64.84, lon: -147.72 },
  { name: "Minneapolis, MN", lat: 44.98, lon: -93.27 },
  { name: "Denver, CO", lat: 39.74, lon: -104.99 },
  { name: "Buffalo, NY", lat: 42.89, lon: -78.88 },
  { name: "Bismarck, ND", lat: 46.81, lon: -100.78 },
  { name: "Burlington, VT", lat: 44.48, lon: -73.21 },
  { name: "Bozeman, MT", lat: 45.68, lon: -111.04 },
  { name: "Helena, MT", lat: 46.59, lon: -112.04 },
  { name: "Madison, WI", lat: 43.07, lon: -89.4 },
];

/**
 * Fetch current + recent-24h temperatures for a real US location with a
 * temperature swing wide enough to write a meaningful negative-numbers
 * question around. Returns null if every location fails (offline / blocked).
 *
 * The location order is shuffled per call so that successive question
 * generations within the same session land on different cities, giving the
 * teacher a varied set of word problems instead of three identical
 * "Anchorage at 7 PM" prompts.
 */
export async function fetchWeatherForSignedArithmetic(): Promise<WeatherSnapshot | null> {
  // Fisher-Yates-ish shuffle of a copy
  const shuffled = [...LOCATIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const loc of shuffled) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${loc.lat}&longitude=${loc.lon}` +
        `&current=temperature_2m&hourly=temperature_2m` +
        `&temperature_unit=fahrenheit&past_days=1&forecast_days=1` +
        `&timezone=auto`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Cortex/0.1 (educational)" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as MeteoResponse;

      const hours = data.hourly.time
        .map((t, i) => ({ time: t, tempF: data.hourly.temperature_2m[i] }))
        .filter((h) => Number.isFinite(h.tempF));
      // Take the last 24 reported hours
      const recent = hours.slice(-24);
      if (recent.length < 6) continue;

      // Pick a random pair of hours with a large enough difference,
      // so successive calls don't always pick the same global swing pair.
      let swingHigh = recent.reduce((a, b) => (b.tempF > a.tempF ? b : a));
      let swingLow = recent.reduce((a, b) => (b.tempF < a.tempF ? b : a));
      const candidates: { hi: typeof swingHigh; lo: typeof swingLow; gap: number }[] = [];
      for (let i = 0; i < recent.length; i++) {
        for (let j = i + 1; j < recent.length; j++) {
          const a = recent[i], b = recent[j];
          const gap = Math.abs(a.tempF - b.tempF);
          if (gap >= 6) {
            const hi = a.tempF > b.tempF ? a : b;
            const lo = a.tempF > b.tempF ? b : a;
            candidates.push({ hi, lo, gap });
          }
        }
      }
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        swingHigh = pick.hi;
        swingLow = pick.lo;
      }
      const swing = swingHigh.tempF - swingLow.tempF;

      // Prefer locations where the data is interesting (>= 10°F swing).
      // If we hit the last location, accept whatever we got.
      const isLast = loc === LOCATIONS[LOCATIONS.length - 1];
      if (swing < 10 && !isLast) continue;

      return {
        location: loc.name,
        current: { time: data.current.time, tempF: data.current.temperature_2m },
        recentHours: recent,
        swingHigh,
        swingLow,
        source: `Open-Meteo (https://open-meteo.com), retrieved ${new Date().toISOString()}`,
      };
    } catch {
      // try next location
    }
  }
  return null;
}
