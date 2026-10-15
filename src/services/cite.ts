// `cite`: record one AI answer's citations and refresh the teardown report.

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EvidenceStore } from "../core/evidence.js";
import type { TeardownRun } from "../core/run.js";
import type { Evidence } from "../core/types.js";
import { buildCitation, logCitation, type Citation } from "../adapters/cite.js";
import { writeTeardownReports } from "./reports.js";

export async function recordCitation(input: {
  out: string;
  engine: string;
  prompt: string;
  urls: string | string[];
  note?: string;
  now?: () => Date;
}): Promise<{ item: Evidence; citation: Citation; rerendered: boolean }> {
  const out = resolve(input.out);
  const now = input.now ?? (() => new Date());
  const citation = buildCitation({ ...input, now: now() });
  const ev = await new EvidenceStore(out, { now }).load();
  const item = await logCitation(ev, citation);
  let rerendered = false;
  try {
    const run = JSON.parse(await readFile(join(out, "data", "run.json"), "utf8")) as TeardownRun;
    await writeTeardownReports(out, run, ev);
    rerendered = true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return { item, citation, rerendered };
}
