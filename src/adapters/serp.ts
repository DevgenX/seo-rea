// SERP adapters, free ones only: headless browser, plain HTML, operator URL
// list and saved SERP files. Each attempt is judged and returned so the
// report can state what every engine did.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { AdapterContext, EngineName, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";
import type { RateLimiter } from "../core/http.js";
import { errorMessage } from "../core/util.js";
import { BrowserSession, browserAvailability, dismissConsent } from "./browser.js";
import { detectEngine, judgeSerp, type Judgement } from "./serp-parse.js";

export const ENGINE_NAMES: EngineName[] = ["google", "bing", "duckduckgo"];

export function isEngineName(s: string): s is EngineName {
  return (ENGINE_NAMES as string[]).includes(s);
}

const q = encodeURIComponent;

export const ENGINE_URLS = {
  browser: {
    google: (k: string) => `https://www.google.com/search?q=${q(k)}&hl=en&gl=us&pws=0`,
    bing: (k: string) => `https://www.bing.com/search?q=${q(k)}&setlang=en-US&cc=US`,
    duckduckgo: (k: string) => `https://duckduckgo.com/?q=${q(k)}&kl=us-en&ia=web`,
  },
  html: {
    google: (k: string) => `https://www.google.com/search?q=${q(k)}&hl=en&gl=us`,
    bing: (k: string) => `https://www.bing.com/search?q=${q(k)}&setlang=en&cc=US`,
    duckduckgo: (k: string) => `https://html.duckduckgo.com/html/?q=${q(k)}&kl=us-en`,
  },
} as const;

const ENGINE_LABEL: Record<EngineName, string> = {
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
};

const CONSENT: Record<EngineName, string[]> = {
  google: ['button:has-text("Reject all")', 'button:has-text("Accept all")', "#L2AGLb"],
  bing: ["#bnp_btn_reject", "#bnp_btn_accept", 'button:has-text("Reject")'],
  duckduckgo: [],
};

const RESULT_SELECTOR: Record<EngineName, string> = {
  google: "#search a h3, #rso a h3",
  bing: "li.b_algo h2 a",
  duckduckgo: 'article[data-testid="result"], a.result__a',
};

export interface SerpQuery {
  keyword: string;
  engines: EngineName[];
}

export interface SerpFetch {
  adapter: string;
  engine: EngineName | "manual";
  label: string;
  url: string;
  finalUrl: string;
  status: number;
  fromCache: boolean;
  fetchedAt: string;
  body: string;
  screenshot?: Buffer;
  consent: string;
  judgement: Judgement;
}

const usable = (f: SerpFetch): boolean => !f.judgement.problem;

/** Headless Chromium, one engine at a time, stop at the first usable SERP. */
export function createPlaywrightSerpAdapter(
  session: BrowserSession,
  limiter: RateLimiter,
): SourceAdapter<SerpQuery, SerpFetch[]> {
  return {
    id: "serp-playwright",
    label: "SERP via headless Chromium (playwright-core)",
    category: "serp",
    paid: false,
    available: () => browserAvailability(),
    async run(query: SerpQuery, ctx: AdapterContext): Promise<SerpFetch[]> {
      const out: SerpFetch[] = [];
      for (const engine of query.engines) {
        const url = ENGINE_URLS.browser[engine](query.keyword);
        ctx.log(`serp: ${ENGINE_LABEL[engine]} (headless Chromium)`);
        const f = await limiter.schedule(new URL(url).host, () =>
          browserFetch(session, engine, url, query.keyword, ctx),
        );
        out.push(f);
        if (usable(f)) break;
      }
      return out;
    },
  };
}

async function browserFetch(
  session: BrowserSession,
  engine: EngineName,
  url: string,
  keyword: string,
  ctx: AdapterContext,
): Promise<SerpFetch> {
  const base = {
    adapter: "serp-playwright",
    engine,
    label: `${ENGINE_LABEL[engine]} (headless Chromium)`,
    url,
    fromCache: false,
    fetchedAt: ctx.now().toISOString(),
  };
  let page;
  try {
    page = await session.page();
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    let consent = await dismissConsent(page, CONSENT[engine]);
    if (consent && !page.url().includes("/search") && engine === "google") {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }
    await page.waitForSelector(RESULT_SELECTOR[engine], { timeout: 8000 }).catch(() => undefined);
    const body = await page.content();
    const finalUrl = page.url();
    const screenshot = await page.screenshot({ fullPage: false }).catch(() => undefined);
    const status = res?.status() ?? 0;
    const judgement = judgeSerp(engine, keyword, body, status, finalUrl);
    consent = consent ? `clicked "${consent}"` : "none shown";
    return { ...base, finalUrl, status, body, consent, judgement, ...(screenshot ? { screenshot } : {}) };
  } catch (err) {
    const problem = `browser error: ${errorMessage(err).split("\n")[0]}`;
    return {
      ...base,
      finalUrl: url,
      status: 0,
      body: "",
      consent: "",
      judgement: { parsed: { organic: [], ads: [] }, relevance: 0, problem },
    };
  } finally {
    await page?.close().catch(() => undefined);
  }
}

