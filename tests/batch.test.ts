import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDossier, type Dossier } from "../src/core/dossier.js";
import { deriveTopActions } from "../src/core/report/actions.js";
import { parseCli } from "../src/cli.js";
import {
  loadSites,
  parseSites,
  renderSummary,
  runBatch,
  splitCsvLine,
  type BatchDeps,
  type BatchSummary,
} from "../src/services/batch.js";
import { findings, withTarget } from "./dossier-fixture.js";
import { tmp } from "./helpers.js";

describe("sites file parsing", () => {
  it("reads JSON arrays, {sites} objects and bare strings", () => {
    expect(parseSites('[{"site":"https://www.A.com/x","keyword":"k1"},"b.org"]', "s.json")).toEqual([
      { name: "a.com", site: "a.com", keyword: "k1", note: "" },
      { name: "b.org", site: "b.org", keyword: null, note: "" },
    ]);
    expect(parseSites('{"sites":[{"name":"B","domain":"b.org"}]}')).toEqual([
      { name: "B", site: "b.org", keyword: null, note: "" },
    ]);
  });

  it("reads CSV with a header, quotes, comments and any column order", () => {
    const csv = [
      "# weekly desk sites",
      "keyword,site,name",
      '"cards, rewards",getcardlab.app,CardLab',
      ',remotenurse.org,"Remote ""Nurse"""',
      "",
    ].join("\n");
    expect(parseSites(csv, "sites.csv")).toEqual([
      { name: "CardLab", site: "getcardlab.app", keyword: "cards, rewards", note: "" },
      { name: 'Remote "Nurse"', site: "remotenurse.org", keyword: null, note: "" },
    ]);
    expect(splitCsvLine('a, "b,c" ,d')).toEqual(["a", "b,c", "d"]);
    expect(() => parseSites("name,keyword\nx,y", "s.csv")).toThrow(/"site"/);
    expect(() => parseSites("[]", "s.json")).toThrow(/no sites/);
    expect(() => parseSites('{"x":1}', "s.json")).toThrow(/"sites" array/);
  });

  it("marks TODO domains and keywords instead of guessing", () => {
    const [a, b] = parseSites('[{"name":"Vialie","site":"TODO"},{"site":"x.com","keyword":"TODO"}]');
    expect(a).toEqual({ name: "Vialie", site: null, keyword: null, note: "domain not set (TODO)" });
    expect(b).toEqual({ name: "x.com", site: "x.com", keyword: null, note: "keyword TODO: audit only" });
  });

  it("parses the desk example: 8 sites, 2 runnable", async () => {
    const sites = await loadSites(new URL("../examples/desk-sites.example.json", import.meta.url).pathname);
    expect(sites).toHaveLength(8);
    expect(sites.filter((s) => s.site).map((s) => [s.site, s.keyword])).toEqual([
      ["getcardlab.app", "credit card rewards app"],
      ["remotenurse.org", "remote nursing jobs"],
    ]);
  });

  it("parses the batch command", () => {
    const c = parseCli(["batch", "--sites", "s.json", "--site-delay-ms", "0", "--no-psi", "--json"]);
    expect(c.command).toBe("batch");
    if (c.command !== "batch") return;
    expect(c.options).toMatchObject({ siteDelayMs: 0, psi: false, json: true, budgetUsd: 0 });
    expect(c.options.out.endsWith("/out")).toBe(true);
    expect(() => parseCli(["batch"])).toThrow(/--sites/);
    expect(() => parseCli(["batch", "--sites", "s", "--keyword", "x"])).toThrow();
  });
});

function dossierFor(target: string, kind: Dossier["kind"], spentUsd = 0): Dossier {
  const f = withTarget(
    { domain: target, sitemap: { urlCount: 0, evidenceId: "E003" } },
    { kind, cost: { spentUsd, budgetUsd: 0 } },
  );
  const withLlms = {
    ...f,
    target: {
      ...f.target,
      aiReadiness: { ...f.target.aiReadiness, llmsTxt: { ...f.target.aiReadiness.llmsTxt, present: false } },
    },
  };
  return validateDossier({ ...withLlms, topActions: deriveTopActions(withLlms) });
}

