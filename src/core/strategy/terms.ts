// Target keyword set for a site, derived from its own titles, H1s, URL slugs
// and cluster themes. Pure.

import { ngrams } from "../../adapters/keywords.js";
import type { Cluster } from "./clusters.js";
import type { CrawledPage } from "./types.js";

export interface HeadTerm {
  term: string;
  /** Documents (titles, H1s, meta descriptions, H2s, slugs) that contain the phrase. */
  docs: number;
  sources: string[];
  /** Fetched page URLs whose title or H1 uses the phrase (evidence of intent). */
  pages: string[];
}

/** Words that never make a search term on their own. */
export const WEAK = new Set([
  "topic",
  "topics",
  "category",
  "tag",
  "learn",
  "resources",
  "calculators",
  "tools",
  "posts",
  "articles",
  "free",
  "online",
  "app",
  "apps",
  "official",
  "site",
  "page",
  "blog",
  "guide",
  "guides",
  "review",
  "reviews",
  "article",
  "news",
  "2023",
  "2024",
  "2025",
  "2026",
  "2027",
  "us",
  "ca",
  "uk",
  "en",
  "faq",
  "about",
  "contact",
  "pricing",
  "login",
  "support",
  "terms",
  "privacy",
  "careers",
  "press",
]);

/** Stopwords inside a phrase ("install on safari", "cards every day") mark navigation or prose, not a query. */
const STOPISH = new Set(
  "a an and or the of on in to for with by at from is are was be your you our we my it this that every more most all any how what".split(
    " ",
  ),
);

const singular = (t: string): string => t.replace(/s\b/g, "");

const ngramWords = (text: string): string[] => [...ngrams(text, 1).keys()];

/** Help centres and docs answer support questions; they are not the target keyword set. */
export function isSupportUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return (
      /^(help|support|docs|kb|faq|status)\./.test(x.hostname) || /^\/(help|support|docs|kb)(\/|$)/.test(x.pathname)
    );
  } catch {
    return false;
  }
}

const slugText = (url: string): string => {
  try {
    return new URL(url).pathname.replace(/\.(html?|php)$/, "").replace(/[-_/]+/g, " ");
  } catch {
    return "";
  }
};

/**
 * Up to `limit` head terms: 2-3 word phrases found in at least two of the
 * site's titles, H1s or slugs, brand words removed, near-duplicates dropped.
 */
