import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Default time-to-live per source family. */
export const TTL = {
  serp: 7 * DAY_MS,
  page: 30 * DAY_MS,
  api: 30 * DAY_MS,
  psi: 1 * DAY_MS,
} as const;

const monthOf = (d: Date): string => d.toISOString().slice(0, 7);

export function cacheKey(source: string, query: string): string {
  return createHash("sha1").update(`${source}\n${query}`).digest("hex");
}

export interface CacheEntry<T> {
  source: string;
  query: string;
  storedAt: string;
  value: T;
}

/**
 * File cache at <dir>/<yyyy-mm>/<sha1(source+query)>.json.
 * Looks in the current and previous month so a 30-day TTL spans month ends.
 */
export class Cache {
  constructor(
    readonly dir: string,
    private readonly opts: { now?: () => Date; disabled?: boolean } = {},
  ) {}

  private now(): Date {
    return this.opts.now ? this.opts.now() : new Date();
  }

  async get<T>(source: string, query: string, ttlMs: number): Promise<T | null> {
    if (this.opts.disabled) return null;
    const key = cacheKey(source, query);
    const now = this.now();
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    for (const month of [monthOf(now), monthOf(prev)]) {
      try {
        const entry = JSON.parse(await readFile(join(this.dir, month, `${key}.json`), "utf8")) as CacheEntry<T>;
        const age = now.getTime() - new Date(entry.storedAt).getTime();
        if (age >= 0 && age <= ttlMs) return entry.value;
      } catch {
        // miss
      }
    }
    return null;
  }

  async set<T>(source: string, query: string, value: T): Promise<void> {
    if (this.opts.disabled) return;
    const now = this.now();
    const dir = join(this.dir, monthOf(now));
    await mkdir(dir, { recursive: true });
    const entry: CacheEntry<T> = {
      source,
      query,
      storedAt: now.toISOString(),
      value,
    };
    await writeFile(join(dir, `${cacheKey(source, query)}.json`), JSON.stringify(entry));
  }
}
