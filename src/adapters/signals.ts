// Strategy signals read from raw HTML: navigation, distribution channels,
// freshness dates, answer blocks and entity markup. Pure parsing, no network.

import * as cheerio from "cheerio";
import { domainOf, isDomainOrSub } from "../core/util.js";

export interface DistributionLinks {
  appStore: string[];
  playStore: string[];
  extension: string[];
  social: Array<{ platform: string; url: string }>;
  community: string[];
  newsletter: boolean;
  affiliateDisclosure: boolean;
  podcast: boolean;
}

export interface PageSignals {
  url: string;
  htmlBytes: number;
  navLinks: Array<{ href: string; anchor: string }>;
  distribution: DistributionLinks;
  published: string;
  modified: string;
  /** Question headings (ending in "?") plus <details> blocks. */
  questionBlocks: number;
  /** Words in the first paragraph after the H1; 0 when there is none. */
  firstParagraphWords: number;
  /** A short first paragraph (12-80 words) that names the H1 topic. */
  answerFirst: boolean;
  orgName: string;
  sameAs: string[];
  author: string;
  tables: number;
  formInputs: number;
  pressLinks: string[];
}

const SOCIAL: Array<[string, RegExp]> = [
  ["x", /(^|\.)(twitter\.com|x\.com)$/],
  ["facebook", /(^|\.)facebook\.com$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["linkedin", /(^|\.)linkedin\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["pinterest", /(^|\.)pinterest\.com$/],
  ["threads", /(^|\.)threads\.net$/],
  ["bluesky", /(^|\.)bsky\.app$/],
  ["mastodon", /(^|\.)mastodon\.social$/],
];

const COMMUNITY = /(^|\.)(discord\.gg|discord\.com|reddit\.com|facebook\.com\/groups|slack\.com|circle\.so|forum)/;

/** News and finance press domains whose links suggest coverage or citations. */
export const PRESS_DOMAINS = [
  "nytimes.com",
  "wsj.com",
  "forbes.com",
  "cnbc.com",
  "cnn.com",
  "bloomberg.com",
  "reuters.com",
  "businessinsider.com",
  "techcrunch.com",
  "theverge.com",
  "usatoday.com",
  "washingtonpost.com",
  "time.com",
  "fortune.com",
  "marketwatch.com",
  "yahoo.com",
  "apnews.com",
  "npr.org",
  "bbc.co.uk",
  "theguardian.com",
  "lifehacker.com",
  "9to5mac.com",
  "macrumors.com",
  "thepointsguy.com",
];

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();
const words = (s: string): number => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

function abs(href: string, base: string): string {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return "";
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}

type Json = Record<string, unknown>;

function jsonLdNodes($: cheerio.CheerioAPI): Json[] {
  const out: Json[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      out.push(v as Json);
      const g = (v as Json)["@graph"];
      if (g) walk(g);
    }
  };
  $('script[type="application/ld+json" i]').each((_, el) => {
    try {
      walk(JSON.parse($(el).text()));
    } catch {
      // invalid JSON-LD is reported by the schema adapter
    }
  });
  return out;
}

const typeList = (n: Json): string[] =>
  (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]]).filter((t): t is string => typeof t === "string");

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function nameOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return nameOf(v[0]);
  if (v && typeof v === "object") return str((v as Json).name);
  return "";
}

const ISO_DATE = /\b(20\d{2}-\d{2}-\d{2})/;
const TEXT_DATE =
  /\b(?:updated|last updated|modified|published)\b[^.]{0,20}?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2},? 20\d{2})/i;