export function deriveHeadTerms(
  pages: CrawledPage[],
  urls: string[],
  clusters: Cluster[],
  brandTokens: string[],
  limit = 10,
): HeadTerm[] {
  const brand = new Set(brandTokens.map((b) => b.toLowerCase()));
  const agg = new Map<string, { docs: number; weight: number; sources: Set<string>; pages: Set<string> }>();
  const addDoc = (text: string, source: string, w: number, page?: string): void => {
    const seen = new Set<string>();
    // Phrases do not cross punctuation: "Amex, Chase, BoA" is a list, not a term.
    const grams = String(text ?? "")
      .split(/[,;:|•·–—()[\]!?"“”/]+|\s-\s|\.\s/)
      .flatMap((frag) => [...ngrams(frag, 3).keys()]);
    for (const k of grams) {
      const words = k.split(" ");
      if (words.length < 2 || seen.has(k)) continue;
      if (
        words.some((x) => brand.has(x) || STOPISH.has(x)) ||
        words.every((x) => WEAK.has(x)) ||
        WEAK.has(words[0] as string)
      )
        continue;
      seen.add(k);
      const a = agg.get(k) ?? { docs: 0, weight: 0, sources: new Set<string>(), pages: new Set<string>() };
      a.docs += 1;
      a.weight += w;
      a.sources.add(source);
      if (page && w >= 2) a.pages.add(page);
      agg.set(k, a);
    }
  };
  for (const p of pages.filter((x) => !isSupportUrl(x.url))) {
    // Titles often end in "| Brand"; brand words are skipped above.
    addDoc(p.title, "title", 3, p.url);
    for (const h of p.h1.slice(0, 2)) addDoc(h, "h1", 2, p.url);
    addDoc(p.metaDescription, "meta", 1);
    for (const h of p.h2.slice(0, 12)) addDoc(h, "h2", 1);
  }
  for (const u of urls.filter((x) => !isSupportUrl(x)).slice(0, 5000)) addDoc(slugText(u), "slug", 1);
  for (const c of clusters.filter((x) => !isSupportUrl(x.exampleUrls[0] ?? "")))
    for (const t of c.terms) addDoc(t, `cluster ${c.key}`, 1);
  // Topic vocabulary: homepage title/meta/H1 words plus the names of large clusters.
  // Phrases outside it ("lake nona" from offer slugs) need much more support.
  const home = pages.find((p) => p.isHome) ?? pages[0];
  const topic = new Set(
    [
      ...ngramWords([home?.title, home?.metaDescription, ...(home?.h1 ?? [])].join(" ")),
      ...clusters
        .filter((c) => c.urlCount >= 10 && !isSupportUrl(c.exampleUrls[0] ?? ""))
        .flatMap((c) => ngramWords(c.key.replace(/^\/\/[^/]+/, "").replace(/[-_/]+/g, " "))),
    ].filter((w) => !brand.has(w) && !WEAK.has(w)),
  );
  // Words used on other pages or slugs; a title phrase made of them is a topic, not a slogan.
  const elsewhere = new Set(
    ngramWords(
      [
        ...pages.filter((p) => p !== home && !isSupportUrl(p.url)).flatMap((p) => [p.title, ...p.h1]),
        ...urls.filter((u) => !isSupportUrl(u) && u !== home?.url).map(slugText),
      ].join(" "),
    ),
  );
  const onTopic = (t: string): boolean =>
    t.split(" ").some((w) => topic.has(w) || topic.has(singular(w)) || topic.has(`${w}s`));
  const scored = [...agg.entries()]
    .filter(([, a]) => a.weight >= 3 && (a.pages.size >= 1 || a.sources.size >= 2))
    .filter(([term, a]) => onTopic(term) || (a.weight >= 8 && a.pages.size >= 2))
    // Homepage slogan fragments ("financial decisions start") appear nowhere else;
    // the homepage title is kept, since that is where sites put their main term.
    .filter(
      ([term, a]) =>
        a.docs >= 3 ||
        a.sources.has("slug") ||
        ![...a.pages].every((u) => u === home?.url) ||
        (` ${(home?.title ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `.includes(` ${term} `) &&
          term.split(" ").every((w) => elsewhere.has(w))),
    )
    .map(([term, a]) => ({
      term,
      docs: a.docs,
      sources: [...a.sources].slice(0, 4),
      pages: [...a.pages].slice(0, 3),
      score: Math.log2(1 + a.weight) * (term.split(" ").length === 3 ? 1.6 : 1) * (a.pages.size ? 1.5 : 1),
    }))
    .toSorted((a, b) => b.score - a.score || a.term.localeCompare(b.term));
  // A two-word phrase loses to a longer phrase that contains it and carries
  // a good share of its documents ("credit card" -> "credit card tracker").
  const preferLonger = scored.filter(
    (s) => !scored.some((l) => l.term !== s.term && l.term.includes(s.term) && l.docs >= Math.max(2, 0.25 * s.docs)),
  );
  const out: HeadTerm[] = [];
  for (const s of preferLonger) {
    if (out.length >= limit) break;
    if (out.some((o) => o.term.includes(s.term) || s.term.includes(o.term) || singular(o.term) === singular(s.term)))
      continue;
    const { score: _s, ...t } = s;
    out.push(t);
  }
  return out;
}

/** Brand words from the domain and the homepage title ("cardpointers" -> ["cardpointers"]). */
export function brandTokensFor(domain: string, brand: string, orgName = ""): string[] {
  const label = domain.split(".")[0] ?? "";
  return [
    ...new Set(
      [label, brand, ...orgName.toLowerCase().split(/[^\p{L}\p{N}]+/u)]
        .map((s) => s.toLowerCase())
        .filter((s) => s.length > 2),
    ),
  ];
}
