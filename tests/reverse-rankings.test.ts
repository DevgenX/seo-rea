import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateCost } from "../src/adapters/dataforseo.js";
import { readLedger } from "../src/core/budget.js";
import { parseBacklinks, parseCompetitors, parseRankedKeywords, rollUp } from "../src/core/reverse/rankings.js";
import { validateReverse } from "../src/core/reverse/schema.js";
import { runCrawl } from "../src/services/crawl.js";
import { runReverse } from "../src/services/reverse.js";
import { planCalls } from "../src/services/reverse-rankings.js";
import { fakeFetch } from "./crawl-site.js";

const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-rank-"));
const quiet = (): void => {};
const ENV = { DATAFORSEO_LOGIN: "user", DATAFORSEO_PASSWORD: "pw" };

const ok = (cost: number, result: Record<string, unknown>) => ({
  status_code: 20000,
  status_message: "Ok.",
  cost,
  tasks: [{ status_code: 20000, status_message: "Ok.", cost, result: [result] }],
});
const kw = (keyword: string, pos: number, url: string, volume: number, etv: number, intent = "commercial") => ({
  keyword_data: {
    keyword,
    keyword_info: { search_volume: volume, cpc: 1.2 },
    search_intent_info: { main_intent: intent },
  },
  ranked_serp_element: { serp_item: { type: "organic", rank_group: pos, url, etv } },
});
const RANKED = ok(0.0103, {
  total_count: 412,
  metrics: { organic: { pos_1: 5, pos_2_3: 10, pos_4_10: 40, count: 412, etv: 1830.4 } },
  items: [
    kw("amex offers", 2, "https://example.com/offers/", 9900, 900),
    kw("chase offers", 6, "https://example.com/offers/chase", 2400, 120),
    kw("best credit card app", 12, "https://example.com/", 1300, 40, "informational"),
  ],
});
const COMPETITORS = ok(0.0101, {
  items: [
    { domain: "example.com", intersections: 412 },
    {
      domain: "rival.com",
      intersections: 150,
      avg_position: 8.33,
      full_domain_metrics: { organic: { count: 9000, etv: 50000 } },
    },
  ],
});
const BACKLINKS = ok(0.02, {
  rank: 310,
  backlinks: 5400,
  referring_domains: 820,
  referring_main_domains: 700,
  broken_backlinks: 12,
  referring_domains_nofollow: 90,
});

function dfsFetch(calls: string[], over: Record<string, unknown> = {}): typeof fetch {
  const site = fakeFetch();
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith("https://api.dataforseo.com/")) return site(input, init);
    calls.push(url);
    const body =
      over[url] ??
      (url.includes("ranked_keywords")
        ? RANKED
        : url.includes("competitors_domain")
          ? COMPETITORS
          : url.includes("backlinks")
            ? BACKLINKS
            : {});
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

