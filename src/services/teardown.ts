// Teardown pipeline: SERP -> ranking pages -> target site -> AI readiness ->
// keyword gap -> ad libraries -> reports. Free sources first; paid only with
// a budget above 0.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BudgetError, BudgetGuard } from "../core/budget.js";
import { EvidenceStore } from "../core/evidence.js";
import { ROBOTS_TOKEN, USER_AGENT } from "../core/http.js";
import type { CompetitorCard, TeardownRun } from "../core/run.js";
import type { AdapterContext, EngineName, Logger, SerpAttempt } from "../core/types.js";
import { domainOf, errorMessage, isDomainOrSub, normalizeDomain, runIdFrom } from "../core/util.js";
import { VERSION } from "../version.js";
import { adLibraryUrlAdapter, createAdLibraryCaptureAdapter, pickAdvertisers } from "../adapters/adlib.js";
import { DataForSEO } from "../adapters/dataforseo.js";
import { keywordGap, topKeywords } from "../adapters/keywords.js";
import { crawlCandidates, inlinkCounts } from "../adapters/links.js";
import { pageAdapter, summarizePage, type ParsedPage } from "../adapters/page.js";
import {
  createPlaywrightSerpAdapter,
  htmlSerpAdapter,
  savedFileSerpAdapter,
  urlListSerpAdapter,
  type SerpFetch,
} from "../adapters/serp.js";
import { isAllowed, parseRobots, type Robots } from "../adapters/site.js";
import { writeTeardownReports } from "./reports.js";
import { collectAiReadiness, collectSite } from "./collect.js";
import { createRuntime, type Runtime } from "./runtime.js";

export interface TeardownOptions {
  keyword: string;
  target: string;
  out: string;
  budgetUsd?: number;
  monthlyCapUsd?: number;
  top?: number;
  crawl?: number;
  engines?: EngineName[];
  browser?: boolean;
  serpHtml?: string[];
  serpUrls?: string[];
  delayMs?: number;
  /** Offline tests only. */
  minSearchDelayMs?: number;
  cacheDir?: string;
  ledgerPath?: string;
  noCache?: boolean;
  force?: boolean;
  psi?: boolean;
  lighthouse?: boolean;
  adlibCapture?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Logger;
}

