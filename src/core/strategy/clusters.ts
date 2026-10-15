// Site and cluster map: group URLs by path, name each group from slug and
// title n-grams, classify page templates and detect programmatic SEO. Pure.

import { median } from "../util.js";
import { ngrams } from "../../adapters/keywords.js";
import { WEAK } from "./terms.js";
import type { CrawledPage } from "./types.js";

export const TEMPLATE_TYPES = [
  "blog",
  "guide",
  "tool",
  "product",
  "category",
  "comparison",
  "review",
  "programmatic",
  "page",
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export interface Programmatic {
  pattern: string;
  /** Share of cluster URLs that fit the pattern, 0-1. */
  share: number;
  basis: "slug-affix" | "numeric-id" | "heading-template";
  /** Mean pairwise H2 overlap among fetched pages (0-1), null if under 3 fetched. */
  headingSimilarity: number | null;
}

export interface Cluster {
  key: string;
  name: string;
  terms: string[];
  urlCount: number;
  exampleUrls: string[];
  template: TemplateType;
  baseTemplate: TemplateType;
  fetchedPages: number;
  medianWords: number | null;
  /** Mean internal links per fetched page in the cluster. */
  linkDensity: number | null;
  /** Links from all fetched pages that point into the cluster. */
  inlinks: number;
  hubs: Array<{ url: string; linksIntoCluster: number }>;
  programmatic: Programmatic | null;
}

const CONTAINER = /^(blog|blogs|article|articles|learn|guides?|resources?|posts?|news|p|c|t|hub|topics?|content)$/;
const LOCALE = /^[a-z]{2}(-[a-z]{2})?$/;

function segments(url: string): string[] {
  try {
    return new URL(url).pathname
      .split("/")
      .map((s) => safeDecode(s).toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/**
 * Cluster key: first path segment, or two when the first is a container
 * (/blog/x) or locale (/ca/x). URLs on a subdomain of `root` keep their host
 * (//help.example.com/articles).
 */
export function clusterKey(url: string, root = ""): string {
  const host = hostOf(url);
  const prefix = root && host && host !== root ? `//${host}` : "";
  const s = segments(url);
  if (!s.length) return prefix || "/";
  const first = s[0] as string;
  if (s.length >= 3 && (CONTAINER.test(first) || LOCALE.test(first))) return `${prefix}/${first}/${s[1]}`;
  return `${prefix}/${first}`;
}

/** Host plus path without a trailing slash: the identity used to match URLs and links. */
export const locOf = (u: string): string => {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, "").toLowerCase()}${x.pathname.replace(/\/$/, "")}`;
  } catch {
    return u;
  }
};

const slugOf = (url: string): string => segments(url).at(-1) ?? "";
const slugWords = (url: string): string =>
  segments(url)
    .join(" ")
    .replace(/\.(html?|php|aspx?)$/, "")
    .replace(/[-_]+/g, " ");

/** Template for one URL from its path, title, schema and form inputs. */
export function classifyTemplate(
  url: string,
  title = "",
  schemaTypes: string[] = [],
  formInputs = 0,
  isClusterRoot = false,
): TemplateType {
  const path = segments(url).join("/");
  if (/^https?:\/\/(help|support|docs|kb)\./.test(url) || /^(help|support|docs|kb)(\/|$)/.test(path))
    return path ? "guide" : "category";
  if (!path) return "page";
  if (/(^|[/-])(disclosures?|licen[cs]es?|privacy|legal|terms-of-use|terms-of-service)([/-]|$)/.test(path))
    return "page";
  const hay = `${path.replace(/[-_/]+/g, " ")} ${title.toLowerCase()}`;
  const has = (re: RegExp): boolean => re.test(hay);
  const schema = (re: RegExp): boolean => schemaTypes.some((t) => re.test(t));
  if (has(/\b(vs|versus|compare|comparison|alternatives?)\b/) || /^best\b|\bbest .{3,40} (for|of|in) /.test(hay))
    return "comparison";
  if (has(/\breviews?\b/) || schema(/^Review$/)) return "review";
  if (has(/\b(calculators?|tools?|checker|estimator|simulator|generator|finder|quiz|tracker)\b/) || formInputs >= 3)
    return "tool";
  if (has(/\b(how to|what is|guides?|learn|explained|tips|faq|basics)\b/) || schema(/^(HowTo|FAQPage)$/))
    return "guide";
  if (/(^|\/)(blog|news|articles?|posts?|stories)(\/|$)/.test(path) || schema(/^(BlogPosting|NewsArticle)$/))
    return "blog";
  if (/(^|\/)(apps?|pricing|features|products?|download|pro|premium|extension|plans?)(\/|$)/.test(path))
    return "product";
  if (schema(/^(SoftwareApplication|MobileApplication|WebApplication|Product)$/)) return "product";
  if (isClusterRoot || /(^|\/)(category|categories|topics?|tags?|hubs?)(\/|$)/.test(path) || schema(/Collection/))
    return "category";
  if (schema(/Article$/)) return "blog";
  return "page";
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Mean pairwise overlap of H2 sets (digits normalised); null under 3 pages. */
export function headingSimilarity(pages: Array<{ h2: string[] }>): number | null {
  const sets = pages
    .map((p) => new Set(p.h2.map((h) => h.toLowerCase().replace(/\d+/g, "#").trim()).filter(Boolean)))
    .filter((s) => s.size >= 2)
    .slice(0, 12);
  if (sets.length < 3) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < sets.length; i++)
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i] as Set<string>, sets[j] as Set<string>);
      n++;
    }
  return Math.round((sum / n) * 100) / 100;
}

const AFFIX_STOP = new Set(["the", "a", "an", "and", "of", "to", "for", "in", "on", "is", "how", "what", "with"]);

/** Most common slug prefix or suffix (1-2 tokens) and the share of slugs that carry it. */
export function slugAffix(slugs: string[]): { pattern: string; share: number } | null {
  const counts = new Map<string, number>();
  for (const s of slugs) {
    // Digits vary per page (ids, amounts), so they are a placeholder, not a fixed part.
    const t = s.replace(/\d+/g, "#").split(/[-_]+/).filter(Boolean);
    if (t.length < 2) continue;
    const keys = new Set<string>();
    for (const n of [1, 2]) {
      if (t.length <= n) continue;
      keys.add(`{x}-${t.slice(-n).join("-")}`);
      keys.add(`${t.slice(0, n).join("-")}-{x}`);
    }
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: { pattern: string; share: number } | null = null;
  for (const [pattern, c] of counts) {
    const fixed = pattern.replace("{x}", "").replace(/^-|-$/g, "");
    if (fixed.split("-").every((w) => AFFIX_STOP.has(w) || /^[\d#]+$/.test(w))) continue;
    const share = c / slugs.length;
    // Prefer longer fixed parts when the share is the same.
    if (
      !best ||
      share > best.share + 1e-9 ||
      (Math.abs(share - best.share) < 1e-9 && pattern.length > best.pattern.length)
    )
      best = { pattern, share };
  }
  return best;
}

export const PROGRAMMATIC_MIN_URLS = 15;
/** Fewer URLs are enough when nearly all share one slug pattern (templates linked from a hub, not in sitemaps). */
const STRONG_MIN_URLS = 10;
const STRONG_SHARE = 0.8;
const MIN_SHARE = 0.5;

const depth = (u: string): number => segments(u).length;

/** Programmatic SEO: many URLs built from one template (slug pattern, ids or identical headings). */
export function detectProgrammatic(key: string, urls: string[], fetched: Array<{ h2: string[] }>): Programmatic | null {
  if (urls.length < STRONG_MIN_URLS) return null;
  const keyPath = key.startsWith("//") ? key.replace(/^\/\/[^/]+/, "") || "/" : key;
  const keyDepth = keyPath === "/" ? 0 : keyPath.split("/").filter(Boolean).length;
  const leaves = urls.filter((u) => depth(u) > keyDepth);
  if (leaves.length < STRONG_MIN_URLS) return null;
  const slugs = leaves.map(slugOf);
  const strongOnly = leaves.length < PROGRAMMATIC_MIN_URLS;
  const sim = headingSimilarity(fetched);
  const ids = slugs.filter((s) => /^\d+$|^[a-z0-9]{8,}$/.test(s) && /\d/.test(s)).length / slugs.length;
  const need = strongOnly ? STRONG_SHARE : MIN_SHARE;
  if (ids >= need) return { pattern: `${key}/{id}`, share: round(ids), basis: "numeric-id", headingSimilarity: sim };
  const affix = slugAffix(slugs);
  if (affix && affix.share >= need)
    return {
      pattern: `${key}/${affix.pattern}`,
      share: round(affix.share),
      basis: "slug-affix",
      headingSimilarity: sim,
    };
  if (!strongOnly && sim !== null && sim >= 0.5)
    return { pattern: `${key}/{slug}`, share: 1, basis: "heading-template", headingSimilarity: sim };
  return null;
}

const round = (n: number): number => Math.round(n * 100) / 100;

function themeTerms(urls: string[], titles: string[], exclude: Set<string>): string[] {
  const agg = new Map<string, number>();
  const docs = [...urls.slice(0, 400).map(slugWords), ...titles];
  for (const d of docs)
    for (const [k] of ngrams(d, 2)) {
      const w = k.split(" ");
      if (w.some((x) => exclude.has(x)) || WEAK.has(w[0] as string) || WEAK.has(w.at(-1) as string)) continue;
      agg.set(k, (agg.get(k) ?? 0) + 1);
    }
  return [...agg.entries()]
    .filter(([, c]) => c >= Math.min(2, docs.length))
    .toSorted((a, b) => b[1] * b[0].split(" ").length - a[1] * a[0].split(" ").length || a[0].localeCompare(b[0]))
    .map(([k]) => k)
    .filter((k, i, arr) => !arr.slice(0, i).some((p) => p.includes(k) || k.includes(p)))
    .slice(0, 5);
}

function push(m: Map<string, string[]>, k: string, v: string): void {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
}

const humanize = (key: string): string =>
  key === "/" ? "home" : key.split("/").filter(Boolean).join(" / ").replace(/[-_]+/g, " ");

/**
 * Group URLs into clusters. `urls` is every known URL (sitemaps + nav);
 * `pages` are the fetched ones. Singleton top-level paths merge into "/(top-level)".
 */
export function buildClusters(urls: string[], pages: CrawledPage[], brandTokens: string[] = [], root = ""): Cluster[] {
  const groups = new Map<string, string[]>();
  for (const u of new Set(urls)) push(groups, clusterKey(u, root), u);
  // Merge one-URL top-level groups (privacy, login, about...) into one bucket.
  const merged = new Map<string, string[]>();
  for (const [k, list] of groups) {
    const key = list.length === 1 && /^\/[^/]+$/.test(k) ? "/(top-level)" : k;
    for (const u of list) push(merged, key, u);
  }
  const exclude = new Set(brandTokens);
  const allLinks = pages.flatMap((p) => p.internalLinks.map(locOf));
  const out: Cluster[] = [];
  for (const [key, list] of merged) {
    const paths = new Set(list.map(locOf));
    const inCluster = pages.filter(
      (p) => paths.has(locOf(p.url)) || (key !== "/(top-level)" && clusterKey(p.url, root) === key),
    );
    const votes = new Map<TemplateType, number>();
    for (const u of list.slice(0, 300)) {
      const p = inCluster.find((x) => locOf(x.url) === locOf(u));
      const t = classifyTemplate(
        u,
        p?.title ?? "",
        p?.schemaTypes ?? [],
        p?.signals.formInputs ?? 0,
        clusterKey(u, root) === key && segments(u).length === 1,
      );
      votes.set(t, (votes.get(t) ?? 0) + 1);
    }
    const baseTemplate =
      [...votes.entries()].toSorted(
        (a, b) => b[1] - a[1] || TEMPLATE_TYPES.indexOf(a[0]) - TEMPLATE_TYPES.indexOf(b[0]),
      )[0]?.[0] ?? "page";
    // Help centres share one article template by design; that is not programmatic SEO.
    const support = /^\/\/(help|support|docs|kb)\.|^\/(help|support|docs|kb)(\/|$)/.test(key);
    const programmatic = key === "/(top-level)" || support ? null : detectProgrammatic(key, list, inCluster);
    // Hubs are pages inside the cluster; site-wide menus link everywhere and say nothing about it.
    const hubs = (key === "/(top-level)" ? [] : inCluster)
      .map((p) => ({
        url: p.url,
        linksIntoCluster: new Set(p.internalLinks.map(locOf).filter((l) => paths.has(l))).size,
      }))
      .filter((h) => h.linksIntoCluster >= 5)
      .toSorted((a, b) => b.linksIntoCluster - a.linksIntoCluster)
      .slice(0, 3);
    const words = inCluster.map((p) => p.wordCount);
    out.push({
      key,
      name: humanize(key),
      terms: themeTerms(
        list,
        inCluster.map((p) => p.title),
        exclude,
      ),
      urlCount: list.length,
      exampleUrls: list.slice(0, 3),
      template: programmatic ? "programmatic" : baseTemplate,
      baseTemplate,
      fetchedPages: inCluster.length,
      medianWords: median(words),
      linkDensity: inCluster.length
        ? Math.round(inCluster.reduce((s, p) => s + p.internalLinks.length, 0) / inCluster.length)
        : null,
      inlinks: allLinks.filter((l) => paths.has(l)).length,
      hubs,
      programmatic,
    });
  }
  return out.toSorted((a, b) => b.urlCount - a.urlCount || a.key.localeCompare(b.key));
}

/** Pick up to `max` URLs to map, round-robin across clusters so big clusters do not crowd out small ones. */
export function stratifiedSample(urls: string[], max: number, root = ""): string[] {
  const groups = new Map<string, string[]>();
  for (const u of urls) push(groups, clusterKey(u, root), u);
  const lists = [...groups.values()].toSorted((a, b) => b.length - a.length);
  const out: string[] = [];
  for (let i = 0; out.length < max; i++) {
    let added = false;
    for (const l of lists) {
      const u = l[i];
      if (u !== undefined && out.length < max) {
        out.push(u);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
