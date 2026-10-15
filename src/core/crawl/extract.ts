// Turn one fetch result into a compact CrawlPage record.

import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { parsePage } from "../../adapters/page.js";
import type { FetchResult } from "../types.js";
import { domainOf } from "../util.js";
import type { CrawlPage } from "./schema.js";
import { normalizeUrl } from "./url.js";

/** Framework / platform fingerprints found in raw HTML. Order is report order. */
const TECH_MARKERS: Array<[string, RegExp]> = [
  ["Next.js", /__NEXT_DATA__|\/_next\/static\//],
  ["Nuxt", /__NUXT__|\/_nuxt\//],
  ["Gatsby", /___gatsby|\/page-data\//],
  ["Astro", /astro-island|\/_astro\//],
  ["SvelteKit", /__sveltekit|\/_app\/immutable\//],
  ["Remix", /__remixContext/],
  ["React", /data-reactroot|react-dom/],
  ["Vue", /data-v-[a-f0-9]{6,}|vue(?:\.min)?\.js/],
  ["Angular", /ng-version=/],
  ["WordPress", /wp-content\/|wp-includes\//],
  ["Shopify", /cdn\.shopify\.com|Shopify\.theme/],
  ["Webflow", /webflow\.(?:js|com)|data-wf-page/],
  ["Framer", /framerusercontent\.com|data-framer-/],
  ["Wix", /static\.wixstatic\.com|wix-code/],
  ["Squarespace", /squarespace(?:-cdn)?\.com/],
  ["Ghost", /ghost-(?:portal|sdk)|content="Ghost/],
  ["HubSpot", /js\.hs-scripts\.com|hs-sites\.com/],
  ["Intercom", /widget\.intercom\.io/],
  ["Google Tag Manager", /googletagmanager\.com\/gtm\.js/],
  ["Google Analytics", /googletagmanager\.com\/gtag\/js|google-analytics\.com/],
  ["Cloudflare", /cdn-cgi\//],
  ["Vercel", /\/_vercel\//],
];

export function detectTech(html: string): string[] {
  const found: string[] = [];
  const gen = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  if (gen) found.push(`generator: ${gen.trim().slice(0, 60)}`);
  for (const [name, re] of TECH_MARKERS) if (re.test(html)) found.push(name);
  return found;
}

const isoDate = (v: string | undefined): string => {
  if (!v) return "";
  const t = Date.parse(v);
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
};

/** article:published_time / modified_time, falling back to JSON-LD datePublished / dateModified. */
export function extractDates(html: string): { published: string; modified: string } {
  const $ = cheerio.load(html);
  const meta = (p: string): string | undefined => $(`meta[property="${p}" i]`).first().attr("content");
  const ld = (key: string): string | undefined => new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(html)?.[1];
  return {
    published: isoDate(meta("article:published_time") ?? ld("datePublished")),
    modified: isoDate(meta("article:modified_time") ?? ld("dateModified")),
  };
}

const blank = (r: FetchResult, depth: number, source: CrawlPage["source"], url: string): CrawlPage => ({
  url,
  finalUrl: r.finalUrl || url,
  status: r.status,
  depth,
  source,
  contentType: r.contentType,
  ...(r.error ? { error: r.error } : {}),
  title: "",
  metaDescription: "",
  metaRobots: "",
  canonical: "",
  h1: [],
  h2Count: 0,
  wordCount: 0,
  lang: "",
  hreflang: [],
  schemaTypes: [],
  internalLinks: [],
  externalLinkCount: 0,
  externalDomains: [],
  published: "",
  modified: "",
  tech: [],
  contentHash: "",
  fetchedAt: r.fetchedAt,
});

export const isHtmlType = (contentType: string): boolean => !contentType || /html/i.test(contentType);

/** Build the page record. Non-HTML or failed responses keep status and error only. */
export function toCrawlPage(r: FetchResult, url: string, depth: number, source: CrawlPage["source"]): CrawlPage {
  const base = blank(r, depth, source, url);
  if (!r.ok || !isHtmlType(r.contentType) || !r.body) return base;
  const page = parsePage(r.body, r.finalUrl || url);
  const internal = new Set<string>();
  for (const l of page.internalLinks) {
    if (/\bnofollow\b/i.test(l.rel)) continue;
    const n = normalizeUrl(l.href);
    if (n) internal.add(n);
  }
  const extDomains = new Set(page.externalLinks.map((l) => domainOf(l.href)).filter(Boolean));
  const norm = page.text.toLowerCase().replace(/\s+/g, " ").trim();
  return {
    ...base,
    title: page.title,
    metaDescription: page.metaDescription,
    metaRobots: page.metaRobots,
    canonical: page.canonical ? (normalizeUrl(page.canonical) ?? page.canonical) : "",
    h1: page.headings.h1.slice(0, 5),
    h2Count: page.headings.h2.length,
    wordCount: page.wordCount,
    lang: page.lang,
    hreflang: page.hreflang,
    schemaTypes: page.schemaTypes,
    internalLinks: [...internal],
    externalLinkCount: page.externalLinks.length,
    externalDomains: [...extDomains].slice(0, 50),
    ...extractDates(r.body),
    tech: detectTech(r.body),
    contentHash: norm ? createHash("sha1").update(norm).digest("hex") : "",
  };
}