async function prepareOut(out: string, force: boolean): Promise<void> {
  if (force) {
    for (const d of ["evidence", "report", "data"]) await rm(join(out, d), { recursive: true, force: true });
  } else {
    try {
      await readFile(join(out, "data", "run.json"));
      throw new Error(
        `${out} already has a run. Use --force to replace it (deletes evidence/, report/, data/ in that folder).`,
      );
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  await mkdir(join(out, "report"), { recursive: true });
  await mkdir(join(out, "data"), { recursive: true });
}

function emptyRun(keyword: string, target: string, runId: string, now: Date, budgetUsd: number): TeardownRun {
  return {
    tool: "seo-rea",
    version: VERSION,
    runId,
    keyword,
    createdAt: now.toISOString(),
    budgetUsd,
    spentUsd: 0,
    userAgent: USER_AGENT,
    browserUserAgent: "",
    serp: { attempts: [], notes: [], organic: [], ads: [], primary: "", primaryLabel: "", parsedEvidenceId: "" },
    competitors: [],
    target: {
      domain: target,
      origin: `https://${target}`,
      robotsEvidenceId: "",
      robotsFound: false,
      robotsBlocksRoot: false,
      sitemap: { urlCount: 0, sources: [], evidenceId: "" },
      pages: [],
      schemaTypes: [],
      inlinks: [],
      topKeywords: [],
      homeEvidenceId: "",
      crawlEvidenceId: "",
    },
    aiReadiness: null,
    keywordGap: [],
    paidKeywords: [],
    ads: [],
    citations: [],
    unknowns: [],
    finished: false,
  };
}

/** Write evidence for one SERP attempt and return its record. */
async function recordAttempt(f: SerpFetch, ev: EvidenceStore): Promise<SerpAttempt> {
  const j = f.judgement;
  const isList = f.adapter === "serp-urls";
  const e = await ev.add({
    source: `${f.adapter}-${f.engine}`,
    kind: f.adapter === "serp-urls" || f.adapter === "serp-file" ? "manual" : "observed",
    // Block pages redirect to URLs whose tokens can encode the caller's IP; keep the requested URL.
    url: j.problem ? f.url : f.finalUrl || f.url,
    ext: isList ? "json" : "html",
    content: f.body || `<!-- no body: ${j.problem} -->`,
    fetchedAt: f.fetchedAt,
    fromCache: f.fromCache,
    note:
      j.problem ||
      `${j.parsed.organic.length} organic, ${j.parsed.ads.length} ads, relevance ${Math.round(j.relevance * 100)}%`,
  });
  if (f.screenshot) {
    await ev.add({
      source: `${f.adapter}-${f.engine}-screenshot`,
      url: f.url,
      ext: "png",
      content: f.screenshot,
      fetchedAt: f.fetchedAt,
      note: `screenshot for ${e.id}`,
    });
  }
  return {
    adapter: f.adapter,
    engine: f.engine,
    label: f.label,
    status: f.status,
    fromCache: f.fromCache,
    problem: j.problem,
    relevance: j.relevance,
    organicCount: j.problem ? 0 : j.parsed.organic.length,
    adCount: j.parsed.ads.length,
    evidenceId: e.id,
    consent: f.consent,
  };
}

async function collectSerp(
  o: Required<Pick<TeardownOptions, "keyword" | "engines" | "serpHtml" | "serpUrls">>,
  rt: Runtime,
  run: TeardownRun,
  ev: EvidenceStore,
): Promise<SerpFetch[]> {
  const { ctx } = rt;
  const fetches: SerpFetch[] = [];
  if (o.serpHtml.length)
    fetches.push(...(await savedFileSerpAdapter.run({ files: o.serpHtml, keyword: o.keyword }, ctx)));
  if (o.serpUrls.length) fetches.push(...(await urlListSerpAdapter.run({ urls: o.serpUrls }, ctx)));
  if (o.engines.length) {
    const ready = await rt.browserReady();
    let ok = false;
    if (ready.ok) {
      const browserRuns = await createPlaywrightSerpAdapter(rt.session, rt.limiter).run(
        { keyword: o.keyword, engines: o.engines },
        ctx,
      );
      fetches.push(...browserRuns);
      ok = browserRuns.some((f) => !f.judgement.problem);
      run.browserUserAgent = rt.session.userAgent;
    } else {
      run.serp.notes.push(`Headless browser path skipped: ${ready.reason}`);
    }
    if (!ok) {
      if (ready.ok)
        run.serp.notes.push("Every headless-browser engine was blocked or degraded; fell back to plain HTML engines.");
      fetches.push(...(await htmlSerpAdapter.run({ keyword: o.keyword, engines: o.engines }, ctx)));
    }
  } else run.serp.notes.push("Live search engines skipped (--engines none).");
  for (const f of fetches) run.serp.attempts.push(await recordAttempt(f, ev));
  return fetches;
}

async function paidSerpFallback(dfs: DataForSEO, run: TeardownRun, ev: EvidenceStore, top: number): Promise<void> {
  try {
    const r = await dfs.serp(run.keyword);
    const e = await ev.add({
      source: "dataforseo-serp",
      kind: "api",
      url: "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
      content: r.data,
      costUsd: r.costUsd,
      fromCache: r.fromCache,
      note: `${r.organic.length} organic`,
    });
    run.serp.attempts.push({
      adapter: "dataforseo",
      engine: "google",
      label: "DataForSEO Google SERP (paid)",
      status: 200,
      fromCache: r.fromCache,
      problem: "",
      relevance: 1,
      organicCount: r.organic.length,
      adCount: r.ads.length,
      evidenceId: e.id,
    });
    run.serp.primary = "dataforseo";
    run.serp.primaryLabel = "DataForSEO Google SERP (paid)";
    run.serp.organic = r.organic.slice(0, top).map((x) => ({ ...x, domain: domainOf(x.url) }));
    run.serp.features = r.features;
    for (const a of r.ads) run.serp.ads.push({ engine: "Google (DataForSEO)", ...a });
  } catch (err) {
    run.unknowns.push(`Paid SERP fallback ${err instanceof BudgetError ? "refused" : "failed"}: ${errorMessage(err)}`);
  }
}

async function analyseCompetitors(run: TeardownRun, ctx: AdapterContext, ev: EvidenceStore): Promise<ParsedPage[]> {
  const robotsByOrigin = new Map<string, { status: number; robots: Robots; body: string; fetchedAt: string }>();
  const pages: ParsedPage[] = [];
  for (const r of run.serp.organic.filter((x) => !isDomainOrSub(x.domain, run.target.domain))) {
    ctx.log(`page: ${r.url}`);
    const c: CompetitorCard = { position: r.position, url: r.url, domain: r.domain, evidenceId: "" };
    const origin = new URL(r.url).origin;
    if (!robotsByOrigin.has(origin)) {
      const rr = await ctx.fetch(`${origin}/robots.txt`, { source: "robots", ttlMs: 30 * 86400000 });
      const body = rr.ok && !/<html/i.test(rr.body) ? rr.body : "";
      robotsByOrigin.set(origin, { status: rr.status, robots: parseRobots(body), body, fetchedAt: rr.fetchedAt });
    }
    const rb = robotsByOrigin.get(origin) as { status: number; robots: Robots; body: string; fetchedAt: string };
    c.robots = { status: rb.status, sitemaps: rb.robots.sitemaps };
    if (!isAllowed(rb.robots, ROBOTS_TOKEN, r.url)) {
      c.error = "disallowed by robots.txt";
      c.evidenceId = (
        await ev.add({
          source: `robots-${r.domain}`,
          url: `${origin}/robots.txt`,
          ext: "txt",
          content: rb.body,
          fetchedAt: rb.fetchedAt,
          note: "page not fetched: disallowed",
        })
      ).id;
    } else {
      const res = await pageAdapter.run(r.url, ctx);
      if (!res.page) {
        c.error = res.error;
        c.evidenceId = (
          await ev.add({
            source: `page-${r.domain}`,
            url: r.url,
            ext: "txt",
            content: `fetch failed: ${res.error}`,
            fetchedAt: res.fetchedAt,
            note: res.error,
          })
        ).id;
      } else {
        pages.push(res.page);
        c.page = summarizePage(res.page);
        c.evidenceId = (
          await ev.add({
            source: `page-${r.domain}`,
            url: r.url,
            ext: "html",
            content: res.html,
            fetchedAt: res.fetchedAt,
            fromCache: res.fromCache,
            note: `#${r.position}; ${res.page.wordCount} words`,
          })
        ).id;
      }
    }
    run.competitors.push(c);
  }
  if (run.competitors.length) {
    await ev.add({
      source: "competitor-pages-parsed",
      kind: "derived",
      note: "parsed on-page facts and schema validation for every ranking page",
      content: run.competitors,
    });
  }
  return pages;
}

async function analyseTarget(
  run: TeardownRun,
  rt: Runtime,
  ev: EvidenceStore,
  crawl: number,
  opts: TeardownOptions,
): Promise<ParsedPage[]> {
  const { ctx } = rt;
  const t = run.target.domain;
  ctx.log(`target: ${t}`);
  const site = await collectSite(t, ctx, ev);
  Object.assign(run.target, site.summary);
  const pages: ParsedPage[] = [];
  const homeUrl = `${run.target.origin}/`;
  const home = await pageAdapter.run(homeUrl, ctx);
  if (home.page) {
    pages.push(home.page);
    run.target.homeEvidenceId = (
      await ev.add({
        source: `target-home-${t}`,
        url: homeUrl,
        ext: "html",
        content: home.html,
        fetchedAt: home.fetchedAt,
        fromCache: home.fromCache,
        note: `${home.page.wordCount} words`,
      })
    ).id;
    const seen = new Set([new URL(home.page.url).pathname]);
    for (const u of crawlCandidates(t, site.files.sitemapUrls, home.page.internalLinks, seen)) {
      if (pages.length >= crawl) break;
      if (!isAllowed(site.files.robots, ROBOTS_TOKEN, u)) continue;
      const r = await pageAdapter.run(u, ctx);
      if (r.page) pages.push(r.page);
    }
  } else {
    run.target.error = home.error;
    run.target.homeEvidenceId = (
      await ev.add({
        source: `target-home-${t}`,
        url: homeUrl,
        ext: "txt",
        content: `fetch failed: ${home.error}`,
        fetchedAt: home.fetchedAt,
        note: home.error,
      })
    ).id;
  }
  run.target.pages = pages.map(summarizePage);
  run.target.schemaTypes = [...new Set(pages.flatMap((p) => p.schemaTypes))].toSorted();
  run.target.inlinks = inlinkCounts(pages);
  run.target.topKeywords = topKeywords(pages);
  run.target.crawlEvidenceId = (
    await ev.add({
      source: `target-crawl-${t}`,
      kind: "derived",
      url: run.target.origin,
      note: `${pages.length} pages parsed`,
      content: { pages: run.target.pages, inlinks: run.target.inlinks },
    })
  ).id;
  const ai = await collectAiReadiness(site.files, homeUrl, ctx, ev, {
    psi: opts.psi ?? true,
    lighthouse: opts.lighthouse ?? false,
  });
  run.aiReadiness = ai.summary;
  run.unknowns.push(...ai.unknowns);
  return pages;
}

async function collectAds(run: TeardownRun, rt: Runtime, ev: EvidenceStore, capture: boolean): Promise<void> {
  const ready = capture ? await rt.browserReady() : { ok: false, reason: "not requested (use --adlib-capture)" };
  const adapter = ready.ok ? createAdLibraryCaptureAdapter(rt.session, rt.limiter) : adLibraryUrlAdapter;
  if (capture && !ready.ok) run.unknowns.push(`Ad-library capture skipped: ${ready.reason}`);
  const advertisers = pickAdvertisers(
    run.target.domain,
    run.competitors.map((c) => c.url),
  );
  for (const a of await adapter.run({ advertisers }, rt.ctx)) {
    const { screenshot, ...data } = a;
    const shot = screenshot
      ? await ev.add({
          source: `adlib-${a.platform}-${a.brand}-screenshot`,
          url: a.url,
          ext: "png",
          content: screenshot,
          note: "ad-library screenshot",
        })
      : null;
    const e = await ev.add({
      source: `adlib-${a.platform}-${a.brand}`,
      kind: a.status === "captured" ? "observed" : "manual-check",
      url: a.url,
      note: a.note,
      content: { ...data, screenshotEvidenceId: shot?.id ?? null },
    });
    run.ads.push({
      domain: a.domain,
      brand: a.brand,
      platform: a.platform,
      url: a.url,
      status: a.status,
      visibleCount: a.visibleCount,
      note: a.note,
      evidenceId: e.id,
      ...(shot ? { screenshotEvidenceId: shot.id } : {}),
    });
  }
}

export async function runTeardown(opts: TeardownOptions): Promise<Awaited<ReturnType<typeof writeTeardownReports>>> {
  const now = opts.now ?? (() => new Date());
  const keyword = opts.keyword.trim();
  const target = normalizeDomain(opts.target);
  if (!keyword || !target) throw new Error("keyword and target are required");
  const out = resolve(opts.out);
  const top = opts.top ?? 8;
  const budgetUsd = Number(opts.budgetUsd ?? 0);
  const runId = runIdFrom(now());
  await prepareOut(out, opts.force ?? false);

  const rt = createRuntime({ ...opts, now, ...(opts.log ? { log: opts.log } : {}) });
  try {
    const ev = await new EvidenceStore(out, { now }).load();
    const guard = new BudgetGuard(
      { runCapUsd: budgetUsd, monthlyCapUsd: opts.monthlyCapUsd ?? Infinity },
      resolve(opts.ledgerPath ?? ".seo-rea/ledger.csv"),
      runId,
      now,
    );
    const dfs = new DataForSEO(guard, rt.cache, rt.ctx.env, opts.fetchImpl ?? fetch);
    const run = emptyRun(keyword, target, runId, now(), budgetUsd);

    // 1. SERP
    const fetches = await collectSerp(
      {
        keyword,
        engines: opts.engines ?? ["google", "bing", "duckduckgo"],
        serpHtml: opts.serpHtml ?? [],
        serpUrls: opts.serpUrls ?? [],
      },
      rt,
      run,
      ev,
    );
    const primaryIdx = fetches.findIndex((f) => !f.judgement.problem);
    const primary = fetches[primaryIdx];
    if (primary) {
      run.serp.primary = primary.adapter;
      run.serp.primaryLabel = primary.label;
      run.serp.organic = primary.judgement.parsed.organic.slice(0, top).map((r) => ({ ...r, domain: domainOf(r.url) }));
    } else if (dfs.enabled) await paidSerpFallback(dfs, run, ev, top);
    else if (budgetUsd <= 0)
      run.unknowns.push(
        "No usable free SERP; paid fallback refused because budget is 0. Search in a browser and re-run with --serp-html <saved page> or --serp-urls <url list>.",
      );
    for (const f of fetches) for (const a of f.judgement.parsed.ads) run.serp.ads.push({ engine: f.label, ...a });
    run.serp.parsedEvidenceId = (
      await ev.add({
        source: "serp-parsed",
        kind: "derived",
        note: `primary: ${run.serp.primaryLabel || "none"}`,
        content: { attempts: run.serp.attempts, notes: run.serp.notes, organic: run.serp.organic, ads: run.serp.ads },
      })
    ).id;

    // 2-3. Ranking pages, target site and AI readiness
    const competitorPages = await analyseCompetitors(run, rt.ctx, ev);
    const targetPages = await analyseTarget(run, rt, ev, opts.crawl ?? 10, opts);

    // 4. Keyword gap (free), plus paid ranked keywords when budget allows
    run.keywordGap = keywordGap(competitorPages, targetPages).map(({ urls: _u, ...k }) => k);
    if (run.keywordGap.length)
      await ev.add({
        source: "keyword-gap",
        kind: "derived",
        note: `${run.keywordGap.length} phrases (n-grams, TF-IDF)`,
        content: run.keywordGap,
      });
    if (dfs.enabled) {
      for (const domain of [target, ...new Set(run.competitors.map((c) => c.domain))].slice(0, 4)) {
        try {
          const r = await dfs.rankedKeywords(domain);
          const e = await ev.add({
            source: `dataforseo-ranked-${domain}`,
            kind: "api",
            url: "https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live",
            content: r.data,
            costUsd: r.costUsd,
            fromCache: r.fromCache,
            note: `${r.keywords.length} keywords`,
          });
          run.paidKeywords.push({ domain, keywords: r.keywords, evidenceId: e.id });
        } catch (err) {
          run.unknowns.push(`Paid ranked keywords for ${domain} skipped: ${errorMessage(err)}`);
          if (err instanceof BudgetError) break;
        }
      }
    } else
      run.unknowns.push(
        budgetUsd <= 0
          ? "Paid keyword data (volume, ranked keywords) skipped: budget is 0"
          : "Paid keyword data skipped: DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD not set",
      );

    // 5. Ad libraries
    await collectAds(run, rt, ev, opts.adlibCapture ?? false);

    run.spentUsd = (await guard.spent()).run;
    run.finished = true;
    await writeFile(join(out, "data", "run.json"), JSON.stringify(run, null, 2));
    return await writeTeardownReports(out, run, ev);
  } finally {
    await rt.close();
  }
}
