// Compare two runs of the same command for the same domain by stable issue id.

import type { CrawlReport } from "../crawl/schema.js";
import type { Dossier } from "../dossier.js";
import { SeoReaError } from "../errors.js";
import { ruleOf } from "../issues.js";
import type { Strategy } from "../strategy/schema.js";
import { VERSION } from "../../version.js";
import { DIFF_SCHEMA_VERSION, type DiffItem, type DiffReport } from "./schema.js";

type Severity = DiffItem["severity"];
const RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

/** One comparable finding, whatever report it came from. */
export interface Finding {
  id: string;
  rule: string;
  severity: Severity;
  title: string;
  url: string;
  /** Pages involved; for grouped issues (duplicates) more pages is worse. */
  size: number;
  /** URLs the finding is about, to tell "fixed" from "not crawled this time". */
  urls: string[];
}

/** A run loaded from disk, normalised for comparison. */
export interface LoadedRun {
  kind: DiffReport["sourceKind"];
  domain: string;
  runId: string;
  at: string;
  path: string;
  findings: Finding[];
  metrics: Record<string, number>;
  /** URLs the run actually looked at; null when it does not crawl (dossier, strategy). */
  checkedUrls: Set<string> | null;
  /** Findings are a top-N list, so leaving it is not proof of a fix. */
  truncated: boolean;
}

export function fromCrawl(r: CrawlReport, path: string): LoadedRun {
  const ruleTitle = new Map(r.summary.map((s) => [s.rule, s.title]));
  const sev = (s: Severity): number => r.issues.filter((i) => i.severity === s).length;
  return {
    kind: "crawl",
    domain: r.domain,
    runId: r.runId,
    at: r.timestamps.finished,
    path,
    findings: r.issues.map((i) => ({
      id: i.id,
      rule: i.rule,
      severity: i.severity,
      title: ruleTitle.get(i.rule) ?? i.rule,
      url: i.url,
      size: i.urls.length,
      urls: i.urls,
    })),
    metrics: {
      "pages crawled": r.stats.pagesCrawled,
      "indexable pages": r.stats.indexable,
      "issues (high)": sev("high"),
      "issues (medium)": sev("medium"),
      "issues (low)": sev("low"),
      "blocked by robots.txt": r.stats.blockedByRobots,
      "sitemap URLs": r.stats.sitemapUrls,
    },
    checkedUrls: new Set(r.pages.map((p) => p.url)),
    truncated: false,
  };
}

const actionFindings = (actions: Dossier["topActions"]): Finding[] =>
  actions.map((a) => ({
    id: a.id,
    rule: ruleOf(a.id),
    severity: a.impact,
    title: a.title,
    url: "",
    size: 1,
    urls: [],
  }));

export function fromDossier(d: Dossier, path: string): LoadedRun {
  const perf = d.target.performance.find((p) => p.ok);
  const metrics: Record<string, number> = { "top actions": d.topActions.length };
  if (typeof perf?.scores.performance === "number")
    metrics[`PageSpeed performance (${perf.strategy})`] = perf.scores.performance;
  if (typeof perf?.scores.seo === "number") metrics[`PageSpeed SEO (${perf.strategy})`] = perf.scores.seo;
  metrics["AI crawlers blocked"] = d.target.aiReadiness.crawlers.filter((c) => c.access === "blocked").length;
  metrics["schema errors"] = d.target.schemaValidation.checks.filter((c) => !c.valid).length;
  return {
    kind: d.kind,
    domain: d.inputs.target,
    runId: d.runId,
    at: d.timestamps.writtenAt,
    path,
    findings: actionFindings(d.topActions),
    metrics,
    checkedUrls: null,
    truncated: true,
  };
}

export function fromStrategy(s: Strategy, path: string): LoadedRun {
  return {
    kind: "strategy",
    domain: s.inputs.domain + (s.inputs.vs ? ` vs ${s.inputs.vs}` : ""),
    runId: s.runId,
    at: s.timestamps.writtenAt,
    path,
    findings: actionFindings(s.topActions),
    metrics: { "top actions": s.topActions.length, "co-ranking competitors": s.competitors.length },
    checkedUrls: null,
    truncated: true,
  };
}

