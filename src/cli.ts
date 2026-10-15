#!/usr/bin/env node
// seo-rea CLI: strategy (also the bare `seo-rea <domain>`), teardown, audit, batch, cite, mcp, doctor.

import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { EngineName } from "./core/types.js";
import { normalizeDomain, parseUrlList } from "./core/util.js";
import { toErrorPayload } from "./core/errors.js";
import { DOMAIN_LIKE, UsageError, num } from "./cli-args.js";
import { parseCrawl, type CrawlCli } from "./cli-crawl.js";
import { VERSION } from "./version.js";
import { AI_ENGINES } from "./adapters/cite.js";
import { isEngineName } from "./adapters/serp.js";

export const HELP = `seo-rea ${VERSION} - reverse engineer why pages rank (evidence first, free first)

Usage:
  seo-rea <domain> [--vs <domain>] [--out <dir>] [--budget-usd 0] [options] [--json]
  seo-rea strategy <domain> [--vs <domain>] ...   Same as above: why a site leads (Strategy Dossier)
  seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [options] [--json]
  seo-rea crawl <domain> [--out <dir>] [--max-pages 500] [--max-depth 10] [--delay-ms 500] [--force] [--json]
  seo-rea audit <domain|url> [--out <dir>] [--no-psi] [--lighthouse] [--json]
  seo-rea batch --sites <file.json|file.csv> [--out <dir>] [--site-delay-ms <n>] [options] [--json]
  seo-rea cite --out <dir> --engine <${AI_ENGINES.join("|")}>
               --prompt "<prompt>" --urls "<url1,url2,...>" [--note "<text>"]
  seo-rea mcp                       Start the MCP server on stdio
  seo-rea doctor [--json]           Show which optional adapters are available
  seo-rea --version | help

Teardown options:
  --budget-usd <n>       Paid API cap for this run (default 0 = paid calls refused)
  --monthly-cap-usd <n>  Optional monthly cap summed from ledger.csv
  --top <n>              Ranking pages to fetch (default 8)
  --crawl <n>            Target pages to crawl (default 10)
  --engines <list>       SERP engines in order: google,bing,duckduckgo (default) or none
  --no-browser           Skip the headless-browser SERP path (plain HTML only)
  --serp-html <file>     SERP page saved from a browser (Google, Bing or DuckDuckGo); repeatable
  --serp-urls <list>     Ranking URLs in order, comma separated, as seen in a browser search
  --adlib-capture        Screenshot ad libraries and read visible counts (needs the browser)
  --no-psi               Skip PageSpeed Insights (reads PSI_API_KEY if set)
  --lighthouse           Also run local Lighthouse if installed
  --delay-ms <n>         Minimum gap between requests to one host (default 3000; search hosts never below 3000)
  --cache-dir <dir>      Cache folder (default .seo-rea/cache)
  --ledger <file>        Paid-call ledger (default .seo-rea/ledger.csv)
  --no-cache             Ignore and do not write the cache
  --force                Replace an existing run in --out
  --json                 Print report/dossier.json (strategy: strategy.json) to stdout; progress goes to stderr

Strategy: maps sitemaps + nav into clusters, fetches a page sample, checks
  SERPs for the site's own head terms and brand, reads free off-page signals
  (Tranco, Wikipedia, Common Crawl, App Store) and writes report/strategy.md and
  report/strategy.json. Takes the teardown options above, plus:
  --vs <domain>          Second domain; roles (leader/challenger) come from the evidence
  --crawl <n>            Pages fetched per site (default 30)
  --terms <n>            Head terms checked in SERPs (default 10; split 6/4 with --vs)
  --out defaults to seo-rea-runs/strategy-<domain>[-vs-<domain>].

Batch: runs audit for every site, and teardown when the site has a keyword.
  Takes the teardown options above (except --keyword, --target, --serp-*),
  writes <out>/<site>/audit, <out>/<site>/teardown, <out>/summary.json and
  <out>/summary.md. --out defaults to "out"; --site-delay-ms (default 5000) is
  the pause between sites. Entries whose domain is TODO are skipped.

Crawl: breadth-first from https://<domain>/ plus sitemap URLs, obeying
  robots.txt for the "seo-rea" token. State is saved in <out>/data/ every 25
  pages; rerunning the same command resumes (Ctrl-C is safe). --force starts
  over. --max-pages is capped at 5000. Writes report/crawl.md and crawl.json.
  --out defaults to seo-rea-runs/crawl-<domain>.

Paid calls (DataForSEO) read DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD from the environment only.
`;

