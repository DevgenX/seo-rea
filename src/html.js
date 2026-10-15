// Dependency-free HTML helpers. Regex-based on purpose: we only need a few
// well-known elements, and pages that break this are recorded as limitations.

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', copy: '(c)', reg: '(r)', trade: '(tm)' };

export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

export function stripComments(html) {
  return String(html ?? '').replace(/<!--[\s\S]*?-->/g, '');
}

export function textOf(fragment) {
  return decodeEntities(String(fragment ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Drops script/style/noscript/svg/template/iframe elements and comments. */
export function stripNonContent(html) {
  return stripComments(html).replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1\s*>/gi, ' ');
}

/** Visible text: drops non-content elements and head. */
export function visibleText(html) {
  return textOf(stripNonContent(html).replace(/<head\b[\s\S]*?<\/head>/gi, ' '));
}

/** All elements of a paired tag: [{ attrs, inner }]. */
export function elements(html, tag) {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ attrs: parseAttrs(m[1]), inner: m[2] });
  return out;
}

/** All void/open tags of a name: [attrs]. */
export function openTags(html, tag) {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(parseAttrs(m[1]));
  return out;
}

export function hasClass(attrs, cls) {
  return (attrs.class ?? '').split(/\s+/).includes(cls);
}