/** Classify every finding of `oldRun` and `newRun`. Throws DIFF_INCOMPATIBLE for mismatched runs. */
export function compareRuns(oldRun: LoadedRun, newRun: LoadedRun): DiffReport {
  if (oldRun.kind !== newRun.kind)
    throw new SeoReaError("DIFF_INCOMPATIBLE", `cannot compare a ${oldRun.kind} run with a ${newRun.kind} run`);
  if (oldRun.domain !== newRun.domain)
    throw new SeoReaError("DIFF_INCOMPATIBLE", `runs are for different domains: ${oldRun.domain} vs ${newRun.domain}`);
  const before = new Map(oldRun.findings.map((f) => [f.id, f]));
  const after = new Map(newRun.findings.map((f) => [f.id, f]));
  const items: DiffItem[] = [];
  for (const [id, n] of after) {
    const o = before.get(id);
    if (!o) {
      items.push({
        status: "new",
        id,
        rule: n.rule,
        severity: n.severity,
        previousSeverity: null,
        title: n.title,
        url: n.url,
        detail: "not in the older run",
      });
      continue;
    }
    const sevDelta = RANK[n.severity] - RANK[o.severity];
    const sizeDelta = n.size - o.size;
    const status =
      sevDelta > 0 || (sevDelta === 0 && sizeDelta > 0)
        ? "regressed"
        : sevDelta < 0 || sizeDelta < 0
          ? "improved"
          : "unchanged";
    const detail =
      sevDelta !== 0
        ? `severity ${o.severity} -> ${n.severity}`
        : sizeDelta !== 0
          ? `pages involved ${o.size} -> ${n.size}`
          : "still present";
    items.push({
      status,
      id,
      rule: n.rule,
      severity: n.severity,
      previousSeverity: o.severity,
      title: n.title,
      url: n.url,
      detail,
    });
  }
  for (const [id, o] of before) {
    if (after.has(id)) continue;
    const checked = newRun.checkedUrls;
    const rechecked = !checked || o.urls.length === 0 || o.urls.some((u) => checked.has(u));
    items.push({
      status: rechecked ? "fixed" : "not-rechecked",
      id,
      rule: o.rule,
      severity: o.severity,
      previousSeverity: o.severity,
      title: o.title,
      url: o.url,
      detail: rechecked
        ? newRun.truncated
          ? "no longer in the top actions"
          : "no longer found"
        : "page not crawled in the newer run",
    });
  }
  const order: Record<DiffItem["status"], number> = {
    regressed: 0,
    new: 1,
    fixed: 2,
    improved: 3,
    "not-rechecked": 4,
    unchanged: 5,
  };
  items.sort(
    (a, b) => order[a.status] - order[b.status] || RANK[b.severity] - RANK[a.severity] || a.id.localeCompare(b.id),
  );
  const count = (s: DiffItem["status"]): number => items.filter((i) => i.status === s).length;

  const names = [...new Set([...Object.keys(oldRun.metrics), ...Object.keys(newRun.metrics)])];
  const metrics = names.map((name) => {
    const o = oldRun.metrics[name] ?? 0;
    const n = newRun.metrics[name] ?? 0;
    return { name, old: o, new: n, delta: Math.round((n - o) * 1000) / 1000 };
  });
  const ruleCount = (r: LoadedRun): Map<string, number> => {
    const m = new Map<string, number>();
    for (const f of r.findings) m.set(f.rule, (m.get(f.rule) ?? 0) + 1);
    return m;
  };
  const ro = ruleCount(oldRun);
  const rn = ruleCount(newRun);
  const ruleDeltas = [...new Set([...ro.keys(), ...rn.keys()])]
    .map((rule) => ({
      rule,
      old: ro.get(rule) ?? 0,
      new: rn.get(rule) ?? 0,
      delta: (rn.get(rule) ?? 0) - (ro.get(rule) ?? 0),
    }))
    .filter((r) => r.delta !== 0)
    .toSorted((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.rule.localeCompare(b.rule));
  const notes: string[] = [];
  if (newRun.truncated)
    notes.push(
      "These reports keep only the top 10 actions; an action that left the list may have been pushed out by a bigger one rather than fixed.",
    );
  if (count("not-rechecked"))
    notes.push(
      `${count("not-rechecked")} older issue(s) are on pages the newer crawl did not reach; raise --max-pages to recheck them.`,
    );
  return {
    schemaVersion: DIFF_SCHEMA_VERSION,
    tool: "seo-rea",
    toolVersion: VERSION,
    kind: "diff",
    sourceKind: newRun.kind,
    domain: newRun.domain,
    old: { runId: oldRun.runId, path: oldRun.path, at: oldRun.at },
    new: { runId: newRun.runId, path: newRun.path, at: newRun.at },
    counts: {
      fixed: count("fixed"),
      new: count("new"),
      regressed: count("regressed"),
      improved: count("improved"),
      unchanged: count("unchanged"),
      notRechecked: count("not-rechecked"),
    },
    metrics,
    ruleDeltas,
    items,
    notes,
  };
}
