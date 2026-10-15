// Internal-link analysis across crawled pages.

import type { Link } from "./page.js";

export interface Inlink {
  path: string;
  count: number;
  anchors: string[];
}

/** Count inlinks per internal path across crawled pages. */
export function inlinkCounts(pages: Array<{ internalLinks: Link[] }>, limit = 30): Inlink[] {
  const counts = new Map<string, { path: string; count: number; anchors: Set<string> }>();
  for (const p of pages) {
    for (const l of p.internalLinks) {
      let path: string;
      try {
        path = new URL(l.href).pathname;
      } catch {
        continue;
      }
      const e = counts.get(path) ?? { path, count: 0, anchors: new Set<string>() };
      e.count += 1;
      if (l.anchor) e.anchors.add(l.anchor.slice(0, 60));
      counts.set(path, e);
    }
  }
  return [...counts.values()]
    .toSorted((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((e) => ({ path: e.path, count: e.count, anchors: [...e.anchors].slice(0, 5) }));
}

const SKIP_EXT = /\.(pdf|png|jpe?g|gif|svg|webp|zip|xml|json|txt|mp4|css|js)$/i;

/** Crawl candidates on `domain`: sitemap URLs first, then links; unique paths. */
export function crawlCandidates(domain: string, sitemapUrls: string[], links: Link[], seen: Set<string>): string[] {
  const out: string[] = [];
  for (const u of [...sitemapUrls, ...links.map((l) => l.href)]) {
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      continue;
    }
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== domain || seen.has(parsed.pathname) || SKIP_EXT.test(parsed.pathname)) continue;
    seen.add(parsed.pathname);
    out.push(u);
  }
  return out;
}