export { UsageError };

export function parseEngines(v: string): EngineName[] {
  if (v.trim() === "none") return [];
  const list = v
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const e of list)
    if (!isEngineName(e)) throw new UsageError(`unknown engine "${e}" (use google, bing, duckduckgo or none)`);
  return list as EngineName[];
}

export type Command =
  | { command: "help" }
  | { command: "version" }
  | { command: "mcp" }
  | { command: "doctor"; json: boolean }
  | { command: "teardown"; options: TeardownCli }
  | { command: "strategy"; options: StrategyCli }
  | { command: "batch"; options: BatchCli }
  | {
      command: "audit";
      target: string;
      out: string;
      psi: boolean;
      lighthouse: boolean;
      json: boolean;
      noCache: boolean;
      cacheDir: string;
    }
  | { command: "crawl"; options: CrawlCli }
  | { command: "cite"; out: string; engine: string; prompt: string; urls: string; note: string };

export interface TeardownCli {
  keyword: string;
  target: string;
  out: string;
  budgetUsd: number;
  monthlyCapUsd: number;
  top: number;
  crawl: number;
  engines: EngineName[];
  browser: boolean;
  serpHtml: string[];
  serpUrls: string[];
  adlibCapture: boolean;
  psi: boolean;
  lighthouse: boolean;
  delayMs: number;
  cacheDir: string;
  ledgerPath: string;
  noCache: boolean;
  force: boolean;
  json: boolean;
}

export interface StrategyCli extends Omit<TeardownCli, "keyword" | "target" | "serpHtml" | "serpUrls" | "top"> {
  domain: string;
  vs: string | null;
  terms: number;
}

export interface BatchCli extends Omit<TeardownCli, "keyword" | "target" | "serpHtml" | "serpUrls"> {
  sites: string;
  siteDelayMs: number;
}

/** Options shared by teardown and batch. */
const RUN_OPTIONS = {
  "budget-usd": { type: "string", default: "0" },
  "monthly-cap-usd": { type: "string" },
  top: { type: "string", default: "8" },
  crawl: { type: "string", default: "10" },
  engines: { type: "string", default: "google,bing,duckduckgo" },
  "no-browser": { type: "boolean", default: false },
  "adlib-capture": { type: "boolean", default: false },
  "no-psi": { type: "boolean", default: false },
  lighthouse: { type: "boolean", default: false },
  "delay-ms": { type: "string", default: "3000" },
  "cache-dir": { type: "string", default: ".seo-rea/cache" },
  ledger: { type: "string", default: ".seo-rea/ledger.csv" },
  "no-cache": { type: "boolean", default: false },
  force: { type: "boolean", default: false },
  json: { type: "boolean", default: false },
} as const;

type RunCli = Omit<TeardownCli, "keyword" | "target" | "out" | "serpHtml" | "serpUrls">;

type RunValues = {
  [K in keyof typeof RUN_OPTIONS]?: (typeof RUN_OPTIONS)[K]["type"] extends "boolean" ? boolean : string;
};

function runOptions(v: RunValues): RunCli {
  return {
    budgetUsd: num(v["budget-usd"], "budget-usd") ?? 0,
    monthlyCapUsd: num(v["monthly-cap-usd"], "monthly-cap-usd") ?? Infinity,
    top: num(v.top, "top") ?? 8,
    crawl: num(v.crawl, "crawl") ?? 10,
    engines: parseEngines(v.engines ?? "google,bing,duckduckgo"),
    browser: !v["no-browser"],
    adlibCapture: v["adlib-capture"] ?? false,
    psi: !v["no-psi"],
    lighthouse: v.lighthouse ?? false,
    delayMs: num(v["delay-ms"], "delay-ms") ?? 3000,
    cacheDir: resolve(v["cache-dir"] ?? ".seo-rea/cache"),
    ledgerPath: resolve(v.ledger ?? ".seo-rea/ledger.csv"),
    noCache: v["no-cache"] ?? false,
    force: v.force ?? false,
    json: v.json ?? false,
  };
}

