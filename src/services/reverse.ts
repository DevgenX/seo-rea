// `seo-rea reverse <domain>`: crawl (or reuse a crawl), read free AEO and
// off-page signals, infer the strategy, write report/reverse.{json,md}.
// Free only: no paid adapter is called.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { aiReadinessAdapter } from "../adapters/ai-readiness.js";
import { offpageAdapter } from "../adapters/offpage.js";
import { parseRobots } from "../adapters/site.js";
import { templateOf } from "../core/reverse/infer.js";
import { validateCrawl, type CrawlReport } from "../core/crawl/schema.js";
import { SeoReaError } from "../core/errors.js";
import { EvidenceStore } from "../core/evidence.js";
import { createFetcher, RateLimiter } from "../core/http.js";
import { renderReverse } from "../core/report/reverse.js";
import { inferStrategy } from "../core/reverse/infer.js";
import { REVERSE_SCHEMA_VERSION, validateReverse, type ReverseReport } from "../core/reverse/schema.js";
import type { AdapterContext, Logger } from "../core/types.js";
import { normalizeDomain, runIdFrom } from "../core/util.js";
import { DataForSEO } from "../adapters/dataforseo.js";
import { BudgetGuard } from "../core/budget.js";
import { Cache } from "../core/cache.js";
import { rankingFindings } from "../core/reverse/rankings.js";
import { collectRankings } from "./reverse-rankings.js";
import { VERSION } from "../version.js";
import { runCrawl } from "./crawl.js";

export interface ReverseOptions {
  domain: string;
  out: string;
  maxPages?: number;
  delayMs?: number;
  /** Reuse an existing crawl (run folder or crawl.json) instead of crawling. */
  fromCrawl?: string;
  /** Paid rankings: run cap in USD (0 = off, the default). */
  budgetUsd?: number;
  /** Monthly cap summed from the ledger (default 1.50). */
  monthlyCapUsd?: number;
  keywordsLimit?: number;
  competitorsLimit?: number;
  backlinks?: boolean;
  ledgerPath?: string;
  cacheDir?: string;
  noCache?: boolean;
  /** Skip Tranco / Wikipedia / Common Crawl lookups. */
  offpage?: boolean;
  force?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  log?: Logger;
}

export const REVERSE_DEFAULT_PAGES = 300;
export const REVERSE_MONTHLY_CAP_USD = 1.5;

/** Domain labels plus the name without common prefixes/suffixes (getcardlab -> cardlab). */
export function brandTokens(domain: string): string[] {
  const labels = domain.split(".").slice(0, -1);
  const out = new Set(labels);
  for (const l of labels) {
    const core = l.replace(/^(get|try|use|go|my|join|the)(?=[a-z]{3,})/, "").replace(/(app|hq|io|ai)$/, "");
    if (core.length >= 3) out.add(core);
  }
  return [...out];
}

async function loadCrawl(input: string): Promise<{ crawl: CrawlReport; path: string }> {
  const p = resolve(input);
  const file = p.endsWith(".json") ? p : join(p, "report", "crawl.json");
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    throw new SeoReaError("NOT_FOUND", `no crawl report at ${file}`);
  }
  return { crawl: validateCrawl(JSON.parse(raw)), path: file };
}

