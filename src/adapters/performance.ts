// PageSpeed Insights API (free; PSI_API_KEY optional) and an optional local
// Lighthouse run (only if the `lighthouse` package is installed).

import type { AdapterContext, Availability, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";
import { errorMessage } from "../core/util.js";

export interface PerfResult {
  source: "psi" | "lighthouse";
  url: string;
  strategy: "mobile" | "desktop";
  ok: boolean;
  skipped: string;
  scores: Record<string, number | null>;
  lab: Record<string, string>;
  field: Record<string, string>;
  /** Raw response without any API key, for evidence. */
  raw: unknown;
  fetchedAt: string;
  fromCache: boolean;
}

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const LAB_AUDITS = [
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
  "first-contentful-paint",
  "speed-index",
];

/** Request URL. The API key goes in a header, so URLs, cache and evidence never hold it. */
export function psiUrl(url: string, strategy: string): string {
  const p = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) p.append("category", c);
  return `${PSI}?${p.toString()}`;
}

type Lhr = {
  categories?: Record<string, { score?: number | null }>;
  audits?: Record<string, { displayValue?: string }>;
};

export function summarizeLhr(lhr: Lhr): Pick<PerfResult, "scores" | "lab"> {
  const scores: Record<string, number | null> = {};
  for (const c of CATEGORIES) {
    const s = lhr.categories?.[c]?.score;
    scores[c] = typeof s === "number" ? Math.round(s * 100) : null;
  }
  const lab: Record<string, string> = {};
  for (const a of LAB_AUDITS) {
    const v = lhr.audits?.[a]?.displayValue;
    if (v) lab[a] = v;
  }
  return { scores, lab };
}

export function parsePsi(json: unknown): Pick<PerfResult, "scores" | "lab" | "field"> {
  const j = (json ?? {}) as {
    lighthouseResult?: Lhr;
    loadingExperience?: { metrics?: Record<string, { percentile?: number; category?: string }> };
  };
  const field: Record<string, string> = {};
  for (const [k, m] of Object.entries(j.loadingExperience?.metrics ?? {})) {
    field[k] = `${m.percentile ?? "?"} (${m.category ?? "?"})`;
  }
  return { ...summarizeLhr(j.lighthouseResult ?? {}), field };
}

function skipped(
  source: PerfResult["source"],
  url: string,
  strategy: PerfResult["strategy"],
  why: string,
  now: Date,
): PerfResult {
  return {
    source,
    url,
    strategy,
    ok: false,
    skipped: why,
    scores: {},
    lab: {},
    field: {},
    raw: null,
    fetchedAt: now.toISOString(),
    fromCache: false,
  };
}

export const psiAdapter: SourceAdapter<{ url: string; strategy?: "mobile" | "desktop" }, PerfResult> = {
  id: "pagespeed-insights",
  label: "PageSpeed Insights API (free; PSI_API_KEY optional)",
  category: "performance",
  paid: false,
  available: (ctx) =>
    Promise.resolve({
      available: true,
      reason: ctx.env.PSI_API_KEY ? "PSI_API_KEY set" : "no key: anonymous quota (may be rate limited)",
    }),
  async run({ url, strategy = "mobile" }, ctx: AdapterContext): Promise<PerfResult> {
    const key = ctx.env.PSI_API_KEY;
    const r = await ctx.fetch(psiUrl(url, strategy), {
      source: "psi",
      ttlMs: TTL.psi,
      timeoutMs: 90000,
      headers: { accept: "application/json", ...(key ? { "x-goog-api-key": key } : {}) },
    });
    if (!r.ok) {
      const why =
        r.status === 429
          ? "PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key"
          : r.error || `HTTP ${r.status}`;
      return skipped("psi", url, strategy, why, ctx.now());
    }
    try {
      const json: unknown = JSON.parse(r.body);
      return {
        source: "psi",
        url,
        strategy,
        ok: true,
        skipped: "",
        ...parsePsi(json),
        raw: json,
        fetchedAt: r.fetchedAt,
        fromCache: r.fromCache,
      };
    } catch (err) {
      return skipped("psi", url, strategy, `unreadable PSI response: ${errorMessage(err)}`, ctx.now());
    }
  },
};

async function importOptional(name: string): Promise<unknown> {
  try {
    return await import(name);
  } catch {
    return null;
  }
}

export async function lighthouseAvailability(): Promise<Availability> {
  const lh = await importOptional("lighthouse");
  const cl = await importOptional("chrome-launcher");
  if (!lh || !cl) return { available: false, reason: "lighthouse not installed (optional: npm i lighthouse)" };
  return { available: true, reason: "lighthouse + chrome-launcher installed" };
}

type LighthouseFn = (url: string, flags: Record<string, unknown>) => Promise<{ lhr: Lhr } | undefined>;
type ChromeLauncher = {
  launch: (o: Record<string, unknown>) => Promise<{ port: number; kill: () => Promise<void> | void }>;
};

/** Local Lighthouse with Chrome from chrome-launcher (or CHROME_PATH). Skips if not installed. */
export const lighthouseAdapter: SourceAdapter<{ url: string; strategy?: "mobile" | "desktop" }, PerfResult> = {
  id: "lighthouse-local",
  label: "Local Lighthouse (optional dependency)",
  category: "performance",
  paid: false,
  available: () => lighthouseAvailability(),
  async run({ url, strategy = "mobile" }, ctx: AdapterContext): Promise<PerfResult> {
    const lhMod = (await importOptional("lighthouse")) as { default?: LighthouseFn } | null;
    const clMod = (await importOptional("chrome-launcher")) as ChromeLauncher | null;
    if (!lhMod?.default || !clMod) return skipped("lighthouse", url, strategy, "lighthouse not installed", ctx.now());
    const chrome = await clMod.launch({ chromeFlags: ["--headless=new"] });
    try {
      const res = await lhMod.default(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: CATEGORIES,
        formFactor: strategy,
        screenEmulation: strategy === "desktop" ? { disabled: true } : undefined,
      });
      if (!res) return skipped("lighthouse", url, strategy, "no Lighthouse result", ctx.now());
      return {
        source: "lighthouse",
        url,
        strategy,
        ok: true,
        skipped: "",
        ...summarizeLhr(res.lhr),
        field: {},
        raw: res.lhr,
        fetchedAt: ctx.now().toISOString(),
        fromCache: false,
      };
    } catch (err) {
      return skipped("lighthouse", url, strategy, errorMessage(err), ctx.now());
    } finally {
      await chrome.kill();
    }
  },
};
