// Strategy pipeline: profile the domain (and --vs domain), check SERPs for
// their head terms and brands, then build report/strategy.json and
// strategy.md. Free sources only unless the budget is above 0.

import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BudgetError, BudgetGuard } from "../core/budget.js";
import { EvidenceStore } from "../core/evidence.js";
import { renderStrategy } from "../core/report/strategy.js";
import { buildStrategy } from "../core/strategy/build.js";
import { validateStrategy, type Strategy } from "../core/strategy/schema.js";
import type { SerpCheck, StrategyRun } from "../core/strategy/types.js";
import type { EngineName, Logger } from "../core/types.js";
import { domainOf, errorMessage, normalizeDomain, runIdFrom } from "../core/util.js";
import { VERSION } from "../version.js";
import { DataForSEO } from "../adapters/dataforseo.js";
import { createPlaywrightSerpAdapter, htmlSerpAdapter, type SerpFetch } from "../adapters/serp.js";
import { createRuntime, type Runtime } from "./runtime.js";
import { collectSiteProfile } from "./strategy-site.js";
import { prepareOut, recordAttempt } from "./teardown.js";

export interface StrategyOptions {
  domain: string;
  vs?: string | null;
  out: string;
  budgetUsd?: number;
  monthlyCapUsd?: number;
  /** Pages fetched per site (default 30). */
  crawl?: number;
  /** Head terms checked in SERPs (default 10, split between the two sites with --vs). */
  terms?: number;
  engines?: EngineName[];
  browser?: boolean;
  psi?: boolean;
  lighthouse?: boolean;
  adlibCapture?: boolean;
  delayMs?: number;
  /** Offline tests only. */
  minSearchDelayMs?: number;
  cacheDir?: string;
  ledgerPath?: string;
  noCache?: boolean;
  force?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Logger;
}

/** Engines whose answer was a block page are not asked again in this run. */
const HARD_BLOCK = /captcha|unusual traffic|blocked|sorry|anomaly|HTTP 429|HTTP 403|consent/i;

interface Query {
  term: string;
  kind: SerpCheck["kind"];
  from: string;
}

async function checkSerps(
  queries: Query[],
  engines: EngineName[],
  rt: Runtime,
  ev: EvidenceStore,
  dfs: DataForSEO,
  notes: string[],
  unknowns: string[],
): Promise<SerpCheck[]> {
  const out: SerpCheck[] = [];
  let browserEngines = [...engines];
  let htmlEngines = [...engines];
  const ready = engines.length ? await rt.browserReady() : { ok: false, reason: "--engines none" };
  if (!ready.ok) notes.push(`Headless browser SERPs skipped: ${ready.reason}`);
  let paidRefused = false;
  for (const q of queries) {
    rt.ctx.log(`serp: "${q.term}"`);
    const fetches: SerpFetch[] = [];
    if (ready.ok && browserEngines.length)
      fetches.push(
        ...(await createPlaywrightSerpAdapter(rt.session, rt.limiter).run(
          { keyword: q.term, engines: browserEngines },
          rt.ctx,
        )),
      );
    if (!fetches.some((f) => !f.judgement.problem) && htmlEngines.length)
      fetches.push(...(await htmlSerpAdapter.run({ keyword: q.term, engines: htmlEngines }, rt.ctx)));
    const attempts = [];
    for (const f of fetches) attempts.push({ f, a: await recordAttempt(f, ev) });
    for (const { f } of attempts.filter((x) => HARD_BLOCK.test(x.f.judgement.problem))) {
      const list = f.adapter === "serp-playwright" ? browserEngines : htmlEngines;
      if (list.includes(f.engine as EngineName)) {
        notes.push(
          `${f.label} blocked on "${q.term}" (${f.judgement.problem.slice(0, 80)}); not asked again this run.`,
        );
        if (f.adapter === "serp-playwright") browserEngines = list.filter((e) => e !== f.engine);
        else htmlEngines = list.filter((e) => e !== f.engine);
      }
    }
    const good = attempts.find(({ f }) => !f.judgement.problem);
    if (good) {
      out.push({
        ...q,
        engine: good.f.label,
        problem: "",
        evidenceId: good.a.evidenceId,
        organic: good.f.judgement.parsed.organic.map((r) => ({ ...r, domain: domainOf(r.url) })),
        ads: good.f.judgement.parsed.ads.map((a) => ({ url: a.url, domain: domainOf(a.url), title: a.title })),
      });
      continue;
    }
    if (dfs.enabled && !paidRefused) {
      try {
        const r = await dfs.serp(q.term);
        const e = await ev.add({
          source: "dataforseo-serp",
          kind: "api",
          url: "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
          content: r.data,
          costUsd: r.costUsd,
          fromCache: r.fromCache,
          note: `"${q.term}": ${r.organic.length} organic`,
        });
        out.push({
          ...q,
          engine: "DataForSEO Google SERP (paid)",
          problem: "",
          evidenceId: e.id,
          organic: r.organic.map((x) => ({ ...x, domain: domainOf(x.url) })),
          ads: r.ads.map((a) => ({ url: a.url, domain: domainOf(a.url), title: a.title })),
        });
        continue;
      } catch (err) {
        if (err instanceof BudgetError) paidRefused = true;
        unknowns.push(
          `Paid SERP for "${q.term}" ${err instanceof BudgetError ? "refused" : "failed"}: ${errorMessage(err)}`,
        );
      }
    }
    const last = attempts.at(-1);
    out.push({
      ...q,
      engine: last?.f.label ?? "none",
      problem: last?.f.judgement.problem || "no engine available",
      evidenceId: last?.a.evidenceId ?? "",
      organic: [],
      ads: [],
    });
  }
  return out;
}

