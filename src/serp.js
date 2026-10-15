import { decodeEntities, parseAttrs, textOf } from './html.js';

/** Split html into chunks that start at each opening tag matching `openRe` (global). */
function blocks(html, openRe) {
  const starts = [];
  let m;
  while ((m = openRe.exec(html))) starts.push({ index: m.index, tag: m[0] });
  return starts.map((s, i) => ({ tag: s.tag, html: html.slice(s.index, starts[i + 1]?.index ?? html.length) }));
}

function firstMatch(html, re) {
  const m = re.exec(html);
  return m ? m[1] : '';
}

/** DuckDuckGo links look like //duckduckgo.com/l/?uddg=<encoded>&rut=... */
export function unwrapDuckDuckGo(href) {
  try {
    const u = new URL(href, 'https://duckduckgo.com');
    const target = u.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : u.toString();
  } catch {
    return href;
  }
}

/** Bing links look like https://www.bing.com/ck/a?...&u=a1<base64url>&ntb=1 */
export function unwrapBing(href) {
  try {
    const u = new URL(href);
    if (!/bing\.com$/.test(u.hostname) || !u.pathname.startsWith('/ck/')) return href;
    const enc = u.searchParams.get('u');
    if (!enc || !enc.startsWith('a1')) return href;
    return Buffer.from(enc.slice(2), 'base64url').toString('utf8');
  } catch {
    return href;
  }
}

export function parseDuckDuckGo(html) {
  const results = [];
  const ads = [];
  for (const b of blocks(html, /<div\b[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>/gi)) {
    const cls = parseAttrs(b.tag.slice(4, -1)).class ?? '';
    if (/\bresults?_links\b|\bresult--ad\b|\bweb-result\b/.test(cls) === false) continue;
    const aTag = firstMatch(b.html, /(<a\b[^>]*class="[^"]*result__a[^"]*"[^>]*>)/i);
    if (!aTag) continue;
    const href = parseAttrs(aTag.slice(2, -1)).href ?? '';
    const title = textOf(firstMatch(b.html, /<a\b[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i));
    const snippet = textOf(firstMatch(b.html, /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/i));
    const item = { url: unwrapDuckDuckGo(href), title, snippet };
    if (/\bresult--ad\b/.test(cls)) ads.push(item);
    else results.push(item);
  }
  return finalize(results, ads);
}

export function parseBing(html) {
  const results = [];
  const ads = [];
  for (const b of blocks(html, /<li\b[^>]*class="b_(?:algo|ad)\b[^"]*"[^>]*>/gi)) {
    const isAd = /class="b_ad/.test(b.tag);
    const h2 = firstMatch(b.html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const aTag = firstMatch(h2, /(<a\b[^>]*>)/i);
    if (!aTag) continue;
    const href = decodeEntities(parseAttrs(aTag.slice(2, -1)).href ?? '');
    const title = textOf(h2);
    const snippet = textOf(firstMatch(b.html, /<p\b[^>]*>([\s\S]*?)<\/p>/i));
    (isAd ? ads : results).push({ url: unwrapBing(href), title, snippet });
  }
  return finalize(results, ads);
}

/** Google result anchors wrap an <h3>; href is direct or /url?q=<target>. */
export function parseGoogle(html) {
  const results = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const title = textOf(firstMatch(m[2], /<h3\b[^>]*>([\s\S]*?)<\/h3>/i));
    if (!title) continue;
    let href = parseAttrs(m[1]).href ?? '';
    if (href.startsWith('/url?')) href = new URLSearchParams(href.slice(5)).get('q') ?? '';
    if (/^https?:\/\/(?:www\.)?google\./i.test(href)) continue;
    results.push({ url: href, title, snippet: '' });
  }
  return finalize(results, []);
}

function finalize(results, ads) {
  const seen = new Set();
  const organic = [];
  for (const r of results) {
    if (!/^https?:\/\//.test(r.url) || seen.has(r.url)) continue;
    seen.add(r.url);
    organic.push({ position: organic.length + 1, ...r });
  }
  return { organic, ads };
}

/** Detect a block, captcha, JS wall or consent page instead of results. */
export function detectBlock(engine, html, status) {
  if (status === 429) return 'rate limited (HTTP 429)';
  if (status && status >= 400) return `HTTP ${status}`;
  const h = String(html ?? '');
  if (engine === 'google' && /enablejs|\/sorry\/|unusual traffic|consent\.google/i.test(h)) return 'Google requires JavaScript, consent or captcha for automated requests';
  if (/captcha|anomaly-modal|unusual traffic|are you a robot/i.test(h)) return 'captcha or anomaly page';
  return '';
}

const QUERY_STOP = new Set(['the', 'and', 'for', 'with', 'best', 'top', 'how', 'what', 'are', 'you', 'your']);
const stem = (w) => w.replace(/(ies|es|s)$/, '');

/**
 * Share of results whose title/snippet/URL contain at least 3/4 of the query
 * terms. Bing, for example, answers non-browser clients with results for only
 * the first word, which shows up here as a very low score.
 */
export function serpRelevance(keyword, organic) {
  const terms = [...new Set(String(keyword).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !QUERY_STOP.has(w)).map(stem))];
  if (!terms.length || !organic.length) return organic.length ? 1 : 0;
  const need = Math.max(1, Math.ceil(terms.length * 0.75));
  const relevant = organic.filter((r) => {
    const hay = `${r.title} ${r.snippet} ${decodeURIComponent(r.url).replace(/[-_/.]/g, ' ')}`.toLowerCase();
    return terms.filter((t) => hay.includes(t)).length >= need;
  });
  return relevant.length / organic.length;
}

export const MIN_RELEVANCE = 0.3;

/** Detect engine from a saved SERP page (browser "Save as HTML"). */
export function detectEngine(html) {
  if (/result__a|duckduckgo/i.test(html)) return 'duckduckgo';
  if (/class="b_algo/i.test(html)) return 'bing';
  if (/google\./i.test(html)) return 'google';
  return '';
}

export const ENGINES = {
  duckduckgo: {
    label: 'DuckDuckGo HTML',
    url: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=us-en`,
    parse: parseDuckDuckGo,
  },
  bing: {
    label: 'Bing HTML',
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en&cc=US`,
    parse: parseBing,
  },
  google: {
    label: 'Google HTML',
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&gl=us`,
    parse: parseGoogle,
  },
};
