// Polite HTTP: honest user agent, per-host rate limit, timeout, size cap, cache.

export const USER_AGENT = 'seo-rea/0.1 (+https://github.com/DevgenX/seo-rea; polite research bot)';
const MAX_BYTES = 3 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Serialises requests per host and keeps at least `minIntervalMs` between them. */
export class RateLimiter {
  constructor(minIntervalMs = 1500, { now = () => Date.now(), wait = sleep } = {}) {
    this.minIntervalMs = minIntervalMs;
    this.now = now;
    this.wait = wait;
    this.chains = new Map();
    this.last = new Map();
  }

  schedule(host, fn) {
    const prev = this.chains.get(host) ?? Promise.resolve();
    const run = prev.then(async () => {
      const gap = this.now() - (this.last.get(host) ?? -Infinity);
      if (gap < this.minIntervalMs) await this.wait(this.minIntervalMs - gap);
      try {
        return await fn();
      } finally {
        this.last.set(host, this.now());
      }
    });
    this.chains.set(host, run.catch(() => {}));
    return run;
  }
}

async function readCapped(res) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks = [];
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
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
}

/**
 * Fetch text. Never throws for HTTP or network errors: returns { ok:false, error }.
 * Only 2xx responses that pass `cacheIf` are cached.
 */
export async function politeFetch(url, { cache, ttlMs, cacheSource = 'page', cacheIf = () => true, limiter, timeoutMs = 15000, headers = {}, fetchImpl = fetch } = {}) {
  if (cache && ttlMs) {
    const hit = await cache.get(cacheSource, url, ttlMs);
    if (hit) return { ...hit, fromCache: true };
  }
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return { url, ok: false, status: 0, error: 'invalid url', body: '', fetchedAt: new Date().toISOString() };
  }
  const doFetch = async () => {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.8', ...headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await readCapped(res);
      return { url, finalUrl: res.url || url, ok: res.ok, status: res.status, contentType: res.headers.get('content-type') ?? '', body, fetchedAt };
    } catch (err) {
      return { url, ok: false, status: 0, error: String(err?.message ?? err), body: '', fetchedAt };
    }
  };
  const result = limiter ? await limiter.schedule(host, doFetch) : await doFetch();
  if (result.ok && cache && ttlMs && cacheIf(result)) await cache.set(cacheSource, url, result);
  return { ...result, fromCache: false };
}
