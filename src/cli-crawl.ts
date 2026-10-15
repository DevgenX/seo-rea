// `seo-rea crawl`: argument parsing and the command runner.

import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { normalizeDomain } from "./core/util.js";
import { DOMAIN_LIKE, UsageError, num } from "./cli-args.js";

export interface CrawlCli {
  domain: string;
  out: string;
  maxPages: number;
  maxDepth: number;
  delayMs: number;
  force: boolean;
  json: boolean;
}

export function parseCrawl(rest: string[]): CrawlCli {
  const { values: v, positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "max-pages": { type: "string", default: "500" },
      "max-depth": { type: "string", default: "10" },
      "delay-ms": { type: "string", default: "500" },
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
  });
  const raw = positionals[0];
  if (!raw || !DOMAIN_LIKE.test(raw)) throw new UsageError("crawl needs a domain, e.g. seo-rea crawl example.com");
  if (positionals.length > 1) throw new UsageError(`unexpected argument "${positionals[1]}"`);
  const maxPages = num(v["max-pages"], "max-pages") ?? 500;
  if (maxPages < 1 || maxPages > 5000) throw new UsageError("--max-pages must be between 1 and 5000");
  const domain = normalizeDomain(raw);
  return {
    domain,
    out: resolve(v.out ?? join("seo-rea-runs", `crawl-${domain}`)),
    maxPages: Math.floor(maxPages),
    maxDepth: Math.floor(num(v["max-depth"], "max-depth") ?? 10),
    delayMs: num(v["delay-ms"], "delay-ms") ?? 500,
    force: v.force,
    json: v.json,
  };
}

export async function runCrawlCommand(
  cmd: CrawlCli,
  err: (m: string) => void,
  printJson: (v: unknown) => void,
): Promise<number> {
  const o = cmd;
  const { runCrawl } = await import("./services/crawl.js");
  const { json, ...rest } = o;
  const ac = new AbortController();
  const stop = (): void => {
    err("stopping after the current page; rerun the same command to resume");
    ac.abort();
  };
  process.once("SIGINT", stop);
  try {
    const { report, reportPath } = await runCrawl({ ...rest, signal: ac.signal, log: err });
    if (json) {
      printJson(report);
      return 0;
    }
    const s = report.stats;
    process.stdout.write(
      `Crawl written: ${reportPath}\n` +
        `  Pages: ${s.pagesCrawled} crawled, ${s.indexable} indexable, ${s.queuedLeft} still queued${s.complete ? " (complete)" : ""}${s.resumed ? "; resumed" : ""}\n` +
        `  Issues: ${report.issues.length} across ${report.summary.length} rule(s)\n` +
        report.summary
          .slice(0, 8)
          .map((x) => `    ${x.rule} (${x.severity}): ${x.count}\n`)
          .join("") +
        `  JSON: ${join(o.out, "report", "crawl.json")}\n`,
    );
    return 0;
  } finally {
    process.off("SIGINT", stop);
  }
}
