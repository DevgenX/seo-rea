// Breadth-first, robots.txt-respecting site crawler with persisted,
// resumable state. Network access goes through the injected Fetcher, which
// is rate limited per host by the caller.

import { rm } from "node:fs/promises";
import { isAllowed, parseRobots, parseSitemap } from "../../adapters/site.js";
import { SeoReaError } from "../errors.js";
import { ROBOTS_TOKEN } from "../http.js";
import type { Fetcher, Logger } from "../types.js";
import { runIdFrom } from "../util.js";
import { toCrawlPage } from "./extract.js";
import type { CrawlPage } from "./schema.js";
import {
  appendPage,
  loadPages,
  loadState,
  pagesPath,
  saveState,
  statePath,
  STATE_VERSION,
  type CrawlState,
} from "./state.js";
import { inScope, isAssetUrl, normalizeUrl } from "./url.js";

export interface CrawlOptions {
  domain: string;
  out: string;
  fetch: Fetcher;
  maxPages: number;
  maxDepth: number;
  /** Start over even if a saved state exists. */
  force?: boolean;
  /** Save the state every n pages (default 25). */
  checkpointEvery?: number;
  /** Max sitemap files to read (default 50). */
  maxSitemaps?: number;
  signal?: AbortSignal;
  log?: Logger;
  now?: () => Date;
}

export interface CrawlResult {
  state: CrawlState;
  pages: CrawlPage[];
  resumed: boolean;
  robotsTxt: string;
}

async function readSitemaps(
  f: Fetcher,
  start: string[],
  maxFiles: number,
  maxUrls: number,
): Promise<{ urls: string[]; files: number }> {
  const queue = [...start];
  const urls: string[] = [];
  let files = 0;
  for (let i = 0; i < queue.length && files < maxFiles && urls.length < maxUrls; i++) {
    const r = await f(queue[i] as string, { source: "sitemap" });
    if (!r.ok) continue;
    const sm = parseSitemap(r.body);
    if (sm.kind === "unknown") continue;
    files++;
    if (sm.kind === "index") queue.push(...sm.locs);
    else urls.push(...sm.locs);
  }
  return { urls: urls.slice(0, maxUrls), files };
}

async function initState(o: CrawlOptions, startUrl: string): Promise<{ state: CrawlState; robotsTxt: string }> {
  const origin = new URL(startUrl).origin;
  const robotsRes = await o.fetch(`${origin}/robots.txt`, { source: "robots" });
  const robotsTxt = robotsRes.ok && !/<html/i.test(robotsRes.body) ? robotsRes.body : "";
  const robots = parseRobots(robotsTxt);
  const sitemapStart = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`];
  const sm = await readSitemaps(o.fetch, sitemapStart, o.maxSitemaps ?? 50, Math.max(o.maxPages * 4, 1000));
  const sitemapUrls = [
    ...new Set(sm.urls.map((u) => normalizeUrl(u)).filter((u): u is string => !!u && inScope(u, o.domain))),
  ];
  o.log?.(
    `robots.txt ${robotsTxt ? "read" : "missing"}; ${sitemapUrls.length} sitemap URL(s) from ${sm.files} file(s)`,
  );
  const now = (o.now ?? (() => new Date()))();
  const state: CrawlState = {
    version: STATE_VERSION,
    domain: o.domain,
    startUrl,
    runId: runIdFrom(now),
    startedAt: now.toISOString(),
    maxPages: o.maxPages,
    maxDepth: o.maxDepth,
    queue: [{ url: startUrl, depth: 0, source: "start" }],
    seen: [startUrl],
    blocked: [],
    sitemapUrls,
    robotsFetched: Boolean(robotsTxt),
    robotsSitemaps: robots.sitemaps,
    complete: false,
  };
  // Sitemap URLs go after the start page; links found while crawling are
  // queued in between, so link depth stays breadth-first.
  for (const u of sitemapUrls)
    if (u !== startUrl) {
      state.seen.push(u);
      state.queue.push({ url: u, depth: 1, source: "sitemap" });
    }
  return { state, robotsTxt };
}

/** Crawl `domain` from https://<domain>/ until the queue empties or maxPages is reached. */
export async function crawlSite(o: CrawlOptions): Promise<CrawlResult> {
  const startUrl = normalizeUrl(`https://${o.domain}/`);
  if (!startUrl) throw new SeoReaError("INVALID_INPUT", `not a crawlable domain: ${o.domain}`);
  if (o.force) {
    await rm(statePath(o.out), { force: true });
    await rm(pagesPath(o.out), { force: true });
  }
  let state = await loadState(o.out, o.domain);
  let pages: CrawlPage[] = [];
  let robotsTxt = "";
  const resumed = Boolean(state);
  if (state) {
    pages = await loadPages(o.out);
    const done = new Set(pages.map((p) => p.url));
    // Requeue anything the state thinks was taken but whose page line is missing (crash mid-write).
    const queued = new Set(state.queue.map((q) => q.url));
    if (!done.has(state.startUrl) && !queued.has(state.startUrl))
      state.queue.unshift({ url: state.startUrl, depth: 0, source: "start" });
    state.maxPages = o.maxPages;
    state.maxDepth = o.maxDepth;
    state.complete = false;
    const r = await o.fetch(`${new URL(state.startUrl).origin}/robots.txt`, { source: "robots" });
    robotsTxt = r.ok && !/<html/i.test(r.body) ? r.body : "";
    o.log?.(`resuming: ${pages.length} page(s) done, ${state.queue.length} queued`);
  } else {
    const init = await initState(o, startUrl);
    state = init.state;
    robotsTxt = init.robotsTxt;
    await saveState(o.out, state);
  }
  const robots = parseRobots(robotsTxt);
  const seen = new Set(state.seen);
  const done = new Set(pages.map((p) => p.url));
  const every = o.checkpointEvery ?? 25;
  let sinceSave = 0;

  const enqueue = (url: string, depth: number): void => {
    if (seen.has(url) || !inScope(url, o.domain) || isAssetUrl(url)) return;
    seen.add(url);
    state.seen.push(url);
    state.queue.push({ url, depth, source: "link" });
  };

  while (state.queue.length && pages.length < o.maxPages) {
    if (o.signal?.aborted) break;
    const item = state.queue.shift() as CrawlState["queue"][number];
    if (done.has(item.url)) continue;
    if (!isAllowed(robots, ROBOTS_TOKEN, item.url)) {
      state.blocked.push(item.url);
      continue;
    }
    const res = await o.fetch(item.url, { source: "crawl", timeoutMs: 20000 });
    const page = toCrawlPage(res, item.url, item.depth, item.source);
    pages.push(page);
    done.add(item.url);
    await appendPage(o.out, page);
    const final = normalizeUrl(page.finalUrl);
    if (final && final !== item.url && !seen.has(final) && inScope(final, o.domain)) {
      // The redirect target is the same document; do not fetch it again.
      seen.add(final);
      state.seen.push(final);
      done.add(final);
    }
    if (item.depth < o.maxDepth) for (const link of page.internalLinks) enqueue(link, item.depth + 1);
    if (pages.length % 50 === 0) o.log?.(`crawled ${pages.length}, queued ${state.queue.length}`);
    if (++sinceSave >= every) {
      await saveState(o.out, state);
      sinceSave = 0;
    }
  }
  state.complete = state.queue.length === 0;
  await saveState(o.out, state);
  return { state, pages, resumed, robotsTxt };
}