export async function runReverse(o: ReverseOptions): Promise<{ report: ReverseReport; reportPath: string }> {
  const domain = normalizeDomain(o.domain);
  if (!domain) throw new SeoReaError("INVALID_INPUT", "reverse needs a domain");
  const now = o.now ?? (() => new Date());
  const log = o.log ?? (() => {});
  const createdAt = now();
  const delayMs = o.delayMs ?? 500;
  if (o.force) await rm(join(o.out, "evidence"), { recursive: true, force: true });

  let crawl: CrawlReport;
  let crawlPath: string;
  if (o.fromCrawl) {
    ({ crawl, path: crawlPath } = await loadCrawl(o.fromCrawl));
    if (crawl.domain !== domain)
      throw new SeoReaError("INVALID_INPUT", `${crawlPath} is a crawl of ${crawl.domain}, not ${domain}`);
  } else {
    const r = await runCrawl({
      domain,
      out: o.out,
      maxPages: o.maxPages ?? REVERSE_DEFAULT_PAGES,
      delayMs,
      log,
      now,
      ...(o.force !== undefined ? { force: o.force } : {}),
      ...(o.signal ? { signal: o.signal } : {}),
      ...(o.fetchImpl ? { fetchImpl: o.fetchImpl } : {}),
    });
    crawl = r.report;
    crawlPath = join(o.out, "report", "crawl.json");
  }

  const fetch = createFetcher({
    limiter: new RateLimiter(delayMs),
    ...(o.fetchImpl ? { fetchImpl: o.fetchImpl } : {}),
  });
  const ctx: AdapterContext = { fetch, log, env: o.env ?? process.env, now };
  const store = await new EvidenceStore(o.out, { now }).load();
  const origin = new URL(crawl.startUrl).origin;

  const eCrawl = await store.add({
    source: `crawl-${domain}`,
    kind: "derived",
    url: crawl.startUrl,
    note: `${crawl.stats.pagesCrawled} pages crawled, ${crawl.stats.indexable} indexable; full data in ${relative(o.out, crawlPath) || crawlPath}`,
    content: {
      crawlReport: relative(o.out, crawlPath) || crawlPath,
      stats: crawl.stats,
      pages: crawl.pages.map((p) => ({
        url: p.url,
        status: p.status,
        template: templateOf(p, crawl.startUrl),
        title: p.title,
        h1: p.h1[0] ?? "",
        words: p.wordCount,
        schema: p.schemaTypes,
        published: p.published,
        tech: p.tech,
      })),
    },
  });
  const robotsRes = await fetch(`${origin}/robots.txt`, { source: "robots" });
  const robotsTxt = robotsRes.ok && !/<html/i.test(robotsRes.body) ? robotsRes.body : "";
  const eRobots = await store.add({
    source: `robots-${domain}`,
    url: `${origin}/robots.txt`,
    ext: "txt",
    content: robotsTxt || `not available: ${robotsRes.error || `HTTP ${robotsRes.status}`}`,
    fetchedAt: robotsRes.fetchedAt,
    note: robotsTxt ? "robots.txt" : "no robots.txt",
  });
  const ai = await aiReadinessAdapter.run({ origin, robots: parseRobots(robotsTxt) }, ctx);
  const eLlms = await store.add({
    source: `llms-txt-${domain}`,
    url: ai.llmsTxt.url,
    ext: "txt",
    content: ai.raw.llmsTxt.ok ? ai.raw.llmsTxt.body.slice(0, 200000) : `HTTP ${ai.raw.llmsTxt.status}`,
    note: ai.llmsTxt.present ? `llms.txt ${ai.llmsTxt.valid ? "valid" : "invalid"}` : "no llms.txt",
  });
  const eFull = await store.add({
    source: `llms-full-txt-${domain}`,
    url: ai.llmsFullTxt.url,
    ext: "txt",
    content: ai.raw.llmsFullTxt.ok ? ai.raw.llmsFullTxt.body.slice(0, 200000) : `HTTP ${ai.raw.llmsFullTxt.status}`,
    note: ai.llmsFullTxt.present ? "llms-full.txt present" : "no llms-full.txt",
  });

  let offpage: Parameters<typeof inferStrategy>[0]["offpage"] = null;
  let eOff: string | undefined;
  if (o.offpage !== false) {
    const brand = domain.split(".")[0] ?? domain;
    const s = await offpageAdapter.run({ domain, brand }, ctx);
    offpage = {
      trancoRank: s.tranco.value?.rank ?? null,
      wikipediaLinkingPages: s.wikiLinks.value?.linkingArticles ?? null,
      wikipediaMentions: s.wikiMentions.value?.hits ?? null,
      commonCrawlPages: s.commonCrawl.value?.pages ?? null,
    };
    eOff = (
      await store.add({
        source: `offpage-${domain}`,
        note: "Tranco, Wikipedia, Common Crawl (free public APIs)",
        content: {
          tranco: { ok: s.tranco.ok, problem: s.tranco.problem, url: s.tranco.url, value: s.tranco.value },
          wikiLinks: {
            ok: s.wikiLinks.ok,
            problem: s.wikiLinks.problem,
            url: s.wikiLinks.url,
            value: s.wikiLinks.value,
          },
          wikiMentions: {
            ok: s.wikiMentions.ok,
            problem: s.wikiMentions.problem,
            url: s.wikiMentions.url,
            value: s.wikiMentions.value,
          },
          commonCrawl: {
            ok: s.commonCrawl.ok,
            problem: s.commonCrawl.problem,
            url: s.commonCrawl.url,
            value: s.commonCrawl.value,
          },
        },
      })
    ).id;
  }

  const runId = runIdFrom(createdAt);
  const budgetUsd = o.budgetUsd ?? 0;
  const guard = new BudgetGuard(
    { runCapUsd: budgetUsd, monthlyCapUsd: o.monthlyCapUsd ?? REVERSE_MONTHLY_CAP_USD },
    resolve(o.ledgerPath ?? ".seo-rea/ledger.csv"),
    runId,
    now,
  );
  const cache = new Cache(resolve(o.cacheDir ?? ".seo-rea/cache"), { now, disabled: o.noCache ?? false });
  const dfs = new DataForSEO(guard, cache, o.env ?? process.env, o.fetchImpl ?? globalThis.fetch);
  const { rankings, reason } = await collectRankings({
    domain,
    dfs,
    guard,
    store,
    log,
    keywordsLimit: o.keywordsLimit ?? 100,
    competitorsLimit: o.competitorsLimit ?? 10,
    backlinks: o.backlinks ?? false,
  });
  if (!rankings && budgetUsd > 0) log(`rankings skipped: ${reason}`);

  const inferred = inferStrategy({
    crawl,
    crawlReportPath: relative(o.out, crawlPath) || crawlPath,
    ai: { crawlers: ai.crawlers, llmsTxt: ai.llmsTxt, llmsFullTxt: ai.llmsFullTxt },
    offpage,
    evidence: { crawl: eCrawl.id, robots: eRobots.id, llms: [eLlms.id, eFull.id], ...(eOff ? { offpage: eOff } : {}) },
    now: createdAt,
    brandTokens: brandTokens(domain),
  });
  if (rankings) {
    const extra = rankingFindings(rankings);
    inferred.summary.unshift(...extra.summary);
    inferred.playbook.unshift(...extra.playbook);
    inferred.unknowns[0] = "Rankings: DataForSEO Labs estimates (Google US); traffic is modelled, not measured.";
    if (!rankings.backlinks)
      inferred.unknowns[1] = "Backlinks: no link index queried (pass --backlinks); free proxies only.";
  } else if (budgetUsd > 0) inferred.unknowns.push(`Paid rankings not available: ${reason}.`);
  inferred.cost = { usd: rankings?.cost.actualUsd ?? 0, paidCalls: rankings?.cost.calls ?? 0 };
  const report = validateReverse({
    ...inferred,
    rankings,
    schemaVersion: REVERSE_SCHEMA_VERSION,
    toolVersion: VERSION,
    runId,
    timestamps: { createdAt: createdAt.toISOString(), writtenAt: now().toISOString() },
    evidenceIndex: "evidence/index.md",
  } satisfies ReverseReport);
  await mkdir(join(o.out, "report"), { recursive: true });
  const reportPath = join(o.out, "report", "reverse.md");
  await writeFile(join(o.out, "report", "reverse.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportPath, renderReverse(report));
  return { report, reportPath };
}
