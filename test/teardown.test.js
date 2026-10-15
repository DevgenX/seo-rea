import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { recordCitation, parseUrlList } from '../src/cite.js';
import { RateLimiter } from '../src/http.js';
import { normalizeDomain, runTeardown } from '../src/teardown.js';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

// Offline router: every URL the pipeline may request maps to a fixture.
function fakeFetch(requested, { ddgBlocked = false } = {}) {
  return async (url) => {
    requested.push(url);
    const u = new URL(url);
    const html = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html' } });
    if (u.hostname === 'html.duckduckgo.com') return ddgBlocked ? html('<div class="anomaly-modal">bots use DuckDuckGo too</div>', 202) : html(fx('ddg.html'));
    if (u.hostname === 'www.bing.com') return html(fx('bing.html'));
    if (u.hostname === 'www.google.com') return html(fx('google-block.html'));
    if (u.pathname === '/robots.txt') return u.hostname === 'beta.org' ? new Response('User-agent: *\nDisallow: /guide', { status: 200 }) : new Response('', { status: 404 });
    if (u.hostname === 'www.alpha.com') return html(fx('article.html'));
    if (u.hostname === 'getcardlab.app') {
      if (u.pathname === '/sitemap.xml') return new Response('<urlset><url><loc>https://getcardlab.app/</loc></url><url><loc>https://getcardlab.app/features</loc></url></urlset>', { status: 200, headers: { 'content-type': 'application/xml' } });
      return html(fx('target-home.html'));
    }
    return html('not found', 404);
  };
}

const fastLimiter = () => new RateLimiter(0);

test('normalizeDomain strips scheme, www and path', () => {
  assert.equal(normalizeDomain('https://www.GetCardLab.app/pricing'), 'getcardlab.app');
});

test('teardown runs offline end to end with budget 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'seo-rea-td-'));
  const requested = [];
  const { run, claims, playbook } = await runTeardown({
    keyword: 'credit card rewards app',
    target: 'getcardlab.app',
    out: join(dir, 'out'),
    budgetUsd: 0,
    cacheDir: join(dir, 'cache'),
    ledgerPath: join(dir, 'ledger.csv'),
    fetchImpl: fakeFetch(requested),
    limiter: fastLimiter(),
    env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' },
  });

  assert.ok(!requested.some((u) => u.includes('dataforseo')), 'no paid calls at budget 0');
  assert.ok(!requested.includes('https://beta.org/guide'), 'robots.txt disallow respected');
  assert.equal(run.serp.primary, 'duckduckgo');
  assert.equal(run.serp.organic.length, 2);
  assert.match(run.serp.engines.find((e) => e.engine === 'google').blocked, /JavaScript/);
  assert.equal(run.serp.ads.length, 2);
  assert.equal(run.competitors[0].page.wordCount > 0, true);
  assert.equal(run.competitors[1].error, 'disallowed by robots.txt');
  assert.equal(run.target.pages.length, 3);
  assert.deepEqual(run.target.schemaTypes, ['Organization']);
  assert.equal(run.target.sitemap.urlCount, 2);
  assert.equal(run.ads.length, 9);
  assert.equal(run.spentUsd, 0);
  assert.ok(claims.some((c) => /does not appear/.test(c.claim)));
  assert.ok(playbook.some((p) => /JSON-LD/.test(p.action)));

  const out = join(dir, 'out');
  const td = await readFile(join(out, 'report', 'teardown.md'), 'utf8');
  for (const h of ['## 1. Summary', '## 2. SERP map', '## 3. Competitor cards', '## 4. Keyword gap', '## 5. AI-citation table', '## 6. Ads', '## 7. Playbook', '## 8. Unknowns and cost']) assert.ok(td.includes(h), h);
  assert.match(await readFile(join(out, 'evidence', 'index.md'), 'utf8'), /\| E001 \| serp-duckduckgo \|/);
  assert.match(await readFile(join(out, 'report', 'ledger.md'), 'utf8'), /\| C01 \|/);
  assert.match(await readFile(join(out, 'report', 'questions.md'), 'utf8'), /\*\*answered/);

  await assert.rejects(runTeardown({ keyword: 'x', target: 'getcardlab.app', out, cacheDir: join(dir, 'cache'), ledgerPath: join(dir, 'l.csv'), fetchImpl: fakeFetch([]), limiter: fastLimiter() }), /--force/);

  const before = requested.length;
  const cited = await recordCitation({ out, engine: 'perplexity', prompt: 'best credit card rewards app', urls: 'https://www.alpha.com/best-rewards-apps/, https://getcardlab.app/ not-a-url' });
  assert.equal(requested.length, before, 'cite does not fetch');
  assert.deepEqual(cited.content.domains, ['alpha.com', 'getcardlab.app']);
  assert.equal(cited.rerendered, true);
  const td2 = await readFile(join(out, 'report', 'teardown.md'), 'utf8');
  assert.match(td2, /\| perplexity \| best credit card rewards app \| alpha\.com, getcardlab\.app \| yes \| E\d{3} \|/);

  await assert.rejects(recordCitation({ out, engine: 'askjeeves', prompt: 'x', urls: '' }), /--engine/);
});