describe("batch run", () => {
  it("runs audit for every site, teardown with a keyword, pauses between sites and writes summaries", async () => {
    const out = join(await tmp(), "out");
    const calls: string[] = [];
    const sleeps: number[] = [];
    const deps: BatchDeps = {
      runAudit: (o) => {
        calls.push(`audit ${o.target} -> ${o.out}`);
        if (o.target === "down.com") return Promise.reject(new Error("HTTP 503"));
        return Promise.resolve({
          dossier: dossierFor(o.target, "audit"),
          reportPath: join(o.out, "report", "audit.md"),
        });
      },
      runTeardown: (o) => {
        calls.push(`teardown ${o.target} "${o.keyword}" budget ${o.budgetUsd}`);
        return Promise.resolve({ dossier: dossierFor(o.target, "teardown", 0.002) });
      },
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    };
    const summary = await runBatch(
      {
        sites: parseSites('[{"site":"a.com","keyword":"k"},{"name":"Vialie","site":"TODO"},"down.com"]'),
        out,
        budgetUsd: 0,
        siteDelayMs: 1234,
        sitesFile: join(process.cwd(), "desk", "sites.json"),
        now: () => new Date("2026-10-14T12:00:00Z"),
      },
      deps,
    );
    expect(calls).toEqual([
      `audit a.com -> ${join(out, "a.com", "audit")}`,
      'teardown a.com "k" budget 0',
      `audit down.com -> ${join(out, "down.com", "audit")}`,
    ]);
    expect(sleeps).toEqual([1234]);
    expect(summary.sites.map((s) => s.status)).toEqual(["ok", "skipped", "error"]);
    expect(summary.sites[0]).toMatchObject({
      actionsFrom: "teardown",
      audit: { report: join("a.com", "audit", "report", "audit.md"), error: "" },
      teardown: { dossier: join("a.com", "teardown", "report", "dossier.json") },
    });
    expect(summary.sites[0]?.topActions.length).toBeLessThanOrEqual(3);
    expect(summary.sites[2]?.audit?.error).toBe("HTTP 503");
    expect(summary.spentUsd).toBeCloseTo(0.002);
    const onDisk = JSON.parse(await readFile(join(out, "summary.json"), "utf8")) as BatchSummary;
    expect(onDisk.sites).toHaveLength(3);
    expect(onDisk.sitesFile).toBe(join("desk", "sites.json"));
    const md = await readFile(join(out, "summary.md"), "utf8");
    expect(md).toBe(renderSummary(onDisk));
  });

  it("renders per-site top 3 actions", () => {
    const top = deriveTopActions(findings({ ...withTarget({ sitemap: { urlCount: 0, evidenceId: "E003" } }) }));
    const s: BatchSummary = {
      schemaVersion: "1",
      tool: "seo-rea",
      toolVersion: "0.3.0",
      createdAt: "2026-10-14T12:00:00.000Z",
      finishedAt: "2026-10-14T12:10:00.000Z",
      sitesFile: "sites.json",
      spentUsd: 0,
      sites: [
        {
          name: "CardLab",
          site: "getcardlab.app",
          keyword: "credit card rewards app",
          status: "ok",
          note: "",
          audit: { report: "getcardlab.app/audit/report/audit.md", dossier: "", error: "" },
          teardown: null,
          spentUsd: 0,
          actionsFrom: "audit",
          topActions: top.slice(0, 3),
        },
        {
          name: "Soltura",
          site: null,
          keyword: null,
          status: "skipped",
          note: "domain not set (TODO)",
          audit: null,
          teardown: null,
          spentUsd: 0,
          actionsFrom: "",
          topActions: [],
        },
      ],
    };
    const md = renderSummary(s);
    expect(md).toContain(
      "| getcardlab.app | credit card rewards app | ok | [getcardlab.app/audit/report/audit.md](getcardlab.app/audit/report/audit.md) | - |",
    );
    expect(md).toContain("| Soltura (TODO) | - | skipped | - | domain not set (TODO) |");
    expect(md).toContain("### getcardlab.app");
    expect(md).toMatch(/1\. Publish \/sitemap.xml and reference it in robots.txt \(impact medium, effort S, dev\)/);
    expect(md).not.toContain("### Soltura");
  });
});
