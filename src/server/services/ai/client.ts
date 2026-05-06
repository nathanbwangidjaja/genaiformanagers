import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Resolve the Anthropic API key.
 *
 * Why this is more than `process.env.ANTHROPIC_API_KEY`:
 *   Some shells (notably Claude Code's terminal) inject ANTHROPIC_API_KEY=""
 *   into the env to prevent subprocesses from reading the parent's key. An
 *   empty value in process.env *blocks* Next's `.env` loader from filling it
 *   (Next preserves existing values). Result: `npm run dev` silently runs
 *   without the key even though it's in `.env`.
 *
 * So: if process.env has a real value, use it. Otherwise, fall through to
 * .env / .env.local files directly.
 */
function resolveApiKey(): string | null {
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;

  for (const filename of [".env.local", ".env"]) {
    const fp = path.resolve(process.cwd(), filename);
    if (!existsSync(fp)) continue;
    try {
      const text = readFileSync(fp, "utf8");
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq < 0) continue;
        const key = t.slice(0, eq).trim();
        if (key !== "ANTHROPIC_API_KEY") continue;
        let val = t.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (val.length > 0) return val;
      }
    } catch {
      // ignore — fall through
    }
  }
  return null;
}

const API_KEY = resolveApiKey();
export const ANTHROPIC_ENABLED = !!API_KEY;
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI features.",
    );
  }
  if (!_client) {
    // maxRetries: 0 — surface failures immediately. The SDK's default 2-retry
    // policy can stack with Anthropic's own internal timeouts and produce
    // 6+ minute hangs when the upstream is unhealthy.
    // timeout: 90s — bound the worst-case wait per request.
    _client = new Anthropic({
      apiKey: API_KEY,
      maxRetries: 0,
      timeout: 90_000,
    });
  }
  return _client;
}

export function aiNotConfiguredError() {
  return {
    error: "ai_not_configured",
    message:
      "AI features are not configured. Add ANTHROPIC_API_KEY to your .env file and restart the dev server.",
  };
}
