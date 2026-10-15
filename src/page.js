import { elements, openTags, stripComments, stripNonContent, textOf, visibleText } from './html.js';

export function countWords(text) {
  const m = String(text ?? '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

/** Collect every @type in a JSON-LD value, including @graph and nested nodes. */
export function schemaTypes(value, out = new Set()) {
  if (Array.isArray(value)) {
    for (const v of value) schemaTypes(v, out);
  } else if (value && typeof value === 'object') {
    const t = value['@type'];
    if (typeof t === 'string') out.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && out.add(x));
    for (const [k, v] of Object.entries(value)) if (k !== '@type' && typeof v === 'object') schemaTypes(v, out);
  }
  return out;
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function sameSite(a, b) {
  const ha = hostOf(a);
  const hb = hostOf(b);
  return Boolean(ha) && (ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`));
}

/** Parse on-page SEO facts from raw HTML fetched at `url`. */
export function parsePage(html, url) {
  const clean = stripComments(html);
  const content = stripNonContent(html);
  const metas = openTags(clean, 'meta');
  const metaBy = (key, val) => metas.find((m) => (m[key] ?? '').toLowerCase() === val)?.content ?? '';
  const links = openTags(clean, 'link');
  const canonicalRaw = links.find((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'))?.href ?? '';
  const hreflang = links.filter((l) => (l.rel ?? '').toLowerCase() === 'alternate' && l.hreflang).map((l) => l.hreflang);

  const headings = { h1: [], h2: [], h3: [] };
  for (const level of ['h1', 'h2', 'h3']) {
    headings[level] = elements(content, level).map((e) => textOf(e.inner)).filter(Boolean);
  }

  const types = new Set();
  let jsonLdBlocks = 0;
  let jsonLdErrors = 0;
  for (const s of elements(clean, 'script')) {
    if ((s.attrs.type ?? '').toLowerCase() !== 'application/ld+json') continue;
    jsonLdBlocks++;
    try {
      schemaTypes(JSON.parse(s.inner.trim()), types);
    } catch {
      jsonLdErrors++;
    }
  }

  const internal = [];
  const external = [];
  for (const a of elements(content, 'a')) {
    const href = a.attrs.href;
    if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
    let abs;
    try {
      abs = new URL(href, url);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(abs.protocol)) continue;
    abs.hash = '';
    const link = { href: abs.toString(), anchor: textOf(a.inner) || (a.attrs['aria-label'] ?? a.attrs.title ?? ''), rel: a.attrs.rel ?? '' };
    (sameSite(abs.toString(), url) ? internal : external).push(link);
  }

  const text = visibleText(content);
  let canonical = '';
  try {
    canonical = canonicalRaw ? new URL(canonicalRaw, url).toString() : '';
  } catch {
    canonical = canonicalRaw;
  }

  return {
    url,
    title: textOf(elements(clean, 'title')[0]?.inner ?? ''),
    metaDescription: metaBy('name', 'description'),
    metaRobots: metaBy('name', 'robots'),
    ogTitle: metaBy('property', 'og:title'),
    canonical,
    hreflang,
    lang: (/<html\b[^>]*\blang=["']?([\w-]+)/i.exec(clean) ?? [])[1] ?? '',
    headings,
    wordCount: countWords(text),
    schemaTypes: [...types].sort(),
    jsonLdBlocks,
    jsonLdErrors,
    internalLinks: internal,
    externalLinks: external,
    text,
  };
}
