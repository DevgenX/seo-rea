// Site-wide checks on crawled pages: issues with stable ids, the internal
// link graph (inlinks, click depth, PageRank) and a per-rule summary.

import { issueId } from "../issues.js";
import type { CrawlIssue, CrawlPage, CrawlReport, CrawlRuleSummary } from "./schema.js";
import { isHtmlType } from "./extract.js";
import { normalizeUrl } from "./url.js";

type Severity = CrawlIssue["severity"];

/** Every crawl rule: severity, a plain title and the fix. Codes are stable. */
export const CRAWL_RULES = {
  "CRAWL-HTTP-4XX": {
    severity: "high",
    title: "Internal URL returns 4xx",
    fix: "Fix or remove the links, or redirect the URL to its replacement.",
  },
  "CRAWL-HTTP-5XX": {
    severity: "high",
    title: "Internal URL returns 5xx",
    fix: "Fix the server error; crawlers drop pages that keep failing.",
  },
  "CRAWL-FETCH-ERROR": {
    severity: "medium",
    title: "URL could not be fetched",
    fix: "Check timeouts, TLS and firewall rules for crawlers.",
  },
  "CRAWL-REDIRECTED-LINK": {
    severity: "low",
    title: "Internal links point to a redirect",
    fix: "Link straight to the final URL.",
  },
  "CRAWL-NOINDEX-IN-SITEMAP": {
    severity: "high",
    title: "Sitemap lists a noindex page",
    fix: "Remove it from the sitemap or drop the noindex.",
  },
  "CRAWL-SITEMAP-NOT-OK": {
    severity: "medium",
    title: "Sitemap URL is not a 200 page",
    fix: "List only final, 200, indexable URLs in the sitemap.",
  },
  "CRAWL-NOINDEX": { severity: "low", title: "Page is noindex", fix: "Confirm it should stay out of search." },
  "CRAWL-CANONICAL-ELSEWHERE": {
    severity: "low",
    title: "Canonical points to another URL",
    fix: "Confirm the canonical target is intended; link to the canonical.",
  },
  "CRAWL-TITLE-MISSING": { severity: "high", title: "Missing <title>", fix: "Add a unique, descriptive title." },
  "CRAWL-TITLE-DUPLICATE": {
    severity: "medium",
    title: "Same title on several pages",
    fix: "Give each page a unique title.",
  },
  "CRAWL-TITLE-LONG": {
    severity: "low",
    title: "Title longer than 65 characters",
    fix: "Shorten it so it is not cut off in results.",
  },
  "CRAWL-META-DESCRIPTION-MISSING": {
    severity: "low",
    title: "Missing meta description",
    fix: "Add a 120-160 character summary.",
  },
  "CRAWL-META-DESCRIPTION-DUPLICATE": {
    severity: "low",
    title: "Same meta description on several pages",
    fix: "Write a unique description per page.",
  },
  "CRAWL-H1-MISSING": { severity: "medium", title: "No H1", fix: "Add one H1 that states the page topic." },
  "CRAWL-H1-MULTIPLE": { severity: "low", title: "More than one H1", fix: "Keep one H1; demote the rest to H2." },
  "CRAWL-THIN-CONTENT": {
    severity: "medium",
    title: "Fewer than 200 words in the raw HTML",
    fix: "Add substance, or render the copy server side.",
  },
  "CRAWL-DUPLICATE-CONTENT": {
    severity: "medium",
    title: "Identical body text on several URLs",
    fix: "Consolidate, or canonicalise to one URL.",
  },
  "CRAWL-DEEP-PAGE": {
    severity: "low",
    title: "More than 3 clicks from the home page",
    fix: "Link it from a hub or the navigation.",
  },
  "CRAWL-ORPHAN": {
    severity: "medium",
    title: "No internal links point to this page",
    fix: "Link it from related pages or a hub.",
  },
  "CRAWL-NOT-IN-SITEMAP": {
    severity: "low",
    title: "Indexable page missing from the sitemap",
    fix: "Add it to the sitemap.",
  },
  "CRAWL-BLOCKED-LINKED": {
    severity: "low",
    title: "Linked URL is blocked by robots.txt",
    fix: "Unblock it, or stop linking to it.",
  },
  "CRAWL-LANG-MISSING": {
    severity: "low",
    title: "<html> has no lang attribute",
    fix: 'Add lang, e.g. <html lang="en">.',
  },
} as const satisfies Record<string, { severity: Severity; title: string; fix: string }>;

export type CrawlRule = keyof typeof CRAWL_RULES;

const SEV_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const THIN_WORDS = 200;
const DEEP = 3;

export const isOkHtml = (p: CrawlPage): boolean => p.status >= 200 && p.status < 300 && isHtmlType(p.contentType);
const noindex = (p: CrawlPage): boolean => /\bnoindex\b/i.test(p.metaRobots);
const selfUrl = (p: CrawlPage): string => normalizeUrl(p.finalUrl) ?? p.url;