function parseTeardown(rest: string[]): TeardownCli {
  const { values: v } = parseArgs({
    args: rest,
    strict: true,
    options: {
      keyword: { type: "string" },
      target: { type: "string" },
      out: { type: "string" },
      "serp-html": { type: "string", multiple: true, default: [] },
      "serp-urls": { type: "string" },
      ...RUN_OPTIONS,
    },
  });
  if (!v.keyword || !v.target || !v.out) throw new UsageError("teardown needs --keyword, --target and --out");
  const serpUrls = parseUrlList(v["serp-urls"]);
  if (v["serp-urls"] !== undefined && !serpUrls.length) throw new UsageError("--serp-urls has no valid http(s) URLs");
  return {
    keyword: v.keyword,
    target: v.target,
    out: resolve(v.out),
    serpHtml: v["serp-html"].map((f) => resolve(f)),
    serpUrls,
    ...runOptions(v),
  };
}

function parseStrategy(rest: string[]): StrategyCli {
  const { values: v, positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      vs: { type: "string" },
      terms: { type: "string", default: "10" },
      ...RUN_OPTIONS,
      crawl: { type: "string", default: "30" },
    },
  });
  const raw = positionals[0];
  if (!raw || !DOMAIN_LIKE.test(raw)) throw new UsageError("strategy needs a domain, e.g. seo-rea example.com");
  if (positionals.length > 1) throw new UsageError(`unexpected argument "${positionals[1]}"`);
  const domain = normalizeDomain(raw);
  const vs = v.vs ? normalizeDomain(v.vs) : null;
  if (v.vs !== undefined && (!vs || !DOMAIN_LIKE.test(v.vs))) throw new UsageError("--vs needs a domain");
  if (vs === domain) throw new UsageError("--vs must be a different domain");
  const { top: _top, ...run } = runOptions(v);
  return {
    domain,
    vs,
    out: resolve(v.out ?? join("seo-rea-runs", `strategy-${domain}${vs ? `-vs-${vs}` : ""}`)),
    terms: Math.max(1, num(v.terms, "terms") ?? 10),
    ...run,
    crawl: Math.max(1, num(v.crawl, "crawl") ?? 30),
  };
}

function parseBatch(rest: string[]): BatchCli {
  const { values: v } = parseArgs({
    args: rest,
    strict: true,
    options: {
      sites: { type: "string" },
      out: { type: "string", default: "out" },
      "site-delay-ms": { type: "string", default: "5000" },
      ...RUN_OPTIONS,
    },
  });
  if (!v.sites) throw new UsageError("batch needs --sites <file.json|file.csv>");
  return {
    sites: resolve(v.sites),
    out: resolve(v.out),
    siteDelayMs: num(v["site-delay-ms"], "site-delay-ms") ?? 5000,
    ...runOptions(v),
  };
}

