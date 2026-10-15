// Free off-page signals: Tranco popularity rank, Wikipedia links and brand
// mentions, Common Crawl index footprint. Each lookup returns its raw body for
// evidence and an empty value with a reason when the source fails.

import type { AdapterContext, SourceAdapter } from "../core/types.js";
import { errorMessage } from "../core/util.js";

const DAY = 86400000;

export interface OffpageLookup<T> {
  source: string;
  url: string;
  ok: boolean;
  problem: string;
  value: T | null;
  body: string;
  fetchedAt: string;
  fromCache: boolean;
}

async function getJson<T>(
  ctx: AdapterContext,
  source: string,
  url: string,
  read: (j: unknown) => T | null,
  timeoutMs = 20000,
): Promise<OffpageLookup<T>> {
  const r = await ctx.fetch(url, {
    source,
    ttlMs: 7 * DAY,
    timeoutMs,
    headers: { accept: "application/json" },
    cacheIf: (x) => /^\s*[[{]/.test(x.body),
  });
  const base = { source, url, body: r.body.slice(0, 200000), fetchedAt: r.fetchedAt, fromCache: r.fromCache };
  if (!r.ok) return { ...base, ok: false, problem: r.error || `HTTP ${r.status}`, value: null };
  try {
    const value = read(JSON.parse(r.body));
    return value === null
      ? { ...base, ok: false, problem: "unexpected response shape", value: null }
      : { ...base, ok: true, problem: "", value };
  } catch (err) {
    return { ...base, ok: false, problem: `not JSON: ${errorMessage(err).slice(0, 80)}`, value: null };
  }
}

export interface TrancoRank {
  /** Latest daily rank (1 = most popular); null when not in the list. */
  rank: number | null;
  date: string;
  /** Best rank in the returned window. */
  best: number | null;
}

export function readTranco(j: unknown): TrancoRank | null {
  const ranks = (j as { ranks?: Array<{ date?: string; rank?: number }> })?.ranks;
  if (!Array.isArray(ranks)) return null;
  const valid = ranks.filter((r) => typeof r.rank === "number");
  const latest = valid[0];
  return {
    rank: latest?.rank ?? null,
    date: latest?.date ?? "",
    best: valid.length ? Math.min(...valid.map((r) => r.rank as number)) : null,
  };
}

export interface WikipediaSignals {
  /** Wikipedia articles with an external link to the domain (max 500). */
  linkingArticles: number;
  sampleTitles: string[];
}

export function readExtUrlUsage(j: unknown): WikipediaSignals | null {
  const list = (j as { query?: { exturlusage?: Array<{ title?: string }> } })?.query?.exturlusage;
  if (!Array.isArray(list)) return null;
  const titles = [...new Set(list.map((x) => x.title ?? "").filter(Boolean))];
  return { linkingArticles: titles.length, sampleTitles: titles.slice(0, 8) };
}

export function readSearchHits(j: unknown): { hits: number; topTitles: string[] } | null {
  const q = (j as { query?: { searchinfo?: { totalhits?: number }; search?: Array<{ title?: string }> } })?.query;
  if (typeof q?.searchinfo?.totalhits !== "number") return null;
  return { hits: q.searchinfo.totalhits, topTitles: (q.search ?? []).map((s) => s.title ?? "").filter(Boolean) };
}

export interface CommonCrawlFootprint {
  crawl: string;
  /** CDX index blocks for *.domain; each block holds up to 3000 captures. */
  blocks: number;
  pages: number;
}

export interface OffpageSignals {
  tranco: OffpageLookup<TrancoRank>;
  wikiLinks: OffpageLookup<WikipediaSignals>;
  wikiMentions: OffpageLookup<{ hits: number; topTitles: string[] }>;
  commonCrawl: OffpageLookup<CommonCrawlFootprint>;
}

const WIKI = "https://en.wikipedia.org/w/api.php";

export const offpageAdapter: SourceAdapter<{ domain: string; brand: string }, OffpageSignals> = {
  id: "offpage-free",
  label: "Tranco rank, Wikipedia links and mentions, Common Crawl footprint",
  category: "site",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "public APIs, no key" }),
  async run({ domain, brand }, ctx): Promise<OffpageSignals> {
    ctx.log(`off-page: ${domain}`);
    const tranco = await getJson(
      ctx,
      "tranco",
      `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`,
      readTranco,
    );
    const wikiLinks = await getJson(
      ctx,
      "wikipedia",
      `${WIKI}?${new URLSearchParams({
        action: "query",
        list: "exturlusage",
        euquery: `*.${domain}`,
        euprotocol: "https",
        eunamespace: "0",
        eulimit: "500",
        format: "json",
      }).toString()}`,
      readExtUrlUsage,
    );
    const wikiMentions = await getJson(
      ctx,
      "wikipedia",
      `${WIKI}?${new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: `"${brand}"`,
        srlimit: "5",
        srinfo: "totalhits",
        format: "json",
      }).toString()}`,
      readSearchHits,
    );
    const coll = await getJson(ctx, "commoncrawl", "https://index.commoncrawl.org/collinfo.json", (j) =>
      Array.isArray(j) && typeof (j[0] as { id?: string })?.id === "string"
        ? { id: (j[0] as { id: string }).id, api: String((j[0] as { "cdx-api"?: string })["cdx-api"] ?? "") }
        : null,
    );
    let commonCrawl: OffpageLookup<CommonCrawlFootprint>;
    if (coll.value?.api) {
      const id = coll.value.id;
      commonCrawl = await getJson(
        ctx,
        "commoncrawl",
        `${coll.value.api}?url=${encodeURIComponent(`*.${domain}`)}&output=json&showNumPages=true`,
        (j) => {
          const o = j as { blocks?: number; pages?: number };
          return typeof o?.blocks === "number" ? { crawl: id, blocks: o.blocks, pages: o.pages ?? 0 } : null;
        },
        40000,
      );
    } else commonCrawl = { ...coll, value: null, ok: false, problem: `collection list: ${coll.problem}` };
    return { tranco, wikiLinks, wikiMentions, commonCrawl };
  },
};

export interface AppStoreApp {
  id: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  genre: string;
  price: string;
  releasedAt: string;
  updatedAt: string;
}

/** App Store id from an apps.apple.com / itunes.apple.com URL ("/id1472875808"). */
export function appStoreId(url: string): string {
  return /\/id(\d{6,})/.exec(url)?.[1] ?? "";
}

const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);
const strOr = (v: unknown): string => (typeof v === "string" ? v : "");

export function readItunesLookup(j: unknown): AppStoreApp | null {
  const r = (j as { results?: Array<Record<string, unknown>> })?.results?.[0];
  if (!r) return null;
  return {
    id: String(r.trackId ?? ""),
    name: strOr(r.trackName),
    rating: numOrNull(r.averageUserRating),
    ratingCount: numOrNull(r.userRatingCount),
    genre: strOr(r.primaryGenreName),
    price: strOr(r.formattedPrice),
    releasedAt: strOr(r.releaseDate).slice(0, 10),
    updatedAt: strOr(r.currentVersionReleaseDate).slice(0, 10),
  };
}

/** Public iTunes Lookup API (US store): rating, rating count, genre, price. */
export const appStoreAdapter: SourceAdapter<{ id: string }, OffpageLookup<AppStoreApp>> = {
  id: "itunes-lookup",
  label: "App Store listing (iTunes Lookup API)",
  category: "site",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "public API, no key" }),
  run: ({ id }, ctx) =>
    getJson(ctx, "itunes", `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=us`, readItunesLookup),
};
