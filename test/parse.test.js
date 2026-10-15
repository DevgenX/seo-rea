import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { decodeEntities, parseAttrs, visibleText } from '../src/html.js';
import { countWords, parsePage, sameSite } from '../src/page.js';
import { detectBlock, detectEngine, MIN_RELEVANCE, parseBing, parseDuckDuckGo, parseGoogle, serpRelevance, unwrapBing, unwrapDuckDuckGo } from '../src/serp.js';
import { isAllowed, parseRobots, parseSitemap } from '../src/site.js';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('decodeEntities handles named and numeric entities', () => {
  assert.equal(decodeEntities('a &amp; b &#174; &#x41; &nbsp;&bogus;'), 'a & b ® A  &bogus;');
});

test('parseAttrs reads quoted, unquoted and bare attributes', () => {
  assert.deepEqual(parseAttrs(` href="/x?a=1&amp;b=2" data-id class='c d' hidden width=10`), { href: '/x?a=1&b=2', 'data-id': '', class: 'c d', hidden: '', width: '10' });
});

test('visibleText drops head, scripts and styles', () => {
  const t = visibleText(fx('article.html'));
  assert.ok(!t.includes('not a heading'));
  assert.ok(!t.includes('color:red'));
  assert.ok(t.includes('Points tracking apps'));
});

test('parsePage extracts on-page facts', () => {
  const p = parsePage(fx('article.html'), 'https://www.alpha.com/best-rewards-apps/');
  assert.equal(p.title, 'Best Credit Card Rewards Apps & Trackers (2026)');
  assert.equal(p.metaDescription, 'We tested 9 credit card rewards apps for points tracking.');
  assert.equal(p.metaRobots, 'index,follow');
  assert.equal(p.canonical, 'https://www.alpha.com/best-rewards-apps/');
  assert.deepEqual(p.hreflang, ['en-gb']);
  assert.equal(p.lang, 'en-US');
  assert.deepEqual(p.headings.h1, ['Best Credit Card Rewards Apps']);
  assert.deepEqual(p.headings.h2, ['How we picked', 'Top picks']);
  assert.deepEqual(p.headings.h3, ['CardPointers', 'MaxRewards']);
  assert.deepEqual(p.schemaTypes, ['Article', 'BreadcrumbList', 'FAQPage', 'Person', 'Question']);
  assert.equal(p.jsonLdBlocks, 3);
  assert.equal(p.jsonLdErrors, 1);
  assert.deepEqual(
    p.internalLinks.map((l) => [l.href, l.anchor]),
    [
      ['https://www.alpha.com/', 'Home'],
      ['https://www.alpha.com/cards/', 'Cards'],
      ['https://www.alpha.com/reviews/cardpointers/', 'Read the CardPointers review'],
      ['https://blog.alpha.com/maxrewards', 'MaxRewards'],
    ],
  );
  assert.deepEqual(p.externalLinks.map((l) => l.href), ['https://twitter.com/alpha']);
  assert.ok(p.wordCount > 30 && p.wordCount < 80, `wordCount ${p.wordCount}`);
});

test('countWords and sameSite', () => {
  assert.equal(countWords("It's a 2-step, well-known app."), 5);
  assert.ok(sameSite('https://blog.a.com/x', 'https://www.a.com/'));
  assert.ok(!sameSite('https://a.com.evil.net/', 'https://a.com/'));
});

test('parseDuckDuckGo separates ads, unwraps and dedupes links', () => {
  const r = parseDuckDuckGo(fx('ddg.html'));
  assert.deepEqual(r.organic.map((x) => [x.position, x.url]), [
    [1, 'https://www.alpha.com/best-rewards-apps/'],
    [2, 'https://beta.org/guide'],
  ]);
  assert.equal(r.organic[0].title, 'Best Apps to Track Credit Card Rewards of 2026');
  assert.equal(r.organic[0].snippet, 'Compare the top rewards trackers & wallets.');
  assert.deepEqual(r.ads.map((a) => a.url), ['https://ads.example.net/promo']);
  assert.equal(unwrapDuckDuckGo('//duckduckgo.com/l/?uddg=https%3A%2F%2Fx.com%2F'), 'https://x.com/');
});

