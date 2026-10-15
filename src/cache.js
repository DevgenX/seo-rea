import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TTL = { serp: 7 * DAY_MS, page: 30 * DAY_MS, api: 30 * DAY_MS };

const monthOf = (d) => d.toISOString().slice(0, 7);

export function cacheKey(source, query) {
  return createHash('sha1').update(`${source}\n${query}`).digest('hex');
}

/**
 * File cache at <dir>/<yyyy-mm>/<sha1(source+query)>.json.
 * Looks in the current and previous month so a 30-day TTL spans month ends.
 */
export class Cache {
  constructor(dir, { now = () => new Date(), disabled = false } = {}) {
    this.dir = dir;
    this.now = now;
    this.disabled = disabled;
  }

  async get(source, query, ttlMs) {
    if (this.disabled) return null;
    const key = cacheKey(source, query);
    const now = this.now();
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    for (const month of [monthOf(now), monthOf(prev)]) {
      try {
        const entry = JSON.parse(await readFile(join(this.dir, month, `${key}.json`), 'utf8'));
        if (now - new Date(entry.storedAt) <= ttlMs) return entry;
      } catch {
        // miss
      }
    }
    return null;
  }

  async set(source, query, value) {
    if (this.disabled) return value;
    const now = this.now();
    const dir = join(this.dir, monthOf(now));
    await mkdir(dir, { recursive: true });
    const entry = { source, query, storedAt: now.toISOString(), ...value };
    await writeFile(join(dir, `${cacheKey(source, query)}.json`), JSON.stringify(entry));
    return entry;
  }
}
