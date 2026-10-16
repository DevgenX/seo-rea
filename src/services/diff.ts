// `seo-rea diff <old> <new>`: load two runs, compare, optionally write report/diff.{json,md}.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validateCrawl } from "../core/crawl/schema.js";
import { compareRuns, fromCrawl, fromDossier, fromStrategy, type LoadedRun } from "../core/diff/compare.js";
import type { DiffReport } from "../core/diff/schema.js";
import { validateDossier } from "../core/dossier.js";
import { SeoReaError } from "../core/errors.js";
import { renderDiff } from "../core/report/diff.js";
import { validateStrategy } from "../core/strategy/schema.js";

const CANDIDATES = ["crawl.json", "dossier.json", "strategy.json"] as const;

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** A run folder (with report/<kind>.json) or a report JSON file. */
export async function resolveReport(input: string): Promise<string> {
  const p = resolve(input);
  if (p.endsWith(".json")) {
    if (await exists(p)) return p;
    throw new SeoReaError("NOT_FOUND", `${p} does not exist`);
  }
  const found: string[] = [];
  for (const name of CANDIDATES) {
    for (const dir of [join(p, "report"), p]) {
      const f = join(dir, name);
      if (await exists(f)) {
        found.push(f);
        break;
      }
    }
  }
  if (!found.length) throw new SeoReaError("NOT_FOUND", `no crawl.json, dossier.json or strategy.json under ${p}`);
  if (found.length > 1)
    throw new SeoReaError(
      "INVALID_INPUT",
      `${p} holds several reports (${found.join(", ")}); pass the JSON file to compare`,
    );
  return found[0] as string;
}

export async function loadRun(input: string): Promise<LoadedRun> {
  const file = await resolveReport(input);
  let data: unknown;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (cause) {
    throw new SeoReaError("INVALID_INPUT", `${file} is not valid JSON`, { cause });
  }
  const kind = (data as { kind?: unknown })?.kind;
  if (kind === "crawl") return fromCrawl(validateCrawl(data), file);
  if (kind === "audit" || kind === "teardown") return fromDossier(validateDossier(data), file);
  if (kind === "strategy") return fromStrategy(validateStrategy(data), file);
  throw new SeoReaError("DIFF_INCOMPATIBLE", `${file} is not a crawl, audit, teardown or strategy report`);
}

export interface DiffOptions {
  oldRun: string;
  newRun: string;
  out?: string;
}

export async function runDiff(
  o: DiffOptions,
): Promise<{ diff: DiffReport; markdown: string; reportPath: string | null }> {
  const [a, b] = await Promise.all([loadRun(o.oldRun), loadRun(o.newRun)]);
  const diff = compareRuns(a, b);
  const markdown = renderDiff(diff);
  let reportPath: string | null = null;
  if (o.out) {
    await mkdir(join(o.out, "report"), { recursive: true });
    await writeFile(join(o.out, "report", "diff.json"), `${JSON.stringify(diff, null, 2)}\n`);
    reportPath = join(o.out, "report", "diff.md");
    await writeFile(reportPath, markdown);
  }
  return { diff, markdown, reportPath };
}