test('parseBing decodes /ck/a redirect links and finds ads', () => {
  const r = parseBing(fx('bing.html'));
  assert.deepEqual(r.organic.map((x) => x.url), ['https://www.gamma.com/apps', 'https://delta.io/cards']);
  assert.equal(r.organic[0].title, 'Gamma Rewards Apps');
  assert.equal(r.organic[0].snippet, 'Gamma ranks the best apps ® for points.');
  assert.deepEqual(r.ads.map((a) => a.url), ['https://ads.example.org/landing']);
  assert.equal(unwrapBing('https://example.com/x'), 'https://example.com/x');
});

test('parseGoogle reads direct and /url?q= result links, skips Google links', () => {
  const r = parseGoogle(fx('google-results.html'));
  assert.deepEqual(r.organic.map((x) => [x.url, x.title]), [
    ['https://www.alpha.com/best-rewards-apps/', 'Best Credit Card Rewards Apps'],
    ['https://beta.org/guide', 'Rewards app guide'],
  ]);
});

test('detectEngine identifies saved SERP pages', () => {
  assert.equal(detectEngine(fx('ddg.html')), 'duckduckgo');
  assert.equal(detectEngine(fx('bing.html')), 'bing');
  assert.equal(detectEngine(fx('google-results.html')), 'google');
  assert.equal(detectEngine('<html></html>'), '');
});

test('serpRelevance flags first-word-only (bot-degraded) results', () => {
  const kw = 'credit card rewards app';
  const degraded = [
    { url: 'https://www.creditkarma.com/', title: 'Credit scores, reports and much more', snippet: 'Free credit scores.' },
    { url: 'https://en.wikipedia.org/wiki/Credit', title: 'Credit - Wikipedia', snippet: 'Credit is the trust...' },
  ];
  const good = [
    { url: 'https://www.alpha.com/best-rewards-apps/', title: 'Best Apps to Track Credit Card Rewards', snippet: '' },
    { url: 'https://beta.org/x', title: 'Credit card app guide', snippet: 'rewards tracking' },
    { url: 'https://c.com/', title: 'Something else', snippet: '' },
  ];
  assert.equal(serpRelevance(kw, degraded), 0);
  assert.ok(serpRelevance(kw, good) >= MIN_RELEVANCE);
  assert.equal(serpRelevance(kw, []), 0);
});

test('detectBlock recognises Google JS wall, captcha and HTTP errors', () => {
  assert.match(detectBlock('google', fx('google-block.html'), 200), /JavaScript/);
  assert.match(detectBlock('bing', '<div>Please solve this CAPTCHA</div>', 200), /captcha/);
  assert.equal(detectBlock('bing', '', 429), 'rate limited (HTTP 429)');
  assert.equal(detectBlock('duckduckgo', fx('ddg.html'), 200), '');
});

test('robots.txt parsing and longest-match rules', () => {
  const r = parseRobots(fx('robots.txt'));
  assert.deepEqual(r.sitemaps, ['https://example.com/sitemap_index.xml']);
  assert.ok(isAllowed(r, 'seo-rea', 'https://example.com/nogoogle'));
  assert.ok(!isAllowed(r, 'Googlebot', 'https://example.com/nogoogle'));
  assert.ok(!isAllowed(r, 'seo-rea', 'https://example.com/private/x'));
  assert.ok(isAllowed(r, 'seo-rea', 'https://example.com/private/public-page'));
  assert.ok(!isAllowed(r, 'seo-rea', 'https://example.com/files/a.pdf'));
  assert.ok(isAllowed(r, 'seo-rea', 'https://example.com/files/a.pdf?x=1'));
  assert.ok(isAllowed(parseRobots(''), 'seo-rea', 'https://example.com/anything'));
});

test('sitemap and sitemap index parsing', () => {
  assert.deepEqual(parseSitemap(fx('sitemap-index.xml')), { kind: 'index', locs: ['https://example.com/sitemap-pages.xml', 'https://example.com/sitemap-posts.xml?a=1&b=2'] });
  assert.deepEqual(parseSitemap(fx('sitemap.xml')), { kind: 'urlset', locs: ['https://example.com/', 'https://example.com/a?x=1&y=2'] });
});
