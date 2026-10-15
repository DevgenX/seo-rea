// Renders audit.md: single-site AEO checks.

import { buildAuditDossier } from "../dossier-build.js";
import type { TopAction } from "../dossier.js";
import type { AuditRun } from "../run.js";
import type { Claim } from "../types.js";
import { cell, ids } from "../util.js";
import { renderTopActions } from "./actions.js";
import { aiClaims, aiPlaybook, type PlaybookItem } from "./claims.js";
import { aiReadinessSection, renderLedgerTable, schemaTable } from "./sections.js";

export function buildAuditClaims(run: AuditRun): Claim[] {
  const claims: Claim[] = [];
  const add = (c: Partial<Claim> & Pick<Claim, "claim" | "evidence" | "type" | "boundary">): void => {
    claims.push({ confidence: "medium", unknowns: "", ...c });
  };
  const d = run.site.domain;
  if (run.page) {
    const s = run.page.schema;
    const bad = s.nodes.filter((n) => !n.valid);
    add({
      claim: s.blocks
        ? `${run.url} has ${s.blocks} JSON-LD block(s) (${run.page.schemaTypes.join(", ") || "no types"}); ${bad.length} checked node(s) with errors${s.parseErrors.length ? `, ${s.parseErrors.length} unparseable` : ""}`
        : `${run.url} has no JSON-LD`,
      evidence: [run.pageEvidenceId],
      type: "observed",
      confidence: "high",
      boundary: "raw HTML without JavaScript",
    });
    add({
      claim: `${run.url}: ${run.page.wordCount} words, ${run.page.headings.h1.length} H1, ${run.page.headings.h2.length} H2, title ${run.page.title.length} chars, meta description ${run.page.metaDescription ? "present" : "missing"}`,
      evidence: [run.pageEvidenceId],
      type: "observed",
      confidence: "high",
      boundary: "raw HTML without JavaScript",
    });
  } else {
    add({
      claim: `Could not fetch ${run.url}: ${run.pageError}`,
      evidence: [run.pageEvidenceId],
      type: "observed",
      confidence: "high",
      boundary: "single request",
    });
  }
  add({
    claim: run.site.sitemap.urlCount
      ? `${d} sitemap lists ${run.site.sitemap.urlCount} URLs`
      : `No sitemap found for ${d}`,
    evidence: [run.site.robotsEvidenceId, run.site.sitemap.evidenceId],
    type: "observed",
    confidence: "high",
    boundary: "robots.txt Sitemap lines and /sitemap.xml",
  });
  aiClaims(run.aiReadiness, d, run.site.robotsEvidenceId, add);
  return claims;
}

export function buildAuditPlaybook(run: AuditRun): PlaybookItem[] {
  const out: PlaybookItem[] = [];
  const p = run.page;
  if (p) {
    const errs = p.schema.nodes.filter((n) => !n.valid).map((n) => `${n.type}: ${n.errors[0]}`);
    if (errs.length)
      out.push({
        action: `Fix JSON-LD errors: ${errs.slice(0, 4).join("; ")}`,
        why: "Invalid structured data is ignored for rich results.",
        evidence: [run.pageEvidenceId],
      });
    if (!p.schema.blocks)
      out.push({
        action:
          "Add JSON-LD: Organization (name, url, logo, sameAs) and the type that matches the page (SoftwareApplication, Article, Product, FAQPage)",
        why: "No structured data was found.",
        evidence: [run.pageEvidenceId],
      });
    if (!p.metaDescription)
      out.push({
        action: "Add a meta description (about 150 characters) that states what the page offers",
        why: "Missing meta description.",
        evidence: [run.pageEvidenceId],
      });
    if (p.wordCount < 150)
      out.push({
        action: "Serve the main copy in the initial HTML (server-side render or prerender)",
        why: `Only ${p.wordCount} words in raw HTML; AI crawlers mostly do not run JavaScript.`,
        evidence: [run.pageEvidenceId],
      });
  }
  if (!run.site.sitemap.urlCount)
    out.push({
      action: "Publish /sitemap.xml and reference it in robots.txt",
      why: "No sitemap was found.",
      evidence: [run.site.sitemap.evidenceId],
    });
  out.push(...aiPlaybook(run.aiReadiness, run.site.domain, run.site.robotsEvidenceId));
  return out;
}

export function renderAudit(
  run: AuditRun,
  claims: Claim[] = buildAuditClaims(run),
  playbook: PlaybookItem[] = buildAuditPlaybook(run),
  actions: TopAction[] = buildAuditDossier(run, claims, new Date(run.createdAt)).topActions,
): string {
  const L: string[] = [];
  L.push(
    `# AEO audit: ${run.url}`,
    "",
    `Run ${run.runId} on ${run.createdAt} with seo-rea ${run.version}. Free sources only. Evidence: [evidence/index.md](../evidence/index.md).`,
    "",
  );
  L.push(...renderTopActions(actions));
  L.push("## 1. Page", "");
  if (run.page) {
    const p = run.page;
    L.push(
      `- Title: ${cell(p.title) || "(none)"} (${p.title.length} chars)`,
      `- Meta description: ${cell(p.metaDescription) || "(none)"}`,
      `- H1: ${cell(p.headings.h1.join(" / ")) || "(none)"}; ${p.headings.h2.length} H2; ${p.wordCount} words in raw HTML`,
      `- Canonical: ${p.canonical || "(none)"}; lang: ${p.lang || "(none)"}; robots meta: ${p.metaRobots || "(none)"}`,
      `- Links: ${p.internalLinkCount} internal, ${p.externalLinkCount} external`,
      `- Evidence: ${run.pageEvidenceId}`,
      "",
    );
  } else L.push(`Could not fetch the page: ${run.pageError} [${run.pageEvidenceId}]`, "");
  L.push("## 2. Schema validation", "");
  if (run.page)
    L.push(
      ...schemaTable([
        {
          label: run.url,
          url: run.url,
          evidenceId: run.pageEvidenceId,
          blocks: run.page.schema.blocks,
          parseErrors: run.page.schema.parseErrors,
          nodes: run.page.schema.nodes,
        },
      ]),
      "",
    );
  else L.push("Not checked (page not fetched).", "");
  L.push(
    "## 3. AI-search readiness",
    "",
    ...aiReadinessSection(run.aiReadiness, run.site.domain, run.site.robotsEvidenceId),
  );
  L.push(
    "## 4. Crawlability",
    "",
    `- robots.txt: ${run.site.robotsFound ? "found" : "not found"}${run.site.robotsBlocksRoot ? " - **disallows / for all agents**" : ""} [${run.site.robotsEvidenceId}]`,
    `- Sitemap: ${run.site.sitemap.urlCount} URLs from ${run.site.sitemap.sources.length} file(s) [${run.site.sitemap.evidenceId}]`,
    "",
  );
  L.push("## 5. Findings", "", ...renderLedgerTable(claims), "");
  L.push("## 6. Fixes", "");
  if (playbook.length) playbook.forEach((p, i) => L.push(`${i + 1}. ${p.action}. ${p.why} [${ids(p.evidence)}]`));
  else L.push("No fixes suggested by these checks.");
  L.push("", "## 7. Unknowns", "");
  for (const u of new Set([...claims.map((c) => c.unknowns).filter(Boolean), ...run.unknowns])) L.push(`- ${u}`);
  L.push("");
  return L.join("\n");
}
