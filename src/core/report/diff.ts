// Markdown for report/diff.md.

import type { DiffItem, DiffReport } from "../diff/schema.js";
import { cell } from "../util.js";

const LABEL: Record<DiffItem["status"], string> = {
  regressed: "Regressed",
  new: "New",
  fixed: "Fixed",
  improved: "Improved",
  "not-rechecked": "Not rechecked",
  unchanged: "Unchanged",
};
const MAX_ROWS = 40;

export function renderDiff(d: DiffReport): string {
  const c = d.counts;
  const L: string[] = [
    `# What changed: ${d.domain} (${d.sourceKind})`,
    "",
    `Older run ${d.old.runId} (${d.old.at}) vs newer run ${d.new.runId} (${d.new.at}).`,
    "",
    `**${c.fixed} fixed, ${c.new} new, ${c.regressed} regressed, ${c.improved} improved, ${c.unchanged} unchanged${c.notRechecked ? `, ${c.notRechecked} not rechecked` : ""}.**`,
    "",
    "## Metrics",
    "",
    "| Metric | Before | After | Change |",
    "|---|---|---|---|",
    ...d.metrics.map((m) => `| ${cell(m.name)} | ${m.old} | ${m.new} | ${m.delta > 0 ? `+${m.delta}` : m.delta} |`),
    "",
  ];
  if (d.ruleDeltas.length) {
    L.push("## Rules that moved", "", "| Rule | Before | After | Change |", "|---|---|---|---|");
    for (const r of d.ruleDeltas)
      L.push(`| \`${r.rule}\` | ${r.old} | ${r.new} | ${r.delta > 0 ? `+${r.delta}` : r.delta} |`);
    L.push("");
  }
  for (const status of ["regressed", "new", "fixed", "improved", "not-rechecked"] as const) {
    const rows = d.items.filter((i) => i.status === status);
    if (!rows.length) continue;
    L.push(
      `## ${LABEL[status]} (${rows.length})`,
      "",
      "| ID | Severity | Issue | URL | Detail |",
      "|---|---|---|---|---|",
    );
    for (const i of rows.slice(0, MAX_ROWS))
      L.push(`| \`${i.id}\` | ${i.severity} | ${cell(i.title)} | ${cell(i.url) || "-"} | ${cell(i.detail)} |`);
    if (rows.length > MAX_ROWS) L.push("", `${rows.length - MAX_ROWS} more in diff.json.`);
    L.push("");
  }
  if (d.notes.length) L.push("## Notes", "", ...d.notes.map((n) => `- ${n}`), "");
  return L.join("\n");
}