/** Plain HTTP fetch of HTML SERPs (DuckDuckGo HTML, Bing; Google is usually walled). */
export const htmlSerpAdapter: SourceAdapter<SerpQuery, SerpFetch[]> = {
  id: "serp-html",
  label: "SERP via plain HTML (DuckDuckGo HTML, Bing)",
  category: "serp",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run(query: SerpQuery, ctx: AdapterContext): Promise<SerpFetch[]> {
    const out: SerpFetch[] = [];
    for (const engine of query.engines) {
      const url = ENGINE_URLS.html[engine](query.keyword);
      ctx.log(`serp: ${ENGINE_LABEL[engine]} (HTML)`);
      const r = await ctx.fetch(url, {
        source: `serp:${engine}`,
        ttlMs: TTL.serp,
        cacheIf: (x) => !judgeSerp(engine, query.keyword, x.body, x.status, x.finalUrl).problem,
      });
      const judgement: Judgement = r.ok
        ? judgeSerp(engine, query.keyword, r.body, r.status, r.finalUrl)
        : { parsed: { organic: [], ads: [] }, relevance: 0, problem: r.error || `HTTP ${r.status}` };
      out.push({
        adapter: "serp-html",
        engine,
        label: `${ENGINE_LABEL[engine]} HTML`,
        url,
        finalUrl: r.finalUrl,
        status: r.status,
        fromCache: r.fromCache,
        fetchedAt: r.fetchedAt,
        body: r.body,
        consent: "n/a",
        judgement,
      });
      if (!judgement.problem) break;
    }
    return out;
  },
};

/** Ranking URLs typed in by the operator, in order. */
export const urlListSerpAdapter: SourceAdapter<{ urls: string[] }, SerpFetch[]> = {
  id: "serp-urls",
  label: "SERP from an operator URL list (--serp-urls)",
  category: "serp",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  run(input, ctx): Promise<SerpFetch[]> {
    const organic = input.urls.map((url, i) => ({ position: i + 1, url, title: "", snippet: "" }));
    return Promise.resolve([
      {
        adapter: "serp-urls",
        engine: "manual",
        label: "Operator-supplied URL list",
        url: "",
        finalUrl: "",
        status: 200,
        fromCache: false,
        fetchedAt: ctx.now().toISOString(),
        body: JSON.stringify({ organic }, null, 2),
        consent: "n/a",
        judgement: { parsed: { organic, ads: [] }, relevance: 1, problem: organic.length ? "" : "empty URL list" },
      },
    ]);
  },
};

/** SERP pages saved from a real browser session (--serp-html). */
export const savedFileSerpAdapter: SourceAdapter<{ files: string[]; keyword: string }, SerpFetch[]> = {
  id: "serp-file",
  label: "SERP from saved browser HTML (--serp-html)",
  category: "serp",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run(input, ctx): Promise<SerpFetch[]> {
    const out: SerpFetch[] = [];
    for (const file of input.files) {
      const body = await readFile(file, "utf8");
      const engine = detectEngine(body);
      ctx.log(`serp: saved file ${file} (${engine || "unknown engine"})`);
      const judgement: Judgement = engine
        ? judgeSerp(engine, input.keyword, body, 200)
        : { parsed: { organic: [], ads: [] }, relevance: 0, problem: "unknown engine" };
      out.push({
        adapter: "serp-file",
        engine: engine || "manual",
        label: `Saved ${engine ? ENGINE_LABEL[engine] : "SERP"} page (${basename(file)})`,
        url: `file:${basename(file)}`,
        finalUrl: "",
        status: 200,
        fromCache: false,
        fetchedAt: ctx.now().toISOString(),
        body,
        consent: "n/a",
        judgement,
      });
    }
    return out;
  },
};