function toIso(s: string): string {
  const m = ISO_DATE.exec(s);
  if (m) return m[1] as string;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

const add = (list: string[], v: string): void => {
  if (!list.includes(v)) list.push(v);
};

/** Read strategy signals from one page's raw HTML. */
export function extractSignals(html: string, url: string): PageSignals {
  const $ = cheerio.load(html);
  const site = domainOf(url);
  const nodes = jsonLdNodes($);
  const meta = (sel: string): string => $(sel).first().attr("content") ?? "";

  let published = toIso(meta('meta[property="article:published_time" i]'));
  let modified = toIso(meta('meta[property="article:modified_time" i], meta[property="og:updated_time" i]'));
  let orgName = "";
  const sameAs = new Set<string>();
  let author = meta('meta[name="author" i]');
  for (const n of nodes) {
    published ||= toIso(str(n.datePublished));
    modified ||= toIso(str(n.dateModified));
    author ||= nameOf(n.author);
    const t = typeList(n);
    if (t.some((x) => /Organization|Corporation|LocalBusiness|Brand/.test(x))) {
      orgName ||= str(n.name);
      for (const s of Array.isArray(n.sameAs) ? n.sameAs : [n.sameAs]) if (typeof s === "string") sameAs.add(s);
    }
  }
  if (!modified) {
    const t = $("time[datetime]").first().attr("datetime") ?? "";
    modified = toIso(t);
  }

  $("script, style, noscript, svg, template").remove();
  const bodyText = squash($("body").text());
  if (!modified) {
    const m = TEXT_DATE.exec(bodyText.slice(0, 5000));
    if (m) modified = toIso(m[1] as string);
  }

  const navLinks: PageSignals["navLinks"] = [];
  const seenNav = new Set<string>();
  $("nav a[href], header a[href], [role=navigation] a[href]").each((_, el) => {
    const href = abs($(el).attr("href") ?? "", url);
    if (!href || !isDomainOrSub(domainOf(href), site) || seenNav.has(href)) return;
    seenNav.add(href);
    navLinks.push({ href, anchor: squash($(el).text()).slice(0, 60) || ($(el).attr("aria-label") ?? "") });
  });

  const dist: DistributionLinks = {
    appStore: [],
    playStore: [],
    extension: [],
    social: [],
    community: [],
    newsletter: false,
    affiliateDisclosure: false,
    podcast: false,
  };
  const press = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = abs($(el).attr("href") ?? "", url);
    if (!href) return;
    const host = domainOf(href);
    if (host === "apps.apple.com" || host === "itunes.apple.com") add(dist.appStore, href);
    else if (host === "play.google.com") add(dist.playStore, href);
    else if (
      host === "chromewebstore.google.com" ||
      (host === "chrome.google.com" && href.includes("/webstore")) ||
      host === "addons.mozilla.org" ||
      host === "microsoftedge.microsoft.com"
    )
      add(dist.extension, href);
    else if (/podcasts\.apple\.com|open\.spotify\.com\/show/.test(href)) dist.podcast = true;
    else if (COMMUNITY.test(host + new URL(href).pathname)) add(dist.community, href);
    const social = SOCIAL.find(([, re]) => re.test(host));
    // LinkedIn /in/ links are staff and author profiles, not the brand's page.
    const personal = social?.[0] === "linkedin" && !/^\/(company|school|showcase)\//.test(new URL(href).pathname);
    if (social && !personal && !dist.social.some((s) => s.platform === social[0]))
      dist.social.push({ platform: social[0], url: href });
    if (PRESS_DOMAINS.some((d) => isDomainOrSub(host, d))) press.add(href);
  });
  dist.newsletter = $('input[type="email"]').length > 0 && /newsletter|subscribe|inbox|weekly email/i.test(bodyText);
  dist.affiliateDisclosure =
    /advertiser disclosure|affiliate (links?|disclosure|commission)|we may (earn|receive) (a )?commission|compensat(ion|e) from/i.test(
      bodyText,
    );

  const h1 = squash($("h1").first().text());
  const firstP = squash(
    $("h1").first().nextAll("p").first().text() || $("main p, article p").first().text() || $("p").first().text(),
  );
  const fpWords = words(firstP);
  const topic = h1
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3);
  const answerFirst = fpWords >= 12 && fpWords <= 80 && topic.some((w) => firstP.toLowerCase().includes(w));

  const questionBlocks =
    $("h2, h3, h4")
      .map((_, el) => squash($(el).text()))
      .get()
      .filter((t) => t.endsWith("?")).length + $("details").length;

  return {
    url,
    htmlBytes: Buffer.byteLength(html),
    navLinks,
    distribution: dist,
    published,
    modified,
    questionBlocks,
    firstParagraphWords: fpWords,
    answerFirst,
    orgName,
    sameAs: [...sameAs],
    author: author.slice(0, 80),
    tables: $("table").length,
    formInputs: $("input:not([type=hidden]):not([type=email]):not([type=search]), select").length,
    pressLinks: [...press],
  };
}
