// `batch`: audit (and teardown when a keyword is given) for many sites in turn,
// then write <out>/summary.json and <out>/summary.md.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import type { Dossier, TopAction } from "../core/dossier.js";
import { cell, errorMessage, normalizeDomain, sleep } from "../core/util.js";
import { VERSION } from "../version.js";
import type { AuditOptions } from "./audit.js";
import type { TeardownOptions } from "./teardown.js";

export interface BatchSite {
  name: string;
  /** Normalised domain, or null when the entry is not runnable. */
  site: string | null;
  keyword: string | null;
  /** Why the entry is skipped or partially run; empty when fine. */
  note: string;
}

const TODO_RE = /^\s*(todo\b|tbd\b|\?|$)/i;

function toSite(raw: { name?: unknown; site?: unknown; domain?: unknown; keyword?: unknown }): BatchSite {
  const rawSite = String(raw.site ?? raw.domain ?? "").trim();
  const rawKeyword = String(raw.keyword ?? "").trim();
  const site = TODO_RE.test(rawSite) ? null : normalizeDomain(rawSite) || null;
  const keyword = TODO_RE.test(rawKeyword) ? null : rawKeyword;
  const name = String(raw.name ?? "").trim() || site || rawSite || "unnamed";
  const notes: string[] = [];
  if (!site) notes.push("domain not set (TODO)");
  else if (rawKeyword && !keyword) notes.push("keyword TODO: audit only");
  return { name, site, keyword, note: notes.join("; ") };
}

