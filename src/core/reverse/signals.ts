// Page-level signals for reverse engineering: templates, terms,
// programmatic patterns, cadence. Pure helpers used by infer.ts.

import type { CrawlPage } from "../crawl/schema.js";
import type { ReverseReport, Template } from "./schema.js";

const STOP = new Set(
  "a an and are as at be best by can com do for from get has how i in is it its me my new no not of on or our out the this to top up us vs was we what when where which who why will with you your app apps page home blog official site guide does undefined null untitled 2024 2025 2026 2027".split(
    " ",
  ),
);

export const pathOf = (u: string): string => {
  try {
    return new URL(u).pathname;
  } catch {
    return "/";
  }
};
export const segs = (u: string): string[] => pathOf(u).split("/").filter(Boolean);
export const round = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;
export const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function tokens(s: string, brand: Set<string>): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9%'-]*/g) ?? []).filter(
    (t) => t.length > 1 && !STOP.has(t) && !brand.has(t) && !/^\d+$/.test(t),
  );
}

/** Classify a page into a template by URL, title and schema. */
export function templateOf(p: CrawlPage, startUrl: string): Template {
  const path = pathOf(p.url).toLowerCase();
  const text = `${path} ${p.title.toLowerCase()}`;
  const types = new Set(p.schemaTypes);
  if (p.url === startUrl || path === "/") return "home";
  if (/\/(privacy|terms|legal|cookies?|disclaimer|imprint|accessibility)\b/.test(path)) return "legal";
  if (/\/(help|support|docs?|faq|kb|knowledge)\b/.test(path)) return "help";
  if (/\bvs\b|versus|compare|comparison|alternative|\bbest\b|\btop \d+/.test(text)) return "comparison";
  if (/calculator|\/tools?\b|checker|generator|estimator/.test(text)) return "tool";
  if (/\/(topic|topics|category|categories|tag|tags)\b/.test(path)) return "category";
  if (
    /^\/(offers?|deals?|coupons?|cards?|products?|stores?|merchants?|locations?|brands?|companies|integrations?|templates?)\/[^/]+/.test(
      path,
    )
  )
    return "entity";
  if (
    ["Article", "BlogPosting", "NewsArticle", "TechArticle"].some((t) => types.has(t)) ||
    /\/(blog|news|articles?|guides?|learn|posts?|insights|resources)\b/.test(path)
  )
    return "article";
  if (
    ["SoftwareApplication", "MobileApplication", "WebApplication", "Product"].some((t) => types.has(t)) ||
    /\/(pricing|features?|product|download|app)\b/.test(path)
  )
    return "product";
  return "other";
}

export const QUESTION = /^(how|what|why|when|where|which|who|can|does|do|is|are|should)\b|\?\s*$/i;