/** Pure argument parsing; throws UsageError on bad input. */
export function parseCli(argv: string[]): Command {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") return { command: "help" };
  if (cmd === "--version" || cmd === "-v" || cmd === "version") return { command: "version" };
  if (cmd === "mcp") return { command: "mcp" };
  if (cmd === "doctor") {
    const { values } = parseArgs({ args: rest, options: { json: { type: "boolean", default: false } } });
    return { command: "doctor", json: values.json };
  }
  if (cmd === "teardown") return { command: "teardown", options: parseTeardown(rest) };
  if (cmd === "strategy") return { command: "strategy", options: parseStrategy(rest) };
  if (cmd === "batch") return { command: "batch", options: parseBatch(rest) };
  if (cmd === "crawl") return { command: "crawl", options: parseCrawl(rest) };
  if (cmd === "audit") {
    const { values: v, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        out: { type: "string" },
        "no-psi": { type: "boolean", default: false },
        lighthouse: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        "no-cache": { type: "boolean", default: false },
        "cache-dir": { type: "string", default: ".seo-rea/cache" },
      },
    });
    const target = positionals[0];
    if (!target) throw new UsageError("audit needs a domain or URL");
    const out = resolve(v.out ?? join("seo-rea-runs", `audit-${normalizeDomain(target)}`));
    return {
      command: "audit",
      target,
      out,
      psi: !v["no-psi"],
      lighthouse: v.lighthouse,
      json: v.json,
      noCache: v["no-cache"],
      cacheDir: resolve(v["cache-dir"]),
    };
  }
  if (cmd === "cite") {
    const { values: v } = parseArgs({
      args: rest,
      options: {
        out: { type: "string" },
        engine: { type: "string" },
        prompt: { type: "string" },
        urls: { type: "string", default: "" },
        note: { type: "string", default: "" },
      },
    });
    if (!v.out || !v.engine || !v.prompt) throw new UsageError("cite needs --out, --engine and --prompt");
    return { command: "cite", out: resolve(v.out), engine: v.engine, prompt: v.prompt, urls: v.urls, note: v.note };
  }
  if (DOMAIN_LIKE.test(cmd)) return { command: "strategy", options: parseStrategy([cmd, ...rest]) };
  throw new UsageError(`unknown command "${cmd}"`);
}

const err = (m: string): void => {
  process.stderr.write(`  ${m}\n`);
};

const printJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

/**
 * Report a failure per the error contract: `seo-rea: [CODE] message` on
 * stderr, plus the JSON payload on stdout when --json was given.
 */
export function reportError(e: unknown, json: boolean): number {
  const p = toErrorPayload(e);
  process.stderr.write(`seo-rea: [${p.error.code}] ${p.error.message}\n  hint: ${p.error.hint}\n`);
  if (p.error.code === "USAGE") process.stderr.write(`\n${HELP}`);
  if (json) printJson(p);
  return p.error.exitCode;
}

export async function main(argv: string[]): Promise<number> {
  try {
    return await dispatch(parseCli(argv));
  } catch (e) {
    return reportError(e, argv.includes("--json"));
  }
}