/** Split one CSV line; supports quoted fields with "" escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseSitesCsv(text: string): BatchSite[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const siteCol = header.findIndex((h) => h === "site" || h === "domain");
  if (siteCol < 0) throw new Error('sites CSV needs a header row with a "site" (or "domain") column');
  const col = (name: string): number => header.indexOf(name);
  return lines.slice(1).map((l) => {
    const f = splitCsvLine(l);
    return toSite({ site: f[siteCol], keyword: f[col("keyword")], name: f[col("name")] });
  });
}

export function parseSitesJson(text: string): BatchSite[] {
  const raw: unknown = JSON.parse(text);
  const list = Array.isArray(raw) ? raw : (raw as { sites?: unknown } | null)?.sites;
  if (!Array.isArray(list)) throw new Error('sites JSON must be an array or an object with a "sites" array');
  return list.map((e: unknown) => (typeof e === "string" ? toSite({ site: e }) : toSite((e ?? {}) as object)));
}

/** Parse a sites file; the format comes from the extension, else the first character. */
export function parseSites(text: string, filename = ""): BatchSite[] {
  const ext = extname(filename).toLowerCase();
  const json = ext === ".json" || (ext !== ".csv" && /^\s*[[{]/.test(text));
  const sites = json ? parseSitesJson(text) : parseSitesCsv(text);
  if (!sites.length) throw new Error("sites file lists no sites");
  return sites;
}

export async function loadSites(file: string): Promise<BatchSite[]> {
  return parseSites(await readFile(file, "utf8"), file);
}

interface StepResult {
  report: string;
  dossier: string;
  error: string;
}

export interface BatchSiteResult {
  name: string;
  site: string | null;
  keyword: string | null;
  status: "ok" | "partial" | "error" | "skipped";
  note: string;
  audit: StepResult | null;
  teardown: StepResult | null;
  spentUsd: number;
  actionsFrom: "teardown" | "audit" | "";
  topActions: TopAction[];
}

export interface BatchSummary {
  schemaVersion: "1";
  tool: "seo-rea";
  toolVersion: string;
  createdAt: string;
  finishedAt: string;
  sitesFile: string;
  spentUsd: number;
  sites: BatchSiteResult[];
}

/** Options shared by every audit and teardown in the batch. */
export type BatchRunOptions = Omit<TeardownOptions, "keyword" | "target" | "out" | "serpHtml" | "serpUrls">;

export interface BatchOptions extends BatchRunOptions {
  sites: BatchSite[];
  out: string;
  sitesFile?: string;
  /** Pause between sites (default 5000 ms). */
  siteDelayMs?: number;
}

export interface BatchDeps {
  runAudit: (o: AuditOptions) => Promise<{ dossier: Dossier; reportPath: string }>;
  runTeardown: (o: TeardownOptions) => Promise<{ dossier: Dossier }>;
  sleep: (ms: number) => Promise<void>;
}

async function defaultDeps(): Promise<BatchDeps> {
  const [{ runAudit }, { runTeardown }] = await Promise.all([import("./audit.js"), import("./teardown.js")]);
  return { runAudit, runTeardown, sleep };
}

const siteDir = (site: string): string => site.replace(/[^a-z0-9.-]+/gi, "-");

export async function runBatch(opts: BatchOptions, deps?: BatchDeps): Promise<BatchSummary> {
  const d = deps ?? (await defaultDeps());
  const now = opts.now ?? (() => new Date());
  const log = opts.log ?? (() => undefined);
  const out = resolve(opts.out);
  const { sites, sitesFile, siteDelayMs, out: _o, ...shared } = opts;
  await mkdir(out, { recursive: true });
  const summary: BatchSummary = {
    schemaVersion: "1",
    tool: "seo-rea",
    toolVersion: VERSION,
    createdAt: now().toISOString(),
    finishedAt: "",
    // Relative, so summaries do not carry local home-directory paths.
    sitesFile: sitesFile ? relative(process.cwd(), resolve(sitesFile)) : "",
    spentUsd: 0,
    sites: [],
  };
  let ran = 0;
  for (const s of sites) {
    const r: BatchSiteResult = {
      name: s.name,
      site: s.site,
      keyword: s.keyword,
      status: "skipped",
      note: s.note,
      audit: null,
      teardown: null,
      spentUsd: 0,
      actionsFrom: "",
      topActions: [],
    };
    summary.sites.push(r);
    if (!s.site) {
      log(`batch: skip ${s.name}: ${s.note}`);
      continue;
    }
    if (ran++ > 0) await d.sleep(siteDelayMs ?? 5000);
    const dir = join(out, siteDir(s.site));
    const rel = (p: string): string => relative(out, p);
    let auditDossier: Dossier | null = null;
    let teardownDossier: Dossier | null = null;
    log(`batch: audit ${s.site}`);
    try {
      const a = await d.runAudit({ ...shared, target: s.site, out: join(dir, "audit") });
      auditDossier = a.dossier;
      r.audit = { report: rel(a.reportPath), dossier: rel(join(dir, "audit", "report", "dossier.json")), error: "" };
    } catch (err) {
      r.audit = { report: "", dossier: "", error: errorMessage(err) };
    }
    if (s.keyword) {
      log(`batch: teardown ${s.site} "${s.keyword}"`);
      const tdOut = join(dir, "teardown");
      try {
        const t = await d.runTeardown({ ...shared, keyword: s.keyword, target: s.site, out: tdOut });
        teardownDossier = t.dossier;
        r.spentUsd = t.dossier.cost.spentUsd;
        r.teardown = {
          report: rel(join(tdOut, "report", "teardown.md")),
          dossier: rel(join(tdOut, "report", "dossier.json")),
          error: "",
        };
      } catch (err) {
        r.teardown = { report: "", dossier: "", error: errorMessage(err) };
      }
    }
    const best = teardownDossier ?? auditDossier;
    r.actionsFrom = teardownDossier ? "teardown" : auditDossier ? "audit" : "";
    r.topActions = best?.topActions.slice(0, 3) ?? [];
    const failed = [r.audit, r.teardown].filter((x) => x?.error).length;
    const steps = [r.audit, r.teardown].filter(Boolean).length;
    r.status = failed === 0 ? (r.note ? "partial" : "ok") : failed === steps ? "error" : "partial";
    summary.spentUsd += r.spentUsd;
  }
  summary.finishedAt = now().toISOString();
  await writeFile(join(out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(out, "summary.md"), renderSummary(summary));
  return summary;
}

export function renderSummary(s: BatchSummary): string {
  const L = [
    "# seo-rea batch summary",
    "",
    `Run ${s.createdAt} to ${s.finishedAt} with seo-rea ${s.toolVersion}. Paid spend: ${s.spentUsd.toFixed(4)} USD.`,
    "",
    "| Site | Keyword | Status | Reports | Note |",
    "|---|---|---|---|---|",
  ];
  for (const r of s.sites) {
    const reports = [r.audit?.report, r.teardown?.report]
      .filter(Boolean)
      .map((p) => `[${p}](${p})`)
      .join(", ");
    const errors = [r.audit?.error, r.teardown?.error].filter(Boolean).join("; ");
    L.push(
      `| ${cell(r.site ?? `${r.name} (TODO)`)} | ${cell(r.keyword ?? "-")} | ${r.status} | ${reports || "-"} | ${cell([r.note, errors].filter(Boolean).join("; ")) || "-"} |`,
    );
  }
  L.push("", "## Top 3 actions per site", "");
  for (const r of s.sites.filter((x) => x.site)) {
    L.push(`### ${r.site}`, "");
    if (!r.topActions.length) L.push("No actions (run failed or nothing found).", "");
    else {
      for (const a of r.topActions)
        L.push(`${a.rank}. ${a.title} (impact ${a.impact}, effort ${a.effort}, ${a.owner}). ${a.why}`);
      L.push("", `From the ${r.actionsFrom} dossier.`, "");
    }
  }
  return L.join("\n");
}
