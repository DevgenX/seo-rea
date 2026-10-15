// Writes report files for a run and re-renders after `cite`.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildTeardownDossier } from "../core/dossier-build.js";
import { validateDossier, type Dossier } from "../core/dossier.js";
import type { EvidenceStore } from "../core/evidence.js";
import { buildClaims, buildPlaybook, type PlaybookItem } from "../core/report/claims.js";
import { renderLedger, renderQuestions, renderTeardown } from "../core/report/teardown.js";
import type { CitationEntry, TeardownRun } from "../core/run.js";
import type { Claim } from "../core/types.js";
import { isDomainOrSub } from "../core/util.js";
import type { Citation } from "../adapters/cite.js";

/** Citations recorded in the evidence store, marked with whether the target was cited. */
export async function loadCitations(ev: EvidenceStore, targetDomain: string): Promise<CitationEntry[]> {
  const out: CitationEntry[] = [];
  for (const item of ev.items.filter((e) => e.kind === "citation")) {
    try {
      const c = JSON.parse(await readFile(join(ev.dir, item.file), "utf8")) as Citation;
      out.push({ ...c, targetCited: c.domains.some((d) => isDomainOrSub(d, targetDomain)), evidenceId: item.id });
    } catch {
      // skip unreadable evidence
    }
  }
  return out;
}

/** Validate against the dossier schema, then write report/dossier.json. */
export async function writeDossier(out: string, dossier: Dossier): Promise<Dossier> {
  const valid = validateDossier(dossier);
  await writeFile(join(out, "report", "dossier.json"), `${JSON.stringify(valid, null, 2)}\n`);
  return valid;
}

export async function writeTeardownReports(
  out: string,
  run: TeardownRun,
  ev: EvidenceStore,
  now: () => Date = () => new Date(),
): Promise<{ run: TeardownRun; claims: Claim[]; playbook: PlaybookItem[]; dossier: Dossier }> {
  run.citations = await loadCitations(ev, run.target.domain);
  const claims = buildClaims(run);
  const playbook = buildPlaybook(run);
  const dossier = await writeDossier(out, buildTeardownDossier(run, claims, now()));
  await writeFile(join(out, "data", "run.json"), JSON.stringify(run, null, 2));
  await writeFile(join(out, "report", "ledger.md"), renderLedger(run, claims));
  await writeFile(join(out, "report", "questions.md"), renderQuestions(run));
  await writeFile(join(out, "report", "teardown.md"), renderTeardown(run, claims, playbook, dossier.topActions));
  return { run, claims, playbook, dossier };
}