async function dispatch(cmd: Command): Promise<number> {
  switch (cmd.command) {
    case "help":
      process.stdout.write(HELP);
      return 0;
    case "version":
      process.stdout.write(`${VERSION}\n`);
      return 0;
    case "mcp": {
      const { startStdioServer } = await import("./mcp/server.js");
      await startStdioServer();
      return -1; // keep running
    }
    case "doctor": {
      const { runDoctor, renderDoctor } = await import("./services/doctor.js");
      const d = await runDoctor({ env: process.env });
      process.stdout.write(cmd.json ? `${JSON.stringify(d, null, 2)}\n` : renderDoctor(d));
      return 0;
    }
    case "teardown": {
      const { runTeardown } = await import("./services/teardown.js");
      const o = cmd.options;
      const { run, claims, dossier } = await runTeardown({ ...o, log: err });
      if (o.json) {
        printJson(dossier);
        return 0;
      }
      const ok = run.competitors.filter((c) => c.page).length;
      const used = run.serp.attempts
        .map((a) => `${a.label}: ${a.problem ? `not used (${a.problem})` : "used"}`)
        .join("; ");
      process.stdout.write(
        `Teardown written: ${join(o.out, "report", "teardown.md")}\n` +
          `  SERP: ${run.serp.organic.length} results from ${run.serp.primaryLabel || "no engine"}\n` +
          `  Engines: ${used || "none"}\n` +
          `  Pages analysed: ${ok}/${run.competitors.length}; target pages: ${run.target.pages.length}; keyword-gap phrases: ${run.keywordGap.length}\n` +
          `  Claims: ${claims.length}; spent ${run.spentUsd.toFixed(4)} USD of ${run.budgetUsd}\n` +
          `  Dossier: ${join(o.out, "report", "dossier.json")}; top actions: ${dossier.topActions.length}\n`,
      );
      return 0;
    }
    case "strategy": {
      const { runStrategy } = await import("./services/strategy.js");
      const { json, ...o } = cmd.options;
      const { strategy: d, reportPath } = await runStrategy({ ...o, log: err });
      if (json) {
        printJson(d);
        return 0;
      }
      const lead = d.sites.find((s) => s.domain === d.roles.leader);
      const used = d.serp.checks.filter((c) => c.status === "used").length;
      process.stdout.write(
        `Strategy written: ${reportPath}\n` +
          `  ${d.roles.basis}\n` +
          `  SERP checks usable: ${used}/${d.serp.checks.length}; co-ranking domains: ${d.competitors.length}\n` +
          (lead?.drivers ?? [])
            .slice(0, 5)
            .map((x) => `  Driver ${x.rank} (${x.strength}): ${x.title}\n`)
            .join("") +
          `  Top actions for ${d.actionsFor}: ${d.topActions.length}; JSON: ${join(o.out, "report", "strategy.json")}\n`,
      );
      return 0;
    }
    case "batch": {
      const { loadSites, runBatch } = await import("./services/batch.js");
      const { sites: sitesFile, ...o } = cmd.options;
      const sites = await loadSites(sitesFile);
      const summary = await runBatch({ ...o, sites, sitesFile, log: err });
      if (o.json) {
        printJson(summary);
        return 0;
      }
      process.stdout.write(
        `Batch written: ${join(o.out, "summary.md")} and summary.json\n` +
          summary.sites
            .map((s) => `  ${s.site ?? `${s.name} (TODO)`}: ${s.status}${s.note ? ` (${s.note})` : ""}\n`)
            .join("") +
          `  Paid spend: ${summary.spentUsd.toFixed(4)} USD\n`,
      );
      return summary.sites.some((s) => s.status === "error") ? 1 : 0;
    }
    case "audit": {
      const { runAudit } = await import("./services/audit.js");
      const { run, reportPath, dossier } = await runAudit({
        target: cmd.target,
        out: cmd.out,
        psi: cmd.psi,
        lighthouse: cmd.lighthouse,
        noCache: cmd.noCache,
        cacheDir: cmd.cacheDir,
        log: err,
      });
      if (cmd.json) {
        printJson(dossier);
        return 0;
      }
      const ai = run.aiReadiness;
      const blocked = ai.crawlers.filter((c) => c.access === "blocked").map((c) => c.token);
      const perf = ai.perf.find((p) => p.ok);
      process.stdout.write(
        `Audit written: ${reportPath}\n` +
          `  Schema: ${run.page ? `${run.page.schema.blocks} block(s), ${run.page.schema.nodes.filter((n) => !n.valid).length} node(s) with errors` : `page not fetched (${run.pageError})`}\n` +
          `  AI crawlers blocked: ${blocked.join(", ") || "none"}\n` +
          `  llms.txt: ${ai.llmsTxt.present ? (ai.llmsTxt.valid ? "valid" : "invalid") : "absent"}; llms-full.txt: ${ai.llmsFullTxt.present ? "present" : "absent"}\n` +
          `  PageSpeed: ${perf ? `performance ${perf.scores.performance}, SEO ${perf.scores.seo}` : (ai.perf[0]?.skipped ?? "not run")}\n`,
      );
      return 0;
    }
    case "crawl": {
      const { runCrawlCommand } = await import("./cli-crawl.js");
      return runCrawlCommand(cmd.options, err, printJson);
    }
    case "cite": {
      const { recordCitation } = await import("./services/cite.js");
      const r = await recordCitation(cmd);
      process.stdout.write(
        `Recorded ${r.item.id}: ${r.citation.urls.length} URL(s) from ${r.citation.engine}${r.rerendered ? "; teardown.md updated" : ""}\n`,
      );
      return 0;
    }
  }
}

function isEntry(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntry()) {
  main(process.argv.slice(2)).then(
    (code) => {
      if (code >= 0) process.exitCode = code;
    },
    (e: unknown) => {
      process.exitCode = reportError(e, process.argv.includes("--json"));
    },
  );
}