test('parseUrlList accepts commas, spaces and newlines', () => {
  assert.deepEqual(parseUrlList('https://a.com/x,https://b.com\nftp://c.com https://d.com/'), ['https://a.com/x', 'https://b.com', 'https://d.com/']);
});

test('blocked and degraded SERPs are not used or cached; saved SERP pages are', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'seo-rea-td-'));
  const base = { keyword: 'credit card rewards app', target: 'getcardlab.app', budgetUsd: 0, cacheDir: join(dir, 'cache'), ledgerPath: join(dir, 'ledger.csv'), limiter: fastLimiter(), crawl: 1 };

  const first = [];
  const a = await runTeardown({ ...base, out: join(dir, 'a'), fetchImpl: fakeFetch(first, { ddgBlocked: true }) });
  assert.equal(a.run.serp.organic.length, 0);
  const byEngine = Object.fromEntries(a.run.serp.engines.map((e) => [e.engine, e.blocked]));
  assert.match(byEngine.duckduckgo, /captcha or anomaly/);
  assert.match(byEngine.bing, /^degraded/);
  assert.match(byEngine.google, /JavaScript/);
  assert.ok(a.run.unknowns.some((u) => u.includes('--serp-html')));
  assert.ok((await readFile(join(dir, 'a', 'report', 'teardown.md'), 'utf8')).includes('## 8. Unknowns and cost'));

  const second = [];
  await runTeardown({ ...base, out: join(dir, 'b'), fetchImpl: fakeFetch(second, { ddgBlocked: true }) });
  assert.ok(second.some((u) => u.includes('duckduckgo')), 'blocked DDG page was not cached');
  assert.ok(second.some((u) => u.includes('bing.com')), 'degraded Bing page was not cached');

  const saved = join(dir, 'google-saved.html');
  await writeFile(saved, fx('google-results.html'));
  const c = await runTeardown({ ...base, out: join(dir, 'c'), serpHtml: [saved], engines: [], fetchImpl: fakeFetch([]) });
  assert.equal(c.run.serp.primary, 'google');
  assert.equal(c.run.serp.organic[0].url, 'https://www.alpha.com/best-rewards-apps/');
  assert.equal(c.run.serp.engines[0].label, 'Saved Google HTML (google-saved.html)');

  const d = await runTeardown({ ...base, out: join(dir, 'd'), serpUrls: ['https://www.alpha.com/best-rewards-apps/'], engines: [], fetchImpl: fakeFetch([]) });
  assert.equal(d.run.serp.primary, 'manual');
  assert.equal(d.run.competitors[0].page.title, 'Best Credit Card Rewards Apps & Trackers (2026)');
});