/** 200 HTML, not redirected, not noindex, canonical absent or pointing to itself. */
export function isIndexable(p: CrawlPage): boolean {
  return isOkHtml(p) && selfUrl(p) === p.url && !noindex(p) && (!p.canonical || p.canonical === p.url);
}

export interface Graph {
  inlinks: Map<string, number>;
  linkSources: Map<string, string[]>;
  clickDepth: Map<string, number>;
  pagerank: Map<string, number>;
}

/** Resolve a link target to the crawled page it lands on (following one redirect hop). */
function resolver(pages: CrawlPage[]): (url: string) => CrawlPage | undefined {
  const byUrl = new Map<string, CrawlPage>();
  for (const p of pages) byUrl.set(p.url, p);
  for (const p of pages) {
    const f = normalizeUrl(p.finalUrl);
    if (f && !byUrl.has(f)) byUrl.set(f, p);
  }
  return (u) => byUrl.get(u);
}

export function buildGraph(pages: CrawlPage[], startUrl: string): Graph {
  const resolve = resolver(pages);
  const inlinks = new Map<string, number>();
  const linkSources = new Map<string, string[]>();
  for (const p of pages) {
    const targets = new Set(p.internalLinks.map((l) => resolve(l)?.url ?? l));
    targets.delete(p.url);
    for (const t of targets) {
      inlinks.set(t, (inlinks.get(t) ?? 0) + 1);
      const src = linkSources.get(t) ?? [];
      if (src.length < 5) src.push(p.url);
      linkSources.set(t, src);
    }
  }
  const clickDepth = new Map<string, number>();
  const start = resolve(startUrl);
  if (start) {
    clickDepth.set(start.url, 0);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i] as CrawlPage;
      const d = clickDepth.get(cur.url) as number;
      for (const l of cur.internalLinks) {
        const t = resolve(l);
        if (t && !clickDepth.has(t.url)) {
          clickDepth.set(t.url, d + 1);
          queue.push(t);
        }
      }
    }
  }
  return { inlinks, linkSources, clickDepth, pagerank: pageRank(pages, resolve) };
}

/** Internal PageRank over 200 HTML pages, 30 iterations, damping 0.85; scores sum to 1. */
export function pageRank(pages: CrawlPage[], resolve: (u: string) => CrawlPage | undefined): Map<string, number> {
  const nodes = pages.filter(isOkHtml);
  const n = nodes.length;
  const rank = new Map<string, number>();
  if (!n) return rank;
  const idx = new Map(nodes.map((p, i) => [p.url, i]));
  const out = nodes.map((p) => [
    ...new Set(p.internalLinks.map((l) => idx.get(resolve(l)?.url ?? "")).filter((i): i is number => i !== undefined)),
  ]);
  let r: number[] = Array.from({ length: n }, () => 1 / n);
  for (let it = 0; it < 30; it++) {
    const next: number[] = Array.from({ length: n }, () => 0.15 / n);
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      const targets = out[i] as number[];
      const ri = r[i] as number;
      if (!targets.length) dangling += ri;
      else for (const t of targets) next[t] = (next[t] as number) + (0.85 * ri) / targets.length;
    }
    for (let i = 0; i < n; i++) next[i] = (next[i] as number) + (0.85 * dangling) / n;
    r = next;
  }
  nodes.forEach((p, i) => rank.set(p.url, r[i] as number));
  return rank;
}

export interface AnalyzeInput {
  pages: CrawlPage[];
  startUrl: string;
  sitemapUrls: string[];
  blocked: string[];
}

export interface Analysis {
  graph: CrawlReport["graph"];
  issues: CrawlIssue[];
  summary: CrawlRuleSummary[];
  indexable: number;
}

function top<T>(m: Map<string, T>, n: number, cmp: (a: T, b: T) => number): Array<[string, T]> {
  return [...m.entries()].toSorted((a, b) => cmp(a[1], b[1]) || a[0].localeCompare(b[0])).slice(0, n);
}

