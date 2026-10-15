// Single-site AEO audit: page + schema, AI crawlers, llms.txt, sitemap, speed.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildAuditDossier } from "../core/dossier-build.js";
import type { Dossier } from "../core/dossier.js";
import { EvidenceStore } from "../core/evidence.js";
import { buildAuditClaims, buildAuditPlaybook, renderAudit } from "../core/report/audit.js";
import { renderLedgerTable } from "../core/report/sections.js";
import type { AuditRun } from "../core/run.js";
import type { Logger } from "../core/types.js";
import { normalizeDomain, runIdFrom } from "../core/util.js";
import { VERSION } from "../version.js";
import { pageAdapter, summarizePage } from "../adapters/page.js";
import { collectAiReadiness, collectSite } from "./collect.js";
import { writeDossier } from "./reports.js";
import { createRuntime } from "./runtime.js";

export interface AuditOptions {
  target: string;
  out: string;
  psi?: boolean;
  lighthouse?: boolean;
  cacheDir?: string;
  noCache?: boolean;
  delayMs?: number;
  /** Offline tests only. */
  minSearchDelayMs?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Logger;
}

/** Accepts a domain or a full URL; returns the page URL to audit. */
export function auditUrl(target: string): string {
  const t = target.trim();
  if (/^https?:\/\//i.test(t)) return new URL(t).toString();
  return `https://${normalizeDomain(t)}/`;
}

export async function runAudit(opts: AuditOptions): Promise<{ run: AuditRun; reportPath: string; dossier: Dossier }> {
  const now = opts.now ?? (() => new Date());
  const url = auditUrl(opts.target);
  const domain = normalizeDomain(url);
  const out = resolve(opts.out);
  // An audit is a snapshot: replace the previous one in this folder.
  for (const d of ["evidence", "report", "data"]) await rm(join(out, d), { recursive: true, force: true });
  await mkdir(join(out, "report"), { recursive: true });
  await mkdir(join(out, "data"), { recursive: true });
  const rt = createRuntime({ ...opts, browser: false, now });
  try {
    const { ctx } = rt;
    const ev = await new EvidenceStore(out, { now }).load();
    ctx.log(`audit: ${url}`);
    const res = await pageAdapter.run(url, ctx);
    const pageEv = await ev.add({
      source: `page-${domain}`,
      url,
      ext: res.page ? "html" : "txt",
      content: res.page ? res.html : `fetch failed: ${res.error}`,
      fetchedAt: res.fetchedAt,
      fromCache: res.fromCache,
      note: res.page ? `${res.page.wordCount} words; schema ${res.page.schemaTypes.join(", ") || "none"}` : res.error,
    });
    if (res.page)
      await ev.add({
        source: `schema-${domain}`,
        kind: "derived",
        url,
        note: `${res.page.schema.nodes.length} checked node(s)`,
        content: res.page.schema,
      });
    const site = await collectSite(domain, ctx, ev);
    const ai = await collectAiReadiness(site.files, url, ctx, ev, {
      psi: opts.psi ?? true,
      lighthouse: opts.lighthouse ?? false,
    });
    const run: AuditRun = {
      tool: "seo-rea",
      version: VERSION,
      runId: runIdFrom(now()),
      createdAt: now().toISOString(),
      url,
      site: site.summary,
      page: res.page ? summarizePage(res.page) : null,
      pageEvidenceId: pageEv.id,
      pageError: res.error,
      aiReadiness: ai.summary,
      unknowns: [...ai.unknowns, "Rendered (JavaScript) DOM not checked; checks use raw HTML"],
    };
    const claims = buildAuditClaims(run);
    const dossier = await writeDossier(out, buildAuditDossier(run, claims, now()));
    await writeFile(join(out, "data", "audit.json"), JSON.stringify(run, null, 2));
    await writeFile(
      join(out, "report", "ledger.md"),
      [`# Finding ledger: ${url}`, "", ...renderLedgerTable(claims), ""].join("\n"),
    );
    const reportPath = join(out, "report", "audit.md");
    await writeFile(reportPath, renderAudit(run, claims, buildAuditPlaybook(run), dossier.topActions));
    return { run, reportPath, dossier };
  } finally {
    await rt.close();
  }
}