let crawlDir: string | null = null;
async function crawl(): Promise<string> {
  if (crawlDir) return crawlDir;
  crawlDir = await tmp();
  await runCrawl({ domain: "example.com", out: crawlDir, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
  return crawlDir;
}

async function reverse(extra: Partial<Parameters<typeof runReverse>[0]> = {}, calls: string[] = []) {
  const work = await tmp();
  return runReverse({
    domain: "example.com",
    out: join(work, "out"),
    fromCrawl: await crawl(),
    offpage: false,
    delayMs: 0,
    env: ENV,
    ledgerPath: join(work, "ledger.csv"),
    cacheDir: join(work, "cache"),
    fetchImpl: dfsFetch(calls),
    log: quiet,
    ...extra,
  });
}

describe("cost estimates", () => {
  it("prices Labs per item and plans tight calls", () => {
    expect(estimateCost("dataforseo_labs/google/ranked_keywords/live", 100)).toBe(0.027);
    expect(estimateCost("dataforseo_labs/google/competitors_domain/live", 10)).toBe(0.0135);
    expect(estimateCost("backlinks/summary/live")).toBe(0.02);
    const plan = planCalls({ domain: "x.com", keywordsLimit: 100, competitorsLimit: 10, backlinks: false });
    expect(plan.map((p) => p.key)).toEqual(["ranked", "competitors"]);
    expect(plan.reduce((s, p) => s + p.estimateUsd, 0)).toBeCloseTo(0.0405, 5);
  });
});

describe("parsers", () => {
  it("reads ranked keywords, competitors and backlinks", () => {
    const r = parseRankedKeywords(RANKED);
    expect(r.totals).toEqual({ rankedKeywords: 412, estTrafficMonthly: 1830.4, top3: 15, top10: 55 });
    expect(r.keywords[0]).toMatchObject({
      keyword: "amex offers",
      position: 2,
      volume: 9900,
      etv: 900,
      intent: "commercial",
    });
    expect(parseCompetitors(COMPETITORS, "example.com")).toEqual([
      { domain: "rival.com", sharedKeywords: 150, avgPosition: 8.3, rankedKeywords: 9000, estTrafficMonthly: 50000 },
    ]);
    expect(parseBacklinks(BACKLINKS)?.referringDomains).toBe(820);
    expect(parseRankedKeywords({}).keywords).toEqual([]);
  });
  it("rolls traffic up by section, page and intent", () => {
    const u = rollUp(parseRankedKeywords(RANKED).keywords);
    expect(u.sections[0]).toMatchObject({ key: "/offers", keywords: 2, top10: 2, etv: 1020, share: 0.96 });
    expect(u.pages[0]?.url).toBe("https://example.com/offers/");
    expect(u.intents.map((i) => i.intent)).toEqual(["commercial", "informational"]);
  });
});

describe("reverse with paid rankings", () => {
  it("is off by default and makes no paid call", async () => {
    const calls: string[] = [];
    const { report } = await reverse({ budgetUsd: 0 }, calls);
    expect(calls).toEqual([]);
    expect(report.rankings).toBeNull();
    expect(report.cost).toEqual({ usd: 0, paidCalls: 0 });
  });

  it("estimates, calls, logs actual cost and adds evidence-backed findings", async () => {
    const calls: string[] = [];
    const logs: string[] = [];
    const work = await tmp();
    const ledgerPath = join(work, "ledger.csv");
    const { report, reportPath } = await reverse({ budgetUsd: 0.05, ledgerPath, log: (m) => logs.push(m) }, calls);
    expect(() => validateReverse(report)).not.toThrow();
    expect(calls).toHaveLength(2);
    expect(logs.find((l) => l.startsWith("DataForSEO estimate: $0.0405"))).toBeDefined();
    const r = report.rankings;
    expect(r?.cost).toEqual({ estimateUsd: 0.0405, actualUsd: 0.0204, calls: 2, fromCache: 0 });
    expect(report.cost).toEqual({ usd: 0.0204, paidCalls: 2 });
    expect(r?.competitors[0]?.domain).toBe("rival.com");
    expect(report.summary[0]?.claim).toMatch(/Ranks for 412 Google keywords/);
    expect(report.summary[0]?.evidenceIds).toEqual(r?.evidenceIds);
    expect(report.playbook[0]?.step).toMatch(/page-two keywords: "chase offers"/);
    const ledger = await readLedger(ledgerPath);
    expect(ledger.map((x) => x.usd)).toEqual([0.0103, 0.0101]);
    expect(await readFile(reportPath, "utf8")).toContain("## 11. What it actually ranks for");
  });

  it("serves a repeat run from cache for $0", async () => {
    const work = await tmp();
    const shared = { budgetUsd: 0.05, cacheDir: join(work, "cache"), ledgerPath: join(work, "ledger.csv") };
    await reverse(shared);
    const calls: string[] = [];
    const { report } = await reverse(shared, calls);
    expect(calls).toEqual([]);
    expect(report.rankings?.cost).toEqual({ estimateUsd: 0, actualUsd: 0, calls: 0, fromCache: 2 });
    expect(report.rankings?.notes.join(" ")).toMatch(/originally billed \$0\.0204/);
  });

  it("refuses before calling when the estimate does not fit the run or month cap", async () => {
    const calls: string[] = [];
    const { report } = await reverse({ budgetUsd: 0.03 }, calls);
    expect(calls).toEqual([]);
    expect(report.rankings).toBeNull();
    expect(report.unknowns.join(" ")).toMatch(/does not fit the budget/);

    const work = await tmp();
    const ledgerPath = join(work, "ledger.csv");
    const month = new Date().toISOString().slice(0, 7);
    await writeFile(ledgerPath, `date,run_id,source,query,usd\n"${month}-01T00:00:00Z","old","x","y",1.4900\n`);
    const { report: r2 } = await reverse({ budgetUsd: 0.05, ledgerPath }, calls);
    expect(calls).toEqual([]);
    expect(r2.rankings).toBeNull();
  });

  it("explains missing credentials", async () => {
    const { report } = await reverse({ budgetUsd: 0.05, env: {} });
    expect(report.rankings).toBeNull();
    expect(report.unknowns.join(" ")).toMatch(/DATAFORSEO_LOGIN/);
  });

  it("keeps rankings when the optional backlinks call is denied", async () => {
    const calls: string[] = [];
    const denied = {
      status_code: 20000,
      cost: 0,
      tasks: [{ status_code: 40204, status_message: "Access denied. Visit Plans and Subscriptions", result: null }],
    };
    const { report } = await reverse(
      {
        budgetUsd: 0.1,
        backlinks: true,
        fetchImpl: dfsFetch(calls, { "https://api.dataforseo.com/v3/backlinks/summary/live": denied }),
      },
      calls,
    );
    expect(calls).toHaveLength(3);
    expect(report.rankings?.backlinks).toBeNull();
    expect(report.rankings?.notes.join(" ")).toMatch(/backlinks: .*Access denied/);
  });
});