/** Head terms to check: all from the subject, or a 6/4 split with --vs; plus one brand query per site. */
export function planQueries(
  sites: Array<{ domain: string; brand: string; terms: Array<{ term: string }> }>,
  total: number,
): Query[] {
  const [a, b] = sites;
  const qs: Query[] = [];
  const seen = new Set<string>();
  const take = (s: (typeof sites)[number] | undefined, n: number): void => {
    if (!s) return;
    let k = 0;
    for (const t of s.terms) {
      if (k >= n) break;
      if (seen.has(t.term)) continue;
      seen.add(t.term);
      qs.push({ term: t.term, kind: "head-term", from: s.domain });
      k++;
    }
  };
  if (b) {
    const first = Math.ceil(total * 0.6);
    take(a, first);
    take(b, total - first);
  } else take(a, total);
  for (const s of sites) if (s.brand) qs.push({ term: s.brand, kind: "brand", from: s.domain });
  return qs;
}

export interface StrategyResult {
  run: StrategyRun;
  strategy: Strategy;
  reportPath: string;
}

export async function runStrategy(opts: StrategyOptions): Promise<StrategyResult> {
  const now = opts.now ?? (() => new Date());
  const domain = normalizeDomain(opts.domain);
  const vs = opts.vs ? normalizeDomain(opts.vs) : null;
  if (!domain) throw new Error("a domain is required");
  if (vs === domain) throw new Error("--vs must be a different domain");
  const out = resolve(opts.out);
  const budgetUsd = Number(opts.budgetUsd ?? 0);
  const runId = runIdFrom(now());
  await prepareOut(out, opts.force ?? false, "strategy-run.json");
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
    const run: StrategyRun = {
      tool: "seo-rea",
      version: VERSION,
      runId,
      createdAt: now().toISOString(),
      budgetUsd,
      spentUsd: 0,
      subject: domain,
      vs,
      sites: [],
      serps: [],
      serpNotes: [],
      unknowns: [],
    };
    const collect = {
      crawl: Math.max(1, opts.crawl ?? 30),
      mapCap: 200,
      terms: Math.max(opts.terms ?? 10, 1),
      psi: opts.psi ?? true,
      lighthouse: opts.lighthouse ?? false,
      adlibCapture: opts.adlibCapture ?? false,
    };
    for (const d of vs ? [domain, vs] : [domain]) {
      const r = await collectSiteProfile(d, rt, ev, collect);
      run.sites.push(r.profile);
      run.unknowns.push(...r.unknowns);
    }
    const queries = planQueries(run.sites, collect.terms);
    run.serps = await checkSerps(
      queries,
      opts.engines ?? ["google", "bing", "duckduckgo"],
      rt,
      ev,
      dfs,
      run.serpNotes,
      run.unknowns,
    );
    await ev.add({
      source: "strategy-serps",
      kind: "derived",
      note: `${run.serps.filter((s) => !s.problem).length}/${run.serps.length} SERP checks usable`,
      content: { notes: run.serpNotes, checks: run.serps },
    });
    if (!dfs.enabled)
      run.unknowns.push(
        budgetUsd <= 0
          ? "Paid data (search volume, backlinks, paid SERP fallback) skipped: budget is 0"
          : "Paid data skipped: DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD not set",
      );
    run.spentUsd = (await guard.spent()).run;
    await writeFile(join(out, "data", "strategy-run.json"), JSON.stringify(run, null, 2));
    const strategy = validateStrategy(buildStrategy(run, now()));
    await writeFile(join(out, "report", "strategy.json"), `${JSON.stringify(strategy, null, 2)}\n`);
    const reportPath = join(out, "report", "strategy.md");
    await writeFile(reportPath, renderStrategy(strategy));
    return { run, strategy, reportPath };
  } finally {
    await rt.close();
  }
}