export function analyzeCrawl(input: AnalyzeInput): Analysis {
  const { pages, startUrl } = input;
  const g = buildGraph(pages, startUrl);
  const sitemap = new Set(input.sitemapUrls);
  const issues: CrawlIssue[] = [];
  const add = (rule: CrawlRule, url: string, detail: string, urls: string[] = [url], subject = url): void => {
    issues.push({ id: issueId(rule, subject), rule, severity: CRAWL_RULES[rule].severity, url, detail, urls });
  };
  const fromWhere = (u: string): string => {
    const src = g.linkSources.get(u) ?? [];
    return src.length ? `; linked from ${src.slice(0, 3).join(", ")}` : "";
  };

  for (const p of pages) {
    const inl = g.inlinks.get(p.url) ?? 0;
    if (p.status >= 400 && p.status < 500) add("CRAWL-HTTP-4XX", p.url, `HTTP ${p.status}${fromWhere(p.url)}`);
    else if (p.status >= 500) add("CRAWL-HTTP-5XX", p.url, `HTTP ${p.status}${fromWhere(p.url)}`);
    else if (p.status === 0) add("CRAWL-FETCH-ERROR", p.url, p.error || "fetch failed");
    const final = selfUrl(p);
    if (final !== p.url && inl > 0)
      add("CRAWL-REDIRECTED-LINK", p.url, `redirects to ${final}; ${inl} internal link(s)`);
    if (sitemap.has(p.url) && (!isOkHtml(p) || final !== p.url))
      add("CRAWL-SITEMAP-NOT-OK", p.url, final !== p.url ? `redirects to ${final}` : `HTTP ${p.status}`);
    if (!isOkHtml(p) || final !== p.url) continue;
    if (noindex(p)) {
      if (sitemap.has(p.url)) add("CRAWL-NOINDEX-IN-SITEMAP", p.url, `meta robots "${p.metaRobots}"`);
      else add("CRAWL-NOINDEX", p.url, `meta robots "${p.metaRobots}"`);
      continue;
    }
    if (p.canonical && p.canonical !== p.url) add("CRAWL-CANONICAL-ELSEWHERE", p.url, `canonical ${p.canonical}`);
    if (!isIndexable(p)) continue;
    if (!p.title) add("CRAWL-TITLE-MISSING", p.url, "no <title>");
    else if (p.title.length > 65) add("CRAWL-TITLE-LONG", p.url, `${p.title.length} characters`);
    if (!p.metaDescription) add("CRAWL-META-DESCRIPTION-MISSING", p.url, "no meta description");
    if (!p.h1.length) add("CRAWL-H1-MISSING", p.url, "no <h1>");
    else if (p.h1.length > 1) add("CRAWL-H1-MULTIPLE", p.url, `${p.h1.length} H1s`);
    if (p.wordCount < THIN_WORDS) add("CRAWL-THIN-CONTENT", p.url, `${p.wordCount} words`);
    if (!p.lang) add("CRAWL-LANG-MISSING", p.url, "no lang attribute");
    const depth = g.clickDepth.get(p.url);
    if (depth !== undefined && depth > DEEP) add("CRAWL-DEEP-PAGE", p.url, `${depth} clicks from the home page`);
    if (p.url !== startUrl && inl === 0)
      add("CRAWL-ORPHAN", p.url, `found via ${p.source}; no crawled page links here`);
    if (sitemap.size && !sitemap.has(p.url)) add("CRAWL-NOT-IN-SITEMAP", p.url, "indexable, not in sitemap");
  }

  const groups = (key: (p: CrawlPage) => string): Map<string, CrawlPage[]> => {
    const m = new Map<string, CrawlPage[]>();
    for (const p of pages.filter(isIndexable)) {
      const k = key(p);
      if (!k) continue;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  };
  const dupes = (rule: CrawlRule, key: (p: CrawlPage) => string, label: (k: string) => string): void => {
    for (const [k, list] of groups(key))
      if (list.length > 1) {
        const urls = list.map((p) => p.url).toSorted();
        add(rule, urls[0] as string, `${label(k)} on ${urls.length} pages`, urls, k);
      }
  };
  dupes(
    "CRAWL-TITLE-DUPLICATE",
    (p) => p.title.trim().toLowerCase(),
    (k) => `title "${k.slice(0, 80)}"`,
  );
  dupes(
    "CRAWL-META-DESCRIPTION-DUPLICATE",
    (p) => p.metaDescription.trim().toLowerCase(),
    () => "same description",
  );
  dupes(
    "CRAWL-DUPLICATE-CONTENT",
    (p) => p.contentHash,
    () => "identical body text",
  );

  for (const u of new Set(input.blocked))
    if ((g.inlinks.get(u) ?? 0) > 0) add("CRAWL-BLOCKED-LINKED", u, `disallowed for seo-rea${fromWhere(u)}`);

  const counts = new Map<CrawlRule, number>();
  for (const i of issues) counts.set(i.rule as CrawlRule, (counts.get(i.rule as CrawlRule) ?? 0) + 1);
  const summary: CrawlRuleSummary[] = [...counts.entries()]
    .map(([rule, count]) => ({ rule, count, ...CRAWL_RULES[rule] }))
    .toSorted((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.count - a.count);

  const hist = new Map<number, number>();
  for (const d of g.clickDepth.values()) hist.set(d, (hist.get(d) ?? 0) + 1);

  return {
    graph: {
      inlinks: top(g.inlinks, 20, (a, b) => b - a).map(([url, count]) => ({ url, count })),
      pagerank: top(g.pagerank, 20, (a, b) => b - a).map(([url, score]) => ({
        url,
        score: Math.round(score * 1e5) / 1e5,
      })),
      depthHistogram: [...hist.entries()].toSorted((a, b) => a[0] - b[0]).map(([depth, n]) => ({ depth, pages: n })),
    },
    issues: issues.toSorted((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.id.localeCompare(b.id)),
    summary,
    indexable: pages.filter(isIndexable).length,
  };
}
