#!/usr/bin/env node
// seo-rea CLI: teardown, audit, cite, mcp, doctor.

import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { EngineName } from "./core/types.js";
import { normalizeDomain, parseUrlList } from "./core/util.js";
import { VERSION } from "./version.js";
import { AI_ENGINES } from "./adapters/cite.js";
import { isEngineName } from "./adapters/serp.js";

export const HELP = `seo-rea ${VERSION} - reverse engineer why pages rank (evidence first, free first)

Usage:
  seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [options]
  seo-rea audit <domain|url> [--out <dir>] [--no-psi] [--lighthouse] [--json]
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

Paid calls (DataForSEO) read DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD from the environment only.
`;

export class UsageError extends Error {
  override name = "UsageError";
}

const num = (v: string | undefined, name: string): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new UsageError(`--${name} must be a non-negative number`);
  return n;
};

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
}

function parseTeardown(rest: string[]): TeardownCli {
  const { values: v } = parseArgs({
    args: rest,
    strict: true,
    options: {
      keyword: { type: "string" },
      target: { type: "string" },
      out: { type: "string" },
      "budget-usd": { type: "string", default: "0" },
      "monthly-cap-usd": { type: "string" },
      top: { type: "string", default: "8" },
      crawl: { type: "string", default: "10" },
      engines: { type: "string", default: "google,bing,duckduckgo" },
      "no-browser": { type: "boolean", default: false },
      "serp-html": { type: "string", multiple: true, default: [] },
      "serp-urls": { type: "string" },
      "adlib-capture": { type: "boolean", default: false },
      "no-psi": { type: "boolean", default: false },
      lighthouse: { type: "boolean", default: false },
      "delay-ms": { type: "string", default: "3000" },
      "cache-dir": { type: "string", default: ".seo-rea/cache" },
      ledger: { type: "string", default: ".seo-rea/ledger.csv" },
      "no-cache": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
  });
  if (!v.keyword || !v.target || !v.out) throw new UsageError("teardown needs --keyword, --target and --out");
  const serpUrls = parseUrlList(v["serp-urls"]);
  if (v["serp-urls"] !== undefined && !serpUrls.length) throw new UsageError("--serp-urls has no valid http(s) URLs");
  return {
    keyword: v.keyword,
    target: v.target,
    out: resolve(v.out),
    budgetUsd: num(v["budget-usd"], "budget-usd") ?? 0,
    monthlyCapUsd: num(v["monthly-cap-usd"], "monthly-cap-usd") ?? Infinity,
    top: num(v.top, "top") ?? 8,
    crawl: num(v.crawl, "crawl") ?? 10,
    engines: parseEngines(v.engines),
    browser: !v["no-browser"],
    serpHtml: v["serp-html"].map((f) => resolve(f)),
    serpUrls,
    adlibCapture: v["adlib-capture"],
    psi: !v["no-psi"],
    lighthouse: v.lighthouse,
    delayMs: num(v["delay-ms"], "delay-ms") ?? 3000,
    cacheDir: resolve(v["cache-dir"]),
    ledgerPath: resolve(v.ledger),
    noCache: v["no-cache"],
    force: v.force,
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
  throw new UsageError(`unknown command "${cmd}"`);
}

const err = (m: string): void => {
  process.stderr.write(`  ${m}\n`);
};

export async function main(argv: string[]): Promise<number> {
  let cmd: Command;
  try {
    cmd = parseCli(argv);
  } catch (e) {
    process.stderr.write(`seo-rea: ${(e as Error).message}\n\n${HELP}`);
    return 2;
  }
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
      const { run, claims } = await runTeardown({ ...o, log: err });
      const ok = run.competitors.filter((c) => c.page).length;
      const used = run.serp.attempts
        .map((a) => `${a.label}: ${a.problem ? `not used (${a.problem})` : "used"}`)
        .join("; ");
      process.stdout.write(
        `Teardown written: ${join(o.out, "report", "teardown.md")}\n` +
          `  SERP: ${run.serp.organic.length} results from ${run.serp.primaryLabel || "no engine"}\n` +
          `  Engines: ${used || "none"}\n` +
          `  Pages analysed: ${ok}/${run.competitors.length}; target pages: ${run.target.pages.length}; keyword-gap phrases: ${run.keywordGap.length}\n` +
          `  Claims: ${claims.length}; spent ${run.spentUsd.toFixed(4)} USD of ${run.budgetUsd}\n`,
      );
      return 0;
    }
    case "audit": {
      const { runAudit } = await import("./services/audit.js");
      const { run, reportPath } = await runAudit({
        target: cmd.target,
        out: cmd.out,
        psi: cmd.psi,
        lighthouse: cmd.lighthouse,
        noCache: cmd.noCache,
        cacheDir: cmd.cacheDir,
        log: err,
      });
      if (cmd.json) {
        process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
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
      process.stderr.write(`seo-rea: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    },
  );
}
