// Keyword extraction (1-3 word phrases) and keyword gap vs a target.

const STOP = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further get got had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves us via per new one two use using used may might must need make makes made see like well way ways many much even still every best top get gets via vs click here learn read share log sign menu home page site skip content cookie cookies privacy policy terms rights reserved copyright inc llc com www http https`.split(/\s+/),
);

export function tokenize(text) {
  return (String(text ?? '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).map((t) => t.replace(/['’]s$/, '').replace(/['’-]+$/, ''));
}

const isWord = (t) => t.length > 1 && !/^\d+$/.test(t);

/** Count 1-3 gram phrases, skipping ones that start or end with a stopword. */
export function phrases(text, maxN = 3) {
  const toks = tokenize(text);
  const counts = new Map();
  for (let i = 0; i < toks.length; i++) {
    for (let n = 1; n <= maxN && i + n <= toks.length; n++) {
      const gram = toks.slice(i, i + n);
      if (STOP.has(gram[0]) || STOP.has(gram[n - 1]) || !gram.every(isWord)) continue;
      const key = gram.join(' ');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Score phrases for one page. Prominent fields (title, meta, headings) weigh 3x
 * the body text. Returns Map<phrase, score>.
 */
export function pageKeywords(page) {
  const scores = new Map();
  const add = (text, w) => {
    for (const [k, c] of phrases(text)) scores.set(k, (scores.get(k) ?? 0) + c * w);
  };
  const h = page.headings ?? {};
  add([page.title, page.metaDescription, ...(h.h1 ?? []), ...(h.h2 ?? []), ...(h.h3 ?? [])].join(' . '), 3);
  add(page.text ?? '', 1);
  return scores;
}

/**
 * Keyword gap: phrases used by competitor pages but absent from every target page.
 * Ranked by how many competitors use the phrase, then by total prominence score.
 */
export function keywordGap(competitorPages, targetPages, { limit = 30, minCompetitors = 2 } = {}) {
  const targetCorpus = new Set();
  for (const p of targetPages) for (const k of pageKeywords(p).keys()) targetCorpus.add(k);
  const agg = new Map();
  for (const p of competitorPages) {
    for (const [k, score] of pageKeywords(p)) {
      const a = agg.get(k) ?? { phrase: k, competitors: 0, score: 0, urls: [] };
      a.competitors += 1;
      a.score += score;
      a.urls.push(p.url);
      agg.set(k, a);
    }
  }
  const min = Math.min(minCompetitors, competitorPages.length);
  return [...agg.values()]
    .filter((a) => a.competitors >= min && !targetCorpus.has(a.phrase))
    .map((a) => ({ ...a, words: a.phrase.split(' ').length }))
    .sort((x, y) => y.competitors - x.competitors || y.score * y.words - x.score * x.words || x.phrase.localeCompare(y.phrase))
    .slice(0, limit);
}

/** Top phrases for a single set of pages (used for the target's own profile). */
export function topKeywords(pages, limit = 15) {
  const agg = new Map();
  for (const p of pages) for (const [k, s] of pageKeywords(p)) agg.set(k, (agg.get(k) ?? 0) + s);
  const weight = ([phrase, score]) => score * phrase.split(' ').length;
  return [...agg.entries()].sort((a, b) => weight(b) - weight(a) || a[0].localeCompare(b[0])).slice(0, limit).map(([phrase, score]) => ({ phrase, score }));
}
