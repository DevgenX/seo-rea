// Persisted crawl state so a crawl can stop and resume.
// data/crawl-state.json holds the queue and settings; data/pages.jsonl holds
// one CrawlPage per line, appended as pages are fetched.

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SeoReaError } from "../errors.js";
import { CrawlPageSchema, type CrawlPage } from "./schema.js";

export const STATE_VERSION = 1;

export interface QueueItem {
  url: string;
  depth: number;
  source: CrawlPage["source"];
}

export interface CrawlState {
  version: typeof STATE_VERSION;
  domain: string;
  startUrl: string;
  runId: string;
  startedAt: string;
  maxPages: number;
  maxDepth: number;
  queue: QueueItem[];
  /** Every URL ever queued (fetched or not), for de-duplication. */
  seen: string[];
  blocked: string[];
  sitemapUrls: string[];
  robotsFetched: boolean;
  robotsSitemaps: string[];
  complete: boolean;
}

export const statePath = (out: string): string => join(out, "data", "crawl-state.json");
export const pagesPath = (out: string): string => join(out, "data", "pages.jsonl");

/** Atomic write: temp file then rename, so a crash never leaves half a state file. */
export async function saveState(out: string, state: CrawlState): Promise<void> {
  const p = statePath(out);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(`${p}.tmp`, JSON.stringify(state));
  await rename(`${p}.tmp`, p);
}

export async function appendPage(out: string, page: CrawlPage): Promise<void> {
  await appendFile(pagesPath(out), `${JSON.stringify(page)}\n`);
}

/** Load state for `domain`; null when there is none. Throws CRAWL_STATE_INVALID on mismatch or corruption. */
export async function loadState(out: string, domain: string): Promise<CrawlState | null> {
  let raw: string;
  try {
    raw = await readFile(statePath(out), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  let s: CrawlState;
  try {
    s = JSON.parse(raw) as CrawlState;
  } catch (cause) {
    throw new SeoReaError("CRAWL_STATE_INVALID", `${statePath(out)} is not valid JSON`, { cause });
  }
  if (s.version !== STATE_VERSION || !Array.isArray(s.queue) || !Array.isArray(s.seen))
    throw new SeoReaError("CRAWL_STATE_INVALID", `${statePath(out)} was written by an incompatible version`);
  if (s.domain !== domain)
    throw new SeoReaError("CRAWL_STATE_INVALID", `${out} holds a crawl of ${s.domain}, not ${domain}`);
  return s;
}

/**
 * Read pages.jsonl. A torn last line (crash mid-append) is dropped; the URL
 * is re-queued by the caller because it is missing from the result.
 */
export async function loadPages(out: string): Promise<CrawlPage[]> {
  let raw: string;
  try {
    raw = await readFile(pagesPath(out), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const pages: CrawlPage[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = CrawlPageSchema.safeParse(JSON.parse(line));
      if (r.success) pages.push(r.data);
    } catch {
      // torn line
    }
  }
  return pages;
}
