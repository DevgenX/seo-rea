import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCli } from "../src/cli.js";
import { DiffReportSchema, diffJsonSchema } from "../src/core/diff/schema.js";
import { runCrawl } from "../src/services/crawl.js";
import { resolveReport, runDiff } from "../src/services/diff.js";
import { SITE, fakeFetch } from "./crawl-site.js";

const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-diff-"));
const quiet = (): void => {};
const crawl = async (maxPages = 100): Promise<string> => {
  const out = await tmp();
  await runCrawl({ domain: "example.com", out, maxPages, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
  return out;
};
const original = structuredClone(SITE);
afterEach(() => {
  for (const k of Object.keys(SITE)) delete SITE[k];
  Object.assign(SITE, structuredClone(original));
});

describe("diff of two crawls", () => {
  it("classifies fixed, new, regressed and unchanged by stable id", async () => {
    const before = await crawl();
    SITE["https://example.com/missing"] = { body: SITE["https://example.com/a"]?.body?.replace("Same", "Found") ?? "" };
    SITE["https://example.com/d4"] = { status: 500, body: "oops" };
    const orphan = SITE["https://example.com/orphan"];
    if (orphan?.body) orphan.body = orphan.body.replace(/Orphan/g, "Same");
    const after = await crawl();
    const out = await tmp();
    const { diff, reportPath } = await runDiff({ oldRun: before, newRun: after, out });
    expect(() => DiffReportSchema.parse(diff)).not.toThrow();
    const by = (s: string) => diff.items.filter((i) => i.status === s).map((i) => i.rule);
    expect(by("fixed")).toContain("CRAWL-HTTP-4XX");
    expect(by("fixed")).toContain("CRAWL-DEEP-PAGE");
    expect(by("new")).toContain("CRAWL-HTTP-5XX");
    const dup = diff.items.find((i) => i.rule === "CRAWL-TITLE-DUPLICATE");
    expect(dup).toMatchObject({ status: "regressed", detail: "pages involved 2 -> 3" });
    expect(by("unchanged")).toContain("CRAWL-THIN-CONTENT");
    expect(diff.counts.fixed).toBe(diff.items.filter((i) => i.status === "fixed").length);
    expect(diff.metrics.find((m) => m.name === "issues (high)")).toBeDefined();
    const md = await readFile(reportPath as string, "utf8");
    expect(md).toMatch(/## Regressed \(2\)/);
    expect(by("regressed").toSorted()).toEqual(["CRAWL-META-DESCRIPTION-DUPLICATE", "CRAWL-TITLE-DUPLICATE"]);
    expect(JSON.parse(await readFile(join(out, "report", "diff.json"), "utf8")).kind).toBe("diff");
  });

  it("does not call issues fixed when their pages were not crawled", async () => {
    const before = await crawl();
    const after = await crawl(2);
    const { diff } = await runDiff({ oldRun: before, newRun: after });
    expect(diff.counts.notRechecked).toBeGreaterThan(0);
    expect(diff.items.find((i) => i.rule === "CRAWL-DEEP-PAGE")?.status).toBe("not-rechecked");
    expect(diff.notes.join(" ")).toMatch(/max-pages/);
  });

  it("reports no changes for identical runs", async () => {
    const a = await crawl();
    const { diff } = await runDiff({ oldRun: a, newRun: a });
    expect(diff.counts).toMatchObject({ fixed: 0, new: 0, regressed: 0, improved: 0 });
    expect(diff.counts.unchanged).toBe(diff.items.length);
  });
});

describe("diff of dossiers", () => {
  it("compares top actions and flags the top-10 caveat", async () => {
    const src = "examples/cardlab-teardown/report/dossier.json";
    const d = JSON.parse(await readFile(src, "utf8"));
    const [first, second, ...rest] = d.topActions;
    d.runId = "20261022T000000Z";
    d.topActions = [
      { ...second, impact: second.impact === "high" ? "low" : "high" },
      ...rest,
      { ...first, id: "SCHEMA-NEW-THING", rank: 99 },
    ];
    const dir = await tmp();
    await mkdir(join(dir, "report"));
    await writeFile(join(dir, "report", "dossier.json"), JSON.stringify(d));
    const { diff } = await runDiff({ oldRun: src, newRun: dir });
    expect(diff.sourceKind).toBe("teardown");
    expect(diff.items.find((i) => i.id === first.id)?.status).toBe("fixed");
    expect(diff.items.find((i) => i.id === "SCHEMA-NEW-THING")?.status).toBe("new");
    expect(["regressed", "improved"]).toContain(diff.items.find((i) => i.id === second.id)?.status);
    expect(diff.notes.join(" ")).toMatch(/top 10/);
  });
});

describe("diff errors", () => {
  it("refuses runs of different kinds or domains", async () => {
    const c = await crawl();
    await expect(runDiff({ oldRun: c, newRun: "examples/cardlab-audit" })).rejects.toMatchObject({
      code: "DIFF_INCOMPATIBLE",
    });
    await expect(
      runDiff({ oldRun: "examples/cardlab-audit", newRun: "examples/desk-batch/remotenurse.org/audit" }),
    ).rejects.toMatchObject({ code: "DIFF_INCOMPATIBLE" });
  });
  it("reports missing runs", async () => {
    await expect(resolveReport(await tmp())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(resolveReport("/nope/x.json")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("parses the CLI and keeps the schema doc in sync", async () => {
    expect(parseCli(["diff", "a", "b", "--json"])).toMatchObject({
      command: "diff",
      options: { json: true, out: null },
    });
    expect(() => parseCli(["diff", "a"])).toThrow(/two runs/);
    expect(JSON.parse(await readFile("docs/diff-schema.json", "utf8"))).toEqual(diffJsonSchema());
  });
});
