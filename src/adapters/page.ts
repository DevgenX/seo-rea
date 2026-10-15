// On-page parse with cheerio: title, meta, headings, words, links, schema.

import * as cheerio from "cheerio";
import type { AdapterContext, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";
import { isHtml } from "../core/http.js";
import { sameSite } from "../core/util.js";
import { extractSchema, type SchemaReport } from "./schema.js";

export interface Link {
  href: string;
  anchor: string;
  rel: string;
}

export interface ParsedPage {
  url: string;
  title: string;
  metaDescription: string;
  metaRobots: string;
  ogTitle: string;
  canonical: string;
  hreflang: string[];
  lang: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  wordCount: number;
  schemaTypes: string[];
  schema: SchemaReport;
  internalLinks: Link[];
  externalLinks: Link[];
  text: string;
}

export function countWords(text: string): number {
  const m = String(text ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

function absolute(href: string, base: string): URL | null {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

/** Parse on-page SEO facts from raw HTML fetched at `url`. */
export function parsePage(html: string, url: string): ParsedPage {
  const schema = extractSchema(html);
  const $ = cheerio.load(html);
  const meta = (attr: string, val: string): string => $(`meta[${attr}="${val}" i]`).first().attr("content") ?? "";
  const canonicalRaw = $('link[rel~="canonical" i]').first().attr("href") ?? "";
  const hreflang = $('link[rel="alternate" i][hreflang]')
    .map((_, el) => $(el).attr("hreflang") ?? "")
    .get()
    .filter(Boolean);
  const title = squash($("title").first().text());
  const lang = $("html").attr("lang") ?? "";

  $("script, style, noscript, svg, template, iframe").remove();
  const headings = { h1: [] as string[], h2: [] as string[], h3: [] as string[] };
  for (const level of ["h1", "h2", "h3"] as const) {
    headings[level] = $(level)
      .map((_, el) => squash($(el).text()))
      .get()
      .filter(Boolean);
  }

  const internalLinks: Link[] = [];
  const externalLinks: Link[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/^(javascript:|mailto:|tel:|#)/i.test(href)) return;
    const abs = absolute(href, url);
    if (!abs) return;
    const a = $(el);
    const link: Link = {
      href: abs.toString(),
      anchor: squash(a.text()) || a.attr("aria-label") || a.attr("title") || "",
      rel: a.attr("rel") ?? "",
    };
    (sameSite(link.href, url) ? internalLinks : externalLinks).push(link);
  });

  // Block elements get a separator so words do not run together.
  $("p, div, li, h1, h2, h3, h4, h5, h6, td, th, br, section, article").after(" ");
  const text = squash($("body").text() || $.root().text());
  const canonical = canonicalRaw ? (absolute(canonicalRaw, url)?.toString() ?? canonicalRaw) : "";

  return {
    url,
    title,
    metaDescription: meta("name", "description"),
    metaRobots: meta("name", "robots"),
    ogTitle: meta("property", "og:title"),
    canonical,
    hreflang,
    lang,
    headings,
    wordCount: countWords(text),
    schemaTypes: schema.types,
    schema,
    internalLinks,
    externalLinks,
    text,
  };
}

export interface PageSummary extends Omit<ParsedPage, "text" | "internalLinks" | "externalLinks"> {
  internalLinkCount: number;
  externalLinkCount: number;
  topAnchors: Array<{ anchor: string; count: number }>;
}

/** Page summary kept in run.json (drops full text and raw link lists). */
export function summarizePage(page: ParsedPage): PageSummary {
  const anchors = new Map<string, number>();
  for (const l of page.internalLinks) {
    const a = l.anchor.slice(0, 80);
    if (a) anchors.set(a, (anchors.get(a) ?? 0) + 1);
  }
  const { text: _text, internalLinks, externalLinks, ...rest } = page;
  return {
    ...rest,
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    topAnchors: [...anchors.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([anchor, count]) => ({ anchor, count })),
  };
}

export interface PageFetchOutput {
  page: ParsedPage | null;
  html: string;
  status: number;
  error: string;
  fetchedAt: string;
  fromCache: boolean;
  finalUrl: string;
}

/** Fetch one URL (no JavaScript) and parse it. */
export const pageAdapter: SourceAdapter<string, PageFetchOutput> = {
  id: "page-fetch",
  label: "Page fetch + on-page parse (cheerio)",
  category: "page",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run(url: string, ctx: AdapterContext): Promise<PageFetchOutput> {
    const r = await ctx.fetch(url, { source: "page", ttlMs: TTL.page });
    const base = {
      html: r.body,
      status: r.status,
      fetchedAt: r.fetchedAt,
      fromCache: r.fromCache,
      finalUrl: r.finalUrl || url,
    };
    if (!isHtml(r)) {
      const error = r.error || `HTTP ${r.status} ${r.contentType}`.trim();
      return { ...base, page: null, error };
    }
    return { ...base, page: parsePage(r.body, r.finalUrl || url), error: "" };
  },
};
