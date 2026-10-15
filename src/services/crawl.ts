// `seo-rea crawl`: crawl a site, analyse it, write report/crawl.{json,md}.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeCrawl } from "../core/crawl/analyze.js";
import { crawlSite } from "../core/crawl/crawler.js";
import { isHtmlType } from "../core/crawl/extract.js";
import { CRAWL_SCHEMA_VERSION, validateCrawl, type CrawlReport } from "../core/crawl/schema.js";
import { SeoReaError } from "../core/errors.js";
import { createFetcher, RateLimiter } from "../core/http.js";
import { renderCrawl } from "../core/report/crawl.js";
import type { Logger } from "../core/types.js";
import { normalizeDomain } from "../core/util.js";
import { VERSION } from "../version.js";

export interface CrawlServiceOptions {
  domain: string;
  out: string;
  maxPages?: number;
  maxDepth?: number;
  delayMs?: number;
  force?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Logger;
}

export const CRAWL_DEFAULTS = { maxPages: 500, maxDepth: 10, delayMs: 500 } as const;
export const CRAWL_MAX_PAGES = 5000;

export async function runCrawl(o: CrawlServiceOptions): Promise<{ report: CrawlReport; reportPath: string }> {
  const domain = normalizeDomain(o.domain);
  if (!domain) throw new SeoReaError("INVALID_INPUT", "crawl needs a domain");
  const maxPages = Math.min(CRAWL_MAX_PAGES, Math.max(1, o.maxPages ?? CRAWL_DEFAULTS.maxPages));
  const maxDepth = Math.max(0, o.maxDepth ?? CRAWL_DEFAULTS.maxDepth);
  const delayMs = o.delayMs ?? CRAWL_DEFAULTS.delayMs;
  const now = o.now ?? (() => new Date());
  const fetch = createFetcher({
    limiter: new RateLimiter(delayMs),
    ...(o.fetchImpl ? { fetchImpl: o.fetchImpl } : {}),
  });
  await mkdir(join(o.out, "report"), { recursive: true });
  const res = await crawlSite({
    domain,
    out: o.out,
    fetch,
    maxPages,
    maxDepth,
    ...(o.force !== undefined ? { force: o.force } : {}),
    ...(o.signal ? { signal: o.signal } : {}),
    ...(o.log ? { log: o.log } : {}),
    now,
  });
  const { state, pages } = res;
  const a = analyzeCrawl({ pages, startUrl: state.startUrl, sitemapUrls: state.sitemapUrls, blocked: state.blocked });
  const report = validateCrawl({
    schemaVersion: CRAWL_SCHEMA_VERSION,
    tool: "seo-rea",
    toolVersion: VERSION,
    kind: "crawl",
    runId: state.runId,
    domain,
    startUrl: state.startUrl,
    timestamps: { started: state.startedAt, finished: now().toISOString() },
    limits: { maxPages, maxDepth, delayMs },
    stats: {
      pagesCrawled: pages.length,
      htmlPages: pages.filter((p) => p.status === 200 && isHtmlType(p.contentType)).length,
      indexable: a.indexable,
      queuedLeft: state.queue.length,
      blockedByRobots: new Set(state.blocked).size,
      sitemapUrls: state.sitemapUrls.length,
      resumed: res.resumed,
      complete: state.complete,
    },
    robots: { fetched: state.robotsFetched, sitemaps: state.robotsSitemaps },
    pages,
    graph: a.graph,
    summary: a.summary,
    issues: a.issues,
  } satisfies CrawlReport);
  const reportPath = join(o.out, "report", "crawl.md");
  await writeFile(join(o.out, "report", "crawl.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportPath, renderCrawl(report));
  const start = pages.find((p) => p.url === state.startUrl);
  if (start && start.status === 0 && pages.length === 1)
    throw new SeoReaError("FETCH_FAILED", `${state.startUrl} could not be fetched: ${start.error ?? "unknown error"}`);
  return { report, reportPath };
}
