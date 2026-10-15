// Polite HTTP: honest user agent, per-host rate limit, timeout, size cap, cache.

import type { Cache } from "./cache.js";
import type { FetchOptions, FetchResult, Fetcher } from "./types.js";
import { VERSION } from "../version.js";
import { sleep } from "./util.js";

export const USER_AGENT = `seo-rea/${VERSION} (+https://github.com/DevgenX/seo-rea; polite research bot)`;
/** Product token matched against robots.txt groups. */
export const ROBOTS_TOKEN = "seo-rea";
const MAX_BYTES = 3 * 1024 * 1024;

/** Serialises work per host and keeps at least `minIntervalMs` between runs. */
export class RateLimiter {
  private readonly chains = new Map<string, Promise<unknown>>();
  private readonly last = new Map<string, number>();

  constructor(
    readonly minIntervalMs = 3000,
    private readonly clock: {
      now: () => number;
      wait: (ms: number) => Promise<void>;
    } = { now: () => Date.now(), wait: sleep },
    /** Optional per-host floor, e.g. a longer gap for search engines. */
    private readonly floorFor: (host: string) => number = () => 0,
  ) {}

  intervalFor(host: string): number {
    return Math.max(this.minIntervalMs, this.floorFor(host));
  }

  schedule<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(host) ?? Promise.resolve();
    const min = this.intervalFor(host);
    const run = prev.then(async () => {
      const gap = this.clock.now() - (this.last.get(host) ?? -Infinity);
      if (gap < min) await this.clock.wait(min - gap);
      try {
        return await fn();
      } finally {
        this.last.set(host, this.clock.now());
      }
    });
    this.chains.set(
      host,
      run.catch(() => undefined),
    );
    return run;
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export interface FetcherDeps {
  cache?: Cache;
  limiter?: RateLimiter;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

/**
 * Build a fetcher that never throws for HTTP or network errors: it returns
 * { ok:false, error }. Only 2xx responses that pass `cacheIf` are cached.
 */
export function createFetcher(deps: FetcherDeps = {}): Fetcher {
  const fetchImpl = deps.fetchImpl ?? fetch;
  return async (url: string, opts: FetchOptions = {}): Promise<FetchResult> => {
    const source = opts.source ?? "page";
    const { cache, limiter } = deps;
    if (cache && opts.ttlMs) {
      const hit = await cache.get<FetchResult>(source, url, opts.ttlMs);
      if (hit) return { ...hit, fromCache: true };
    }
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      return failed(url, "invalid url");
    }
    const doFetch = async (): Promise<FetchResult> => {
      const fetchedAt = new Date().toISOString();
      try {
        const res = await fetchImpl(url, {
          headers: {
            "user-agent": deps.userAgent ?? USER_AGENT,
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
            "accept-language": "en-US,en;q=0.8",
            ...opts.headers,
          },
          redirect: "follow",
          signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
        });
        const body = await readCapped(res);
        return {
          url,
          finalUrl: res.url || url,
          ok: res.ok,
          status: res.status,
          contentType: res.headers.get("content-type") ?? "",
          body,
          fetchedAt,
          fromCache: false,
        };
      } catch (err) {
        return failed(url, String((err as Error)?.message ?? err), fetchedAt);
      }
    };
    const result = limiter ? await limiter.schedule(host, doFetch) : await doFetch();
    const keep = opts.cacheIf ? opts.cacheIf(result) : true;
    if (result.ok && cache && opts.ttlMs && keep) await cache.set(source, url, result);
    return result;
  };
}

function failed(url: string, error: string, fetchedAt = new Date().toISOString()): FetchResult {
  return {
    url,
    finalUrl: url,
    ok: false,
    status: 0,
    contentType: "",
    body: "",
    fetchedAt,
    fromCache: false,
    error,
  };
}

export const isHtml = (r: FetchResult): boolean => r.ok && (!r.contentType || /html|xml/i.test(r.contentType));
