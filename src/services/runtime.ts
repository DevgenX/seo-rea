// Wires cache, rate limiters, fetcher and the optional browser for one run.

import { resolve } from "node:path";
import { Cache } from "../core/cache.js";
import { RateLimiter, createFetcher } from "../core/http.js";
import type { AdapterContext, Logger } from "../core/types.js";
import { BrowserSession, browserAvailability } from "../adapters/browser.js";

/** Search engines and ad libraries never get more than one request per 3 s. */
export const MIN_SEARCH_DELAY_MS = 3000;

const SEARCH_HOST = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|facebook\.com|linkedin\.com)$/i;

export function isSearchHost(host: string): boolean {
  return SEARCH_HOST.test(host);
}

export interface RuntimeOptions {
  cacheDir?: string;
  noCache?: boolean;
  delayMs?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Logger;
  /** Set false to never launch a browser. */
  browser?: boolean;
  /** Floor between requests to search hosts. Lowering it is for offline tests only. */
  minSearchDelayMs?: number;
}

export interface Runtime {
  ctx: AdapterContext;
  cache: Cache;
  /** Shared by HTTP and browser requests, so one host is never hit faster than allowed. */
  limiter: RateLimiter;
  session: BrowserSession;
  /** Resolves availability once; false when disabled or not installed. */
  browserReady: () => Promise<{ ok: boolean; reason: string }>;
  close: () => Promise<void>;
}

export function createRuntime(opts: RuntimeOptions = {}): Runtime {
  const now = opts.now ?? (() => new Date());
  const cache = new Cache(resolve(opts.cacheDir ?? ".seo-rea/cache"), { now, disabled: opts.noCache ?? false });
  const delay = opts.delayMs ?? MIN_SEARCH_DELAY_MS;
  const floor = opts.minSearchDelayMs ?? MIN_SEARCH_DELAY_MS;
  const limiter = new RateLimiter(delay, undefined, (host) => (isSearchHost(host) ? floor : 0));
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ctx: AdapterContext = {
    fetch: createFetcher({ cache, limiter, fetchImpl }),
    log: opts.log ?? (() => undefined),
    env: opts.env ?? process.env,
    now,
  };
  const session = new BrowserSession();
  let ready: Promise<{ ok: boolean; reason: string }> | null = null;
  const browserReady = (): Promise<{ ok: boolean; reason: string }> => {
    if (opts.browser === false) return Promise.resolve({ ok: false, reason: "disabled (--no-browser)" });
    ready ??= browserAvailability().then((a) => ({ ok: a.available, reason: a.reason }));
    return ready;
  };
  return { ctx, cache, limiter, session, browserReady, close: () => session.close() };
}
