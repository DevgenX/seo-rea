// Keyword extraction (1-3 word n-grams, TF-IDF) and keyword gap vs a target.

import type { SourceAdapter } from "../core/types.js";

const STOP = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further get got had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves us via per new one two use using used may might must need make makes made see like well way ways many much even still every best top gets vs click here learn read share log sign menu home page site skip content cookie cookies privacy policy terms rights reserved copyright inc llc com www http https help helps place option options plan plans select welcome twitter facebook instagram linkedin youtube tiktok pinterest email subscribe newsletter account login signup today also however within without based include includes including across around`.split(
    /\s+/,
  ),
);

export function tokenize(text: string): string[] {
  return (
    String(text ?? "")
      .toLowerCase()
      .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []
  ).map((t) => t.replace(/['’]s$/, "").replace(/['’-]+$/, ""));
}

const isWord = (t: string): boolean => t.length > 1 && !/^\d+$/.test(t);

/** Count 1..maxN-gram phrases, skipping ones that start or end with a stopword. */
export function ngrams(text: string, maxN = 3): Map<string, number> {
  const toks = tokenize(text);
  const counts = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    for (let n = 1; n <= maxN && i + n <= toks.length; n++) {
      const gram = toks.slice(i, i + n);
      if (STOP.has(gram[0] as string) || STOP.has(gram[n - 1] as string) || !gram.every(isWord)) continue;
      if (new Set(gram).size < n) continue; // "cards best cards" is navigation, not a phrase
      const key = gram.join(" ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export interface KeywordDoc {
  url: string;
  title?: string;
  metaDescription?: string;
  headings?: { h1?: string[]; h2?: string[]; h3?: string[] };
  text?: string;
}

/**
 * Weighted term counts for one document. Prominent fields (title, meta,
 * headings) weigh 3x the body text.
 */
export function docTerms(doc: KeywordDoc): Map<string, number> {
  const scores = new Map<string, number>();
  const add = (text: string, w: number): void => {
    for (const [k, c] of ngrams(text)) scores.set(k, (scores.get(k) ?? 0) + c * w);
  };
  const h = doc.headings ?? {};
  add([doc.title, doc.metaDescription, ...(h.h1 ?? []), ...(h.h2 ?? []), ...(h.h3 ?? [])].join(" . "), 3);
  add(doc.text ?? "", 1);
  return scores;
}

/** Smoothed inverse document frequency. */
export function idf(df: number, n: number): number {
  return Math.log((n + 1) / (df + 1)) + 1;
}

export interface GapPhrase {
  phrase: string;
  words: number;
  competitors: number;
  /** Sum over competitor docs of tf * idf, with tf = weighted count / doc length. */
  tfidf: number;
  /** Raw weighted count across competitors (title/meta/headings x3). */
  score: number;
  urls: string[];
}

/**
 * Keyword gap: phrases used by competitor docs but absent from every target
 * doc. Ranked by how many competitors use the phrase, then TF-IDF weighted by
 * phrase length (longer phrases are more specific).
 */
export function keywordGap(
  competitors: KeywordDoc[],
  targets: KeywordDoc[],
  opts: { limit?: number; minCompetitors?: number } = {},
): GapPhrase[] {
  const limit = opts.limit ?? 30;
  const targetCorpus = new Set<string>();
  for (const d of targets) for (const k of docTerms(d).keys()) targetCorpus.add(k);
  const docs = competitors.map((d) => ({ url: d.url, terms: docTerms(d) }));
  const n = docs.length;
  const df = new Map<string, number>();
  for (const d of docs) for (const k of d.terms.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  const agg = new Map<string, GapPhrase>();
  for (const d of docs) {
    const len = [...d.terms.values()].reduce((s, v) => s + v, 0) || 1;
    for (const [k, count] of d.terms) {
      if (targetCorpus.has(k)) continue;
      const words = k.split(" ").length;
      const a = agg.get(k) ?? { phrase: k, words, competitors: 0, tfidf: 0, score: 0, urls: [] };
      a.competitors += 1;
      a.score += count;
      a.tfidf += (count / len) * idf(df.get(k) ?? 0, n);
      a.urls.push(d.url);
      agg.set(k, a);
    }
  }
  const min = Math.min(opts.minCompetitors ?? 2, Math.max(n, 1));
  return [...agg.values()]
    .filter((a) => a.competitors >= min)
    .map((a) => ({ ...a, tfidf: Math.round(a.tfidf * 1e5) / 1e5 }))
    .toSorted(
      (x, y) =>
        y.competitors - x.competitors || y.tfidf * y.words - x.tfidf * x.words || x.phrase.localeCompare(y.phrase),
    )
    .slice(0, limit);
}

const weight = ([phrase, score]: [string, number]): number => score * phrase.split(" ").length;

/** Top phrases for a set of docs (the target's own profile). */
export function topKeywords(docs: KeywordDoc[], limit = 15): Array<{ phrase: string; score: number }> {
  const agg = new Map<string, number>();
  for (const d of docs) for (const [k, s] of docTerms(d)) agg.set(k, (agg.get(k) ?? 0) + s);
  return [...agg.entries()]
    .toSorted((a, b) => weight(b) - weight(a) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([phrase, score]) => ({ phrase, score }));
}

export const keywordGapAdapter: SourceAdapter<
  { competitors: KeywordDoc[]; targets: KeywordDoc[]; limit?: number },
  GapPhrase[]
> = {
  id: "keyword-gap",
  label: "Keyword extraction + gap (n-grams, TF-IDF)",
  category: "keywords",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  run: (input) =>
    Promise.resolve(keywordGap(input.competitors, input.targets, input.limit ? { limit: input.limit } : {})),
};
