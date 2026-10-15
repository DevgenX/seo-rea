// Markdown sections shared by teardown.md and audit.md.

import type { SchemaNodeResult } from "../../adapters/schema.js";
import type { AiReadinessSummary } from "../run.js";
import type { Claim } from "../types.js";
import { cell, ids } from "../util.js";

export interface SchemaRow {
  label: string;
  url: string;
  evidenceId: string;
  blocks: number;
  parseErrors: string[];
  nodes: SchemaNodeResult[];
}

export function schemaTable(rows: SchemaRow[]): string[] {
  const L = [
    "| Page | Blocks | Type (checked as) | Result | Errors | Warnings | Evidence |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    if (!r.blocks) {
      L.push(`| ${cell(r.label)} | 0 | - | no JSON-LD | - | - | ${r.evidenceId} |`);
      continue;
    }
    for (const e of r.parseErrors)
      L.push(`| ${cell(r.label)} | ${r.blocks} | - | **unparseable** | ${cell(e)} | - | ${r.evidenceId} |`);
    if (!r.nodes.length && !r.parseErrors.length)
      L.push(`| ${cell(r.label)} | ${r.blocks} | (no checked types) | n/a | - | - | ${r.evidenceId} |`);
    for (const n of r.nodes) {
      const as = n.checkedAs === n.type ? n.type : `${n.type} (${n.checkedAs})`;
      L.push(
        `| ${cell(r.label)} | ${r.blocks} | ${as} | ${n.valid ? "valid" : "**errors**"} | ${cell(n.errors.join("; ")) || "-"} | ${cell(n.warnings.join("; ")) || "-"} | ${r.evidenceId} |`,
      );
    }
  }
  return L;
}

export function aiReadinessSection(ai: AiReadinessSummary | null, domain: string, robotsEvidenceId: string): string[] {
  if (!ai) return ["AI-readiness checks did not run.", ""];
  const L: string[] = [];
  L.push(
    `AI crawler access to \`https://${domain}/\` from robots.txt [${ids([robotsEvidenceId, ai.crawlerEvidenceId])}]:`,
    "",
  );
  L.push("| Crawler | Operator | Purpose | Access | Rule |", "|---|---|---|---|---|");
  for (const c of ai.crawlers)
    L.push(
      `| ${c.token} | ${c.operator} | ${c.purpose} | ${c.access === "allowed" ? "allowed" : `**${c.access}**`} | ${cell(c.rule)} |`,
    );
  L.push("");
  for (const [name, r, id] of [
    ["llms.txt", ai.llmsTxt, ai.llmsEvidenceIds[0]],
    ["llms-full.txt", ai.llmsFullTxt, ai.llmsEvidenceIds[1]],
  ] as const) {
    if (!r.present) {
      L.push(`- **/${name}: absent** (${cell(r.errors[0] ?? `HTTP ${r.status}`)}) [${id ?? "-"}]`);
      continue;
    }
    const detail =
      name === "llms.txt"
        ? `title "${cell(r.title)}", ${r.summary ? "summary present" : "no summary"}, ${r.sections.length} section(s), ${r.linkCount} link(s)`
        : `${r.bytes} bytes, title "${cell(r.title)}"`;
    L.push(`- /${name}: ${r.valid ? "valid" : "**invalid**"} - ${detail} [${id ?? "-"}]`);
    for (const e of r.errors) L.push(`  - error: ${cell(e)}`);
    for (const w of r.warnings.slice(0, 5)) L.push(`  - warning: ${cell(w)}`);
  }
  L.push("");
  if (ai.perf.length) {
    L.push(
      "| Source | Strategy | Performance | Accessibility | Best practices | SEO | Lab metrics | Field (CrUX) | Evidence |",
      "|---|---|---|---|---|---|---|---|---|",
    );
    for (const p of ai.perf) {
      if (!p.ok) {
        L.push(`| ${p.source} | ${p.strategy} | skipped: ${cell(p.skipped)} | | | | | | ${p.evidenceId} |`);
        continue;
      }
      const s = p.scores;
      L.push(
        `| ${p.source} | ${p.strategy} | ${s.performance ?? "-"} | ${s.accessibility ?? "-"} | ${s["best-practices"] ?? "-"} | ${s.seo ?? "-"} | ${
          cell(
            Object.entries(p.lab)
              .map(([k, v]) => `${k} ${v}`)
              .join(", "),
          ) || "-"
        } | ${
          cell(
            Object.entries(p.field)
              .map(([k, v]) => `${k} ${v}`)
              .join(", "),
          ) || "none"
        } | ${p.evidenceId} |`,
      );
    }
    L.push("");
  }
  return L;
}

export function renderLedgerTable(claims: Claim[]): string[] {
  return [
    "| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |",
    "|---|---|---|---|---|---|---|",
    ...claims.map(
      (c, i) =>
        `| C${String(i + 1).padStart(2, "0")} | ${cell(c.claim)} | ${ids(c.evidence) || "-"} | ${c.type} | ${c.confidence} | ${cell(c.boundary)} | ${cell(c.unknowns) || "-"} |`,
    ),
  ];
}
