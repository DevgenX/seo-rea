// `seo-rea reverse`: argument parsing and the command runner.

import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { normalizeDomain } from "./core/util.js";
import { DOMAIN_LIKE, UsageError, num } from "./cli-args.js";

export interface ReverseCli {
  domain: string;
  out: string;
  maxPages: number;
  delayMs: number;
  fromCrawl: string | null;
  offpage: boolean;
  budgetUsd: number;
  monthlyCapUsd: number;
  keywordsLimit: number;
  competitorsLimit: number;
  backlinks: boolean;
  noCache: boolean;
  force: boolean;
  json: boolean;
}

export function parseReverse(rest: string[]): ReverseCli {
  const { values: v, positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "max-pages": { type: "string", default: "300" },
      "delay-ms": { type: "string", default: "500" },
      "from-crawl": { type: "string" },
      "no-offpage": { type: "boolean", default: false },
      "budget-usd": { type: "string", default: "0" },
      "monthly-cap-usd": { type: "string", default: "1.5" },
      "keywords-limit": { type: "string", default: "100" },
      "competitors-limit": { type: "string", default: "10" },
      backlinks: { type: "boolean", default: false },
      "no-cache": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
  });
  const raw = positionals[0];
  if (!raw || !DOMAIN_LIKE.test(raw)) throw new UsageError("reverse needs a domain, e.g. seo-rea reverse example.com");
  if (positionals.length > 1) throw new UsageError(`unexpected argument "${positionals[1]}"`);
  const maxPages = num(v["max-pages"], "max-pages") ?? 300;
  if (maxPages < 1 || maxPages > 5000) throw new UsageError("--max-pages must be between 1 and 5000");
  const keywordsLimit = Math.floor(num(v["keywords-limit"], "keywords-limit") ?? 100);
  if (keywordsLimit < 1 || keywordsLimit > 1000) throw new UsageError("--keywords-limit must be between 1 and 1000");
  const competitorsLimit = Math.floor(num(v["competitors-limit"], "competitors-limit") ?? 10);
  if (competitorsLimit > 100) throw new UsageError("--competitors-limit must be at most 100");
  const budgetUsd = num(v["budget-usd"], "budget-usd") ?? 0;
  if (budgetUsd > 5) throw new UsageError("--budget-usd above 5 is refused for reverse; one run costs about $0.03");
  const domain = normalizeDomain(raw);
  return {
    domain,
    out: resolve(v.out ?? join("seo-rea-runs", `reverse-${domain}`)),
    maxPages: Math.floor(maxPages),
    delayMs: num(v["delay-ms"], "delay-ms") ?? 500,
    fromCrawl: v["from-crawl"] ? resolve(v["from-crawl"]) : null,
    offpage: !v["no-offpage"],
    budgetUsd,
    monthlyCapUsd: num(v["monthly-cap-usd"], "monthly-cap-usd") ?? 1.5,
    keywordsLimit,
    competitorsLimit,
    backlinks: v.backlinks,
    noCache: v["no-cache"],
    force: v.force,
    json: v.json,
  };
}

export async function runReverseCommand(
  cmd: ReverseCli,
  err: (m: string) => void,
  printJson: (v: unknown) => void,
): Promise<number> {
  const { runReverse } = await import("./services/reverse.js");
  const { json, fromCrawl, ...rest } = cmd;
  const ac = new AbortController();
  const stop = (): void => {
    err("stopping the crawl after the current page; rerun the same command to resume");
    ac.abort();
  };
  process.once("SIGINT", stop);
  try {
    const { report, reportPath } = await runReverse({
      ...rest,
      ...(fromCrawl ? { fromCrawl } : {}),
      signal: ac.signal,
      log: err,
    });
    if (json) {
      printJson(report);
      return 0;
    }
    process.stdout.write(
      `Reverse-engineering report written: ${reportPath}\n` +
        `  Pages: ${report.coverage.pagesCrawled} crawled, ${report.coverage.indexablePages} indexable; cost ${report.cost.usd.toFixed(2)} USD\n` +
        report.summary
          .slice(0, 6)
          .map((s) => `  - ${s.claim}\n`)
          .join("") +
        (report.rankings
          ? `  DataForSEO: estimated $${report.rankings.cost.estimateUsd.toFixed(4)}, actual $${report.rankings.cost.actualUsd.toFixed(4)} (${report.rankings.cost.calls} paid call(s), ${report.rankings.cost.fromCache} cached)\n`
          : "") +
        `  JSON: ${join(cmd.out, "report", "reverse.json")}\n`,
    );
    return 0;
  } finally {
    process.off("SIGINT", stop);
  }
}
