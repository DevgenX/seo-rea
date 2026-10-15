// Sitemap walk for the strategy map: robots.txt Sitemap lines (or
// /sitemap.xml), sitemap indexes, then child sitemaps picked one per type
// (name stem) so a 60-file article index does not crowd out product sitemaps.

import type { AdapterContext, FetchResult, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";
import { parseRobots, parseSitemap, type Robots } from "./site.js";

export interface SitemapWalk {
  origin: string;
  robotsFetch: FetchResult;
  robots: Robots;
  files: Array<{ url: string; kind: string; locs: number }>;
  indexChildren: number;
  childStems: Array<{ stem: string; files: number }>;
  urls: string[];
}

/** "https://x.com/sitemaps/us/wp-sitemap-posts-articles-12.xml" -> "us/posts-articles". */
export function sitemapStem(url: string): string {
  let p: string;
  try {
    p = new URL(url).pathname;
  } catch {
    return url;
  }
  const parts = p.split("/").filter(Boolean);
  const file = (parts.pop() ?? "")
    .replace(/\.xml(\.gz)?$/i, "")
    .replace(/^(wp-)?sitemap[-_]?/i, "")
    .replace(/[-_]?\d+$/, "")
    .replace(/[-_]?(index)$/i, "");
  const locale = parts.find((x) => /^[a-z]{2}(-[a-z]{2})?$/i.test(x));
  return `${locale ? `${locale}/` : ""}${file || "sitemap"}`;
}

/** Order child sitemaps round-robin across stems, largest stem first. */
export function pickChildren(children: string[], max: number): string[] {
  const by = new Map<string, string[]>();
  for (const c of children) {
    const s = sitemapStem(c);
    const list = by.get(s);
    if (list) list.push(c);
    else by.set(s, [c]);
  }
  const lists = [...by.values()].toSorted((a, b) => b.length - a.length);
  const out: string[] = [];
  for (let i = 0; out.length < max; i++) {
    let added = false;
    for (const l of lists)
      if (l[i] !== undefined && out.length < max) {
        out.push(l[i] as string);
        added = true;
      }
    if (!added) break;
  }
  return out;
}

export const sitemapWalkAdapter: SourceAdapter<{ origin: string; maxFiles?: number }, SitemapWalk> = {
  id: "sitemap-walk",
  label: "robots.txt + sitemap indexes (one child per type)",
  category: "site",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run({ origin, maxFiles = 12 }, ctx: AdapterContext): Promise<SitemapWalk> {
    const robotsFetch = await ctx.fetch(`${origin}/robots.txt`, { source: "robots", ttlMs: TTL.page });
    const robots = parseRobots(robotsFetch.ok && !/<html/i.test(robotsFetch.body) ? robotsFetch.body : "");
    const queue = robots.sitemaps.length
      ? [...new Set(robots.sitemaps)]
      : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
    const files: SitemapWalk["files"] = [];
    const urls: string[] = [];
    const children: string[] = [];
    let fetched = 0;
    for (let i = 0; i < queue.length && fetched < maxFiles; i++) {
      const url = queue[i] as string;
      fetched++;
      ctx.log(`sitemap: ${url}`);
      const r = await ctx.fetch(url, { source: "sitemap", ttlMs: TTL.page, timeoutMs: 30000 });
      if (!r.ok) continue;
      const sm = parseSitemap(r.body);
      if (sm.kind === "unknown") continue;
      files.push({ url, kind: sm.kind, locs: sm.locs.length });
      if (sm.kind === "index") {
        children.push(...sm.locs);
        // Re-plan the rest of the queue: unvisited top-level entries, then children by stem.
        const rest = queue.slice(i + 1).filter((u) => !sm.locs.includes(u));
        const picked = pickChildren(
          children.filter((c) => !queue.slice(0, i + 1).includes(c)),
          maxFiles,
        );
        queue.splice(i + 1, queue.length, ...rest, ...picked.filter((p) => !rest.includes(p)));
      } else urls.push(...sm.locs);
      // A bare /sitemap.xml that worked makes /sitemap_index.xml redundant.
      if (!robots.sitemaps.length && sm.kind === "urlset") break;
    }
    const stems = new Map<string, number>();
    for (const c of children) stems.set(sitemapStem(c), (stems.get(sitemapStem(c)) ?? 0) + 1);
    return {
      origin,
      robotsFetch,
      robots,
      files,
      indexChildren: children.length,
      childStems: [...stems.entries()]
        .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([stem, n]) => ({ stem, files: n })),
      urls: [...new Set(urls)],
    };
  },
};
