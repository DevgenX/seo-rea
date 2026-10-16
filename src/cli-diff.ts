// `seo-rea diff`: argument parsing and the command runner.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { UsageError } from "./cli-args.js";

export interface DiffCli {
  oldRun: string;
  newRun: string;
  out: string | null;
  json: boolean;
  html: boolean;
}

export function parseDiff(rest: string[]): DiffCli {
  const { values: v, positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      json: { type: "boolean", default: false },
      html: { type: "boolean", default: false },
    },
  });
  if (positionals.length !== 2) throw new UsageError("diff needs two runs: seo-rea diff <older-run> <newer-run>");
  if (v.html && !v.out) throw new UsageError("diff --html needs --out <dir> to write report/diff.html");
  return {
    oldRun: resolve(positionals[0] as string),
    newRun: resolve(positionals[1] as string),
    out: v.out ? resolve(v.out) : null,
    json: v.json,
    html: v.html,
  };
}

export async function runDiffCommand(cmd: DiffCli, printJson: (v: unknown) => void): Promise<number> {
  const { runDiff } = await import("./services/diff.js");
  const { diff, markdown, reportPath } = await runDiff({
    oldRun: cmd.oldRun,
    newRun: cmd.newRun,
    ...(cmd.out ? { out: cmd.out } : {}),
  });
  const htmlPaths =
    cmd.html && cmd.out ? await (await import("./services/html-report.js")).writeHtmlReports(cmd.out) : [];
  if (cmd.json) printJson(diff);
  else
    process.stdout.write(
      reportPath
        ? `Diff written: ${reportPath}\n${htmlPaths.map((p) => `HTML: ${p}\n`).join("")}\n${markdown}`
        : markdown,
    );
  return 0;
}
