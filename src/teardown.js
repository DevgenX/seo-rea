import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { adLibraryLookups } from './ads.js';
import { Cache, TTL } from './cache.js';
import { BudgetError, DataForSEO } from './dataforseo.js';
import { EvidenceStore } from './evidence.js';
import { politeFetch, RateLimiter, USER_AGENT } from './http.js';
import { keywordGap, topKeywords } from './keywords.js';
import { parsePage } from './page.js';
import { buildClaims, buildPlaybook, domainOf, renderLedger, renderQuestions, renderTeardown } from './report.js';
import { detectBlock, detectEngine, ENGINES, MIN_RELEVANCE, serpRelevance } from './serp.js';
import { isAllowed, parseRobots, parseSitemap } from './site.js';

export function normalizeDomain(input) {
  return String(input).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '').toLowerCase();
}

/** Page summary kept in run.json (drops full text and raw link lists). */
export function summarizePage(page) {
  const anchors = new Map();
  for (const l of page.internalLinks) {
    const a = l.anchor.slice(0, 80);
    if (a) anchors.set(a, (anchors.get(a) ?? 0) + 1);
  }
  const { text, internalLinks, externalLinks, ...rest } = page;
  return {
    ...rest,
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    topAnchors: [...anchors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([anchor, count]) => ({ anchor, count })),
  };
}

