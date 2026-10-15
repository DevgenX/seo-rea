// `seo-rea diff`: argument parsing and the command runner.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { UsageError } from "./cli-args.js";

export interface DiffCli {
  oldRun: string;
  newRun: string;
  out: string | null;
  json: boolean;
}

export function parseDiff(rest: string[]): DiffCli {
  const { values: v, positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: { out: { type: "string" }, json: { type: "boolean", default: false } },
  });
  if (positionals.length !== 2) throw new UsageError("diff needs two runs: seo-rea diff <older-run> <newer-run>");
  return {
    oldRun: resolve(positionals[0] as string),
    newRun: resolve(positionals[1] as string),
    out: v.out ? resolve(v.out) : null,
    json: v.json,
  };
}

export async function runDiffCommand(cmd: DiffCli, printJson: (v: unknown) => void): Promise<number> {
  const { runDiff } = await import("./services/diff.js");
  const { diff, markdown, reportPath } = await runDiff({
    oldRun: cmd.oldRun,
    newRun: cmd.newRun,
    ...(cmd.out ? { out: cmd.out } : {}),
  });
  if (cmd.json) printJson(diff);
  else process.stdout.write(reportPath ? `Diff written: ${reportPath}\n\n${markdown}` : markdown);
  return 0;
}