export function topBy<T>(m: Map<string, T[]>, n: number): Array<[string, T[]]> {
  return [...m.entries()].toSorted((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, n);
}

export function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

function termCounts(pages: CrawlPage[], brand: Set<string>): Map<string, { pages: Set<string>; titles: number }> {
  const m = new Map<string, { pages: Set<string>; titles: number }>();
  for (const p of pages) {
    const seen = new Set<string>();
    const titleToks = tokens(p.title, brand);
    const all = [
      titleToks,
      tokens(p.h1.join(" "), brand),
      segs(p.url).flatMap((s) => tokens(s.replace(/-/g, " "), brand)),
    ];
    for (const toks of all) {
      for (let i = 0; i < toks.length; i++) {
        seen.add(toks[i] as string);
        if (i + 1 < toks.length) seen.add(`${toks[i]} ${toks[i + 1]}`);
      }
    }
    const inTitle = new Set<string>();
    for (let i = 0; i < titleToks.length; i++) {
      inTitle.add(titleToks[i] as string);
      if (i + 1 < titleToks.length) inTitle.add(`${titleToks[i]} ${titleToks[i + 1]}`);
    }
    for (const t of seen) {
      const e = m.get(t) ?? { pages: new Set<string>(), titles: 0 };
      e.pages.add(p.url);
      if (inTitle.has(t)) e.titles++;
      m.set(t, e);
    }
  }
  return m;
}

/** Head terms: bigrams first, then unigrams not already covered; document frequency >= 2. */
export function headTerms(pages: CrawlPage[], brand: Set<string>, n = 15): ReverseReport["keywords"] {
  const m = termCounts(pages, brand);
  const ranked = [...m.entries()]
    .filter(([, v]) => v.pages.size >= 2)
    .map(([term, v]) => ({
      term,
      pages: v.pages.size,
      inTitles: v.titles,
      examples: [...v.pages].slice(0, 3),
      score: v.pages.size * (term.includes(" ") ? 1.6 : 1) + v.titles,
    }))
    .toSorted((a, b) => b.score - a.score || a.term.localeCompare(b.term));
  const out: ReverseReport["keywords"] = [];
  for (const r of ranked) {
    if (out.length >= n) break;
    if (!r.term.includes(" ") && out.some((o) => o.term.split(" ").includes(r.term))) continue;
    if (r.term.includes(" ")) {
      const parts = r.term.split(" ");
      for (let i = out.length - 1; i >= 0; i--) if (parts.includes(out[i]?.term ?? "")) out.splice(i, 1);
    }
    out.push({ term: r.term, pages: r.pages, inTitles: r.inTitles, examples: r.examples });
  }
  return out;
}

/** Drop a trailing " | Brand" / " - Brand" segment. */
export const stripSiteName = (t: string): string => t.replace(/\s+[|\u2013\u2014-]\s+[^|\u2013\u2014]+$/u, "").trim();

/** Title skeleton: the 2 words shared at the start or end of most titles in a group (site name removed). */
function titlePattern(titles: string[]): string | null {
  const words = titles.map((t) => stripSiteName(t).toLowerCase().split(/\s+/).filter(Boolean));
  for (const end of [true, false]) {
    const key = (w: string[]): string => (end ? w.slice(-2) : w.slice(0, 2)).join(" ");
    const g = groupBy(
      words.filter((w) => w.length >= 3),
      key,
    );
    const best = topBy(g, 1)[0];
    const considered = words.filter((w) => w.length >= 3).length;
    if (best && best[1].length >= Math.max(5, considered * 0.5)) return end ? `... ${best[0]}` : `${best[0]} ...`;
  }
  return null;
}

export function detectProgrammatic(pages: CrawlPage[]): ReverseReport["programmatic"] {
  const byPrefix = groupBy(
    pages.filter((p) => segs(p.url).length >= 2),
    (p) => `/${segs(p.url).slice(0, -1).join("/")}/*`,
  );
  const out: ReverseReport["programmatic"] = [];
  for (const [pattern, list] of topBy(byPrefix, 20)) {
    if (list.length < 10) continue;
    const tp = titlePattern(list.map((p) => p.title));
    const sameH2 = groupBy(list, (p) => String(p.h2Count));
    const uniformLayout = (topBy(sameH2, 1)[0]?.[1].length ?? 0) >= list.length * 0.6;
    if (tp || uniformLayout)
      out.push({
        pattern,
        pages: list.length,
        titlePattern: tp ?? "(varied titles, uniform layout)",
        examples: list.slice(0, 3).map((p) => p.url),
      });
  }
  return out;
}

export function cadence(pages: CrawlPage[], now: Date): ReverseReport["cadence"] {
  const dates = pages
    .map((p) => p.published)
    .filter(Boolean)
    .map((d) => Date.parse(d))
    .filter((t) => Number.isFinite(t))
    .toSorted((a, b) => a - b);
  const day = 86_400_000;
  const within = (ts: number[], days: number): number =>
    ts.filter((t) => now.getTime() - t <= days * day && t <= now.getTime()).length;
  const months = groupBy(dates, (t) => new Date(t).toISOString().slice(0, 7));
  const gaps = dates
    .slice(1)
    .map((t, i) => (t - (dates[i] as number)) / day)
    .toSorted((a, b) => a - b);
  const modified = pages.map((p) => Date.parse(p.modified)).filter((t) => Number.isFinite(t));
  return {
    datedPages: dates.length,
    first: dates.length ? new Date(dates[0] as number).toISOString() : "",
    last: dates.length ? new Date(dates.at(-1) as number).toISOString() : "",
    last90Days: within(dates, 90),
    last365Days: within(dates, 365),
    perMonth: [...months.entries()]
      .toSorted((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, l]) => ({ month, pages: l.length })),
    medianGapDays: gaps.length ? round(gaps[Math.floor(gaps.length / 2)] as number, 1) : null,
    updatedLast90Days: within(modified, 90),
  };
}