/** Count inlinks per internal path across crawled pages. */
export function inlinkCounts(pages) {
  const counts = new Map();
  for (const p of pages) {
    for (const l of p.internalLinks) {
      let path;
      try {
        path = new URL(l.href).pathname;
      } catch {
        continue;
      }
      const e = counts.get(path) ?? { path, count: 0, anchors: new Set() };
      e.count += 1;
      if (l.anchor) e.anchors.add(l.anchor.slice(0, 60));
      counts.set(path, e);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 30).map((e) => ({ path: e.path, count: e.count, anchors: [...e.anchors].slice(0, 5) }));
}

const isHtml = (r) => r.ok && (!r.contentType || /html|xml/i.test(r.contentType));

export async function runTeardown(opts, log = () => {}) {
  const keyword = opts.keyword.trim();
  const target = normalizeDomain(opts.target);
  const out = opts.out;
  const top = opts.top ?? 8;
  const budgetUsd = Number(opts.budgetUsd ?? 0);
  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

  if (opts.force) for (const d of ['evidence', 'report', 'data']) await rm(join(out, d), { recursive: true, force: true });
  else {
    try {
      await readFile(join(out, 'data', 'run.json'));
      throw new Error(`${out} already has a run. Use --force to replace it (deletes evidence/, report/, data/ in that folder).`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  await mkdir(join(out, 'report'), { recursive: true });
  await mkdir(join(out, 'data'), { recursive: true });

  const cache = new Cache(opts.cacheDir, { disabled: opts.noCache });
  const limiter = opts.limiter ?? new RateLimiter(opts.delayMs ?? 1500);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const get = (url, source = 'page', ttlMs = TTL.page) => politeFetch(url, { cache, ttlMs, cacheSource: source, limiter, fetchImpl });
  const ev = await new EvidenceStore(out).load();
  const dfs = new DataForSEO({ budgetUsd, monthlyCapUsd: opts.monthlyCapUsd ?? Infinity, ledgerPath: opts.ledgerPath, runId, cache, env: opts.env ?? process.env, fetchImpl });

  const run = {
    runId,
    keyword,
    target: { domain: target, pages: [], schemaTypes: [], sitemap: { urlCount: 0 }, inlinks: [], topKeywords: [] },
    createdAt: new Date().toISOString(),
    budgetUsd,
    spentUsd: 0,
    serp: { engines: [], organic: [], ads: [], primary: '', primaryLabel: '' },
    competitors: [],
    keywordGap: [],
    ads: [],
    citations: [],
    unknowns: [],
    finished: false,
  };
  await writeFile(join(out, 'report', 'questions.md'), renderQuestions(run));

  // 1. SERP: operator-supplied SERPs first, then free engines
  const judge = (name, body, status) => {
    const blocked = detectBlock(name, body, status);
    const parsed = blocked ? { organic: [], ads: [] } : ENGINES[name].parse(body);
    const relevance = serpRelevance(keyword, parsed.organic);
    let problem = blocked;
    if (!problem && !parsed.organic.length) problem = 'no results parsed (layout change or block)';
    if (!problem && relevance < MIN_RELEVANCE) problem = `degraded: only ${Math.round(relevance * 100)}% of results match the query terms (engine likely served a bot-degraded SERP)`;
    return { parsed, relevance, problem };
  };
  const addEngine = async ({ name, label, url, body, status, fetchedAt, fromCache, kind = 'observed', source }) => {
    const j = ENGINES[name] ? judge(name, body, status) : { parsed: { organic: [], ads: [] }, relevance: 0, problem: 'unknown engine' };
    const e = await ev.add({ source, kind, url, ext: 'html', content: body || `<!-- fetch failed: ${j.problem} -->`, fetchedAt, fromCache, note: j.problem || `${j.parsed.organic.length} organic, ${j.parsed.ads.length} ads, relevance ${Math.round(j.relevance * 100)}%` });
    run.serp.engines.push({ engine: name, label, status, fromCache, blocked: j.problem, relevance: j.relevance, organicCount: j.problem ? 0 : j.parsed.organic.length, parsedCount: j.parsed.organic.length, adCount: j.parsed.ads.length, evidenceId: e.id, organic: j.problem ? [] : j.parsed.organic });
    for (const a of j.parsed.ads) run.serp.ads.push({ engine: label, ...a });
  };
  for (const file of opts.serpHtml ?? []) {
    const body = await readFile(file, 'utf8');
    const name = detectEngine(body);
    log(`serp: saved file ${file} (${name || 'unknown engine'})`);
    await addEngine({ name, label: `Saved ${ENGINES[name]?.label ?? 'SERP'} (${basename(file)})`, url: `file:${basename(file)}`, body, status: 200, kind: 'manual', source: `serp-saved-${name || 'unknown'}` });
  }
  if (opts.serpUrls?.length) {
    const organic = opts.serpUrls.map((url, i) => ({ position: i + 1, url, title: '', snippet: '' }));
    const e = await ev.add({ source: 'serp-manual-urls', kind: 'manual', note: `${organic.length} URLs entered by operator, in ranking order`, content: { keyword, organic } });
    run.serp.engines.push({ engine: 'manual', label: 'Operator-supplied URL list', status: 200, fromCache: false, blocked: '', relevance: 1, organicCount: organic.length, adCount: 0, evidenceId: e.id, organic });
  }
  for (const name of opts.engines ?? ['duckduckgo', 'bing', 'google']) {
    const engine = ENGINES[name];
    if (!engine) {
      run.unknowns.push(`Unknown engine "${name}" skipped`);
      continue;
    }
    log(`serp: ${engine.label}`);
    const url = engine.url(keyword);
    const r = await politeFetch(url, { cache, ttlMs: TTL.serp, cacheSource: `serp:${name}`, cacheIf: (x) => !judge(name, x.body, x.status).problem, limiter, fetchImpl });
    if (!r.ok) {
      const problem = r.error || `HTTP ${r.status}`;
      const e = await ev.add({ source: `serp-${name}`, url, ext: 'txt', content: `fetch failed: ${problem}`, fetchedAt: r.fetchedAt, note: problem });
      run.serp.engines.push({ engine: name, label: engine.label, status: r.status, fromCache: false, blocked: problem, relevance: 0, organicCount: 0, adCount: 0, evidenceId: e.id, organic: [] });
      continue;
    }
    await addEngine({ name, label: engine.label, url, body: r.body, status: r.status, fetchedAt: r.fetchedAt, fromCache: r.fromCache, source: `serp-${name}` });
  }
  const primary = run.serp.engines.find((e) => e.organicCount > 0);
  if (primary) {
    run.serp.primary = primary.engine;
    run.serp.primaryLabel = primary.label;
    run.serp.organic = primary.organic.slice(0, top).map((r) => ({ ...r, domain: domainOf(r.url) }));
  } else if (dfs.enabled) {
    // Paid fallback only when every free engine failed.
    try {
      const r = await dfs.serp(keyword);
      const e = await ev.add({ source: 'dataforseo-serp', kind: 'api', url: 'https://api.dataforseo.com/v3/serp/google/organic/live/regular', content: r.data, costUsd: r.costUsd, fromCache: r.fromCache, note: `${r.organic.length} organic` });
      run.serp.engines.push({ engine: 'dataforseo', label: 'DataForSEO Google SERP', status: 200, fromCache: r.fromCache, blocked: '', organicCount: r.organic.length, adCount: r.ads.length, evidenceId: e.id });
      run.serp.primary = 'dataforseo';
      run.serp.primaryLabel = 'DataForSEO Google SERP';
      run.serp.organic = r.organic.slice(0, top).map((x) => ({ ...x, domain: domainOf(x.url) }));
      run.serp.features = r.features;
      for (const a of r.ads) run.serp.ads.push({ engine: 'Google (DataForSEO)', ...a });
    } catch (err) {
      run.unknowns.push(`Paid SERP fallback failed: ${err.message}`);
    }
  } else if (budgetUsd <= 0) run.unknowns.push('No usable free SERP: paid fallback skipped because budget is 0. Search in a browser and re-run with --serp-html <saved page> or --serp-urls <url list>');
  for (const e of run.serp.engines) delete e.organic;

  // 2. Ranking pages (skip the target itself; it is crawled separately)
  const robotsCache = new Map();
  const robotsFor = async (origin) => {
    if (!robotsCache.has(origin)) {
      const r = await get(`${origin}/robots.txt`, 'robots');
      robotsCache.set(origin, { fetch: r, parsed: parseRobots(r.ok ? r.body : '') });
    }
    return robotsCache.get(origin);
  };
  const competitorPages = [];
  for (const r of run.serp.organic.filter((x) => x.domain !== target && !x.domain.endsWith(`.${target}`))) {
    log(`page: ${r.url}`);
    const c = { position: r.position, url: r.url, domain: r.domain };
    const origin = new URL(r.url).origin;
    const robots = await robotsFor(origin);
    c.robots = { status: robots.fetch.status, sitemaps: robots.parsed.sitemaps };
    if (!isAllowed(robots.parsed, 'seo-rea', r.url)) {
      c.error = 'disallowed by robots.txt';
      c.evidenceId = (await ev.add({ source: `robots-${r.domain}`, url: `${origin}/robots.txt`, ext: 'txt', content: robots.fetch.body, fetchedAt: robots.fetch.fetchedAt, note: 'page not fetched: disallowed' })).id;
    } else {
      const res = await get(r.url);
      if (!isHtml(res)) {
        c.error = res.error || `HTTP ${res.status} ${res.contentType ?? ''}`.trim();
        c.evidenceId = (await ev.add({ source: `page-${r.domain}`, url: r.url, ext: 'txt', content: `fetch failed: ${c.error}`, fetchedAt: res.fetchedAt, note: c.error })).id;
      } else {
        const page = parsePage(res.body, res.finalUrl || r.url);
        competitorPages.push(page);
        c.page = summarizePage(page);
        c.evidenceId = (await ev.add({ source: `page-${r.domain}`, url: r.url, ext: 'html', content: res.body, fetchedAt: res.fetchedAt, fromCache: res.fromCache, note: `#${r.position}; ${page.wordCount} words` })).id;
      }
    }
    run.competitors.push(c);
  }
  if (run.competitors.length) {
    await ev.add({ source: 'competitor-pages-parsed', note: 'parsed on-page facts for every ranking page', content: run.competitors });
  }

  // 3. Target: homepage, robots, sitemap, small crawl
  log(`target: ${target}`);
  const tOrigin = `https://${target}`;
  const tRobots = await robotsFor(tOrigin);
  run.target.robotsEvidenceId = (await ev.add({ source: `robots-${target}`, url: `${tOrigin}/robots.txt`, ext: 'txt', content: tRobots.fetch.ok ? tRobots.fetch.body : `fetch failed: ${tRobots.fetch.error || tRobots.fetch.status}`, fetchedAt: tRobots.fetch.fetchedAt, fromCache: tRobots.fetch.fromCache, note: tRobots.fetch.ok ? `${tRobots.parsed.sitemaps.length} sitemap line(s)` : 'no robots.txt' })).id;
  run.target.robotsBlocksRoot = tRobots.fetch.ok && !isAllowed(tRobots.parsed, '*', `${tOrigin}/`);

  const sitemapUrls = [];
  const sitemapSources = [];
  const queue = tRobots.parsed.sitemaps.length ? [...tRobots.parsed.sitemaps] : [`${tOrigin}/sitemap.xml`];
  for (let i = 0; i < queue.length && i < 5; i++) {
    const r = await get(queue[i], 'sitemap');
    if (!r.ok) continue;
    const sm = parseSitemap(r.body);
    sitemapSources.push({ url: queue[i], kind: sm.kind, locs: sm.locs.length });
    if (sm.kind === 'index') queue.push(...sm.locs);
    else sitemapUrls.push(...sm.locs);
  }
  run.target.sitemap = { urlCount: sitemapUrls.length, sources: sitemapSources };
  run.target.sitemap.evidenceId = (await ev.add({ source: `sitemap-${target}`, url: queue[0], note: `${sitemapUrls.length} URLs`, content: { sources: sitemapSources, urls: sitemapUrls } })).id;

  const targetPages = [];
  const home = await get(`${tOrigin}/`);
  if (isHtml(home)) {
    const page = parsePage(home.body, home.finalUrl || `${tOrigin}/`);
    targetPages.push(page);
    run.target.homeEvidenceId = (await ev.add({ source: `target-home-${target}`, url: `${tOrigin}/`, ext: 'html', content: home.body, fetchedAt: home.fetchedAt, fromCache: home.fromCache, note: `${page.wordCount} words` })).id;
    const crawlLimit = opts.crawl ?? 10;
    const seen = new Set([new URL(page.url).pathname]);
    const candidates = [...sitemapUrls, ...page.internalLinks.map((l) => l.href)];
    for (const u of candidates) {
      if (targetPages.length >= crawlLimit) break;
      let parsed;
      try {
        parsed = new URL(u);
      } catch {
        continue;
      }
      if (domainOf(u) !== target || seen.has(parsed.pathname) || /\.(pdf|png|jpe?g|gif|svg|webp|zip|xml|json)$/i.test(parsed.pathname)) continue;
      seen.add(parsed.pathname);
      if (!isAllowed(tRobots.parsed, 'seo-rea', u)) continue;
      const r = await get(u);
      if (isHtml(r)) targetPages.push(parsePage(r.body, r.finalUrl || u));
    }
  } else {
    run.target.error = home.error || `HTTP ${home.status}`;
    run.target.homeEvidenceId = (await ev.add({ source: `target-home-${target}`, url: `${tOrigin}/`, ext: 'txt', content: `fetch failed: ${run.target.error}`, fetchedAt: home.fetchedAt, note: run.target.error })).id;
  }
  run.target.pages = targetPages.map(summarizePage);
  run.target.schemaTypes = [...new Set(targetPages.flatMap((p) => p.schemaTypes))].sort();
  run.target.inlinks = inlinkCounts(targetPages);
  run.target.topKeywords = topKeywords(targetPages);
  run.target.crawlEvidenceId = (await ev.add({ source: `target-crawl-${target}`, url: tOrigin, note: `${targetPages.length} pages parsed`, content: { pages: run.target.pages, inlinks: run.target.inlinks } })).id;

  // 4. Keyword gap (free), plus paid ranked keywords when budget allows
  run.keywordGap = keywordGap(competitorPages, targetPages).map(({ urls, ...k }) => k);
  if (run.keywordGap.length) await ev.add({ source: 'keyword-gap', note: `${run.keywordGap.length} phrases`, content: run.keywordGap });
  run.paidKeywords = [];
  if (budgetUsd > 0) {
    for (const domain of [target, ...new Set(run.competitors.map((c) => c.domain))].slice(0, 4)) {
      try {
        const r = await dfs.rankedKeywords(domain);
        const e = await ev.add({ source: `dataforseo-ranked-${domain}`, kind: 'api', url: 'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', content: r.data, costUsd: r.costUsd, fromCache: r.fromCache, note: `${r.keywords.length} keywords` });
        run.paidKeywords.push({ domain, keywords: r.keywords, evidenceId: e.id });
      } catch (err) {
        run.unknowns.push(`Paid ranked keywords for ${domain} skipped: ${err.message}`);
        if (err instanceof BudgetError) break;
      }
    }
  } else run.unknowns.push('Paid keyword data (volume, ranked keywords) skipped: budget is 0');

  // 5. Ad libraries: manual-check evidence
  const advertisers = [target, ...new Set(run.competitors.map((c) => c.domain))].slice(0, 4);
  for (const domain of advertisers) {
    for (const l of adLibraryLookups(domain)) {
      const e = await ev.add({ source: `adlib-${l.platform}-${domain}`, kind: 'manual-check', url: l.url, note: 'open in a browser; not fetched', content: { domain, platform: l.platform, url: l.url, status: 'manual-check required' } });
      run.ads.push({ domain, platform: l.platform, url: l.url, evidenceId: e.id });
    }
  }

  run.spentUsd = (await dfs.spent()).run;
  run.finished = true;
  run.userAgent = USER_AGENT;
  return writeReports(out, run, ev);
}

/** Load citations from the evidence store and (re)write report files. */
export async function writeReports(out, run, ev) {
  run.citations = [];
  for (const item of ev.items.filter((e) => e.kind === 'citation')) {
    try {
      const c = JSON.parse(await readFile(join(ev.dir, item.file), 'utf8'));
      run.citations.push({ ...c, targetCited: c.domains.some((d) => d === run.target.domain || d.endsWith(`.${run.target.domain}`)), evidenceId: item.id });
    } catch {
      // skip unreadable evidence
    }
  }
  const claims = buildClaims(run);
  const playbook = buildPlaybook(run);
  await writeFile(join(out, 'data', 'run.json'), JSON.stringify(run, null, 2));
  await writeFile(join(out, 'report', 'ledger.md'), renderLedger(run, claims));
  await writeFile(join(out, 'report', 'questions.md'), renderQuestions(run));
  await writeFile(join(out, 'report', 'teardown.md'), renderTeardown(run, claims, playbook));
  return { run, claims, playbook };
}
