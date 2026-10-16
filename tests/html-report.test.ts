import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCli } from "../src/cli.js";
import { validateCrawl } from "../src/core/crawl/schema.js";
import { positionBuckets, renderCrawlHtml, renderReverseHtml } from "../src/core/html/render.js";
import { barChart, columnChart, donutChart, esc, pairedBars } from "../src/core/html/svg.js";
import { validateReverse } from "../src/core/reverse/schema.js";
import { runCrawl } from "../src/services/crawl.js";
import { runDiff } from "../src/services/diff.js";
import { writeHtmlReports } from "../src/services/html-report.js";
import { SITE, fakeFetch } from "./crawl-site.js";

const EX = "examples/reverse-cardpointers-rankings/report";
const load = async (f: string): Promise<unknown> => JSON.parse(await readFile(join(EX, f), "utf8")) as unknown;
const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-html-"));
const quiet = (): void => {};

/** Self-contained: no scripts, no external stylesheets/images/fonts, balanced SVGs. */
function assertSelfContained(html: string): void {
  expect(html.startsWith("<!doctype html>")).toBe(true);
  expect(html).not.toMatch(/<script\b/i);
  expect(html).not.toMatch(/<link\b/i);
  expect(html).not.toMatch(/\bsrc=["']https?:/i);
  expect(html).not.toMatch(/url\(\s*["']?https?:/i);
  expect(html).not.toMatch(/@import/i);
  expect(html.match(/<svg\b/g)?.length ?? 0).toBe(html.match(/<\/svg>/g)?.length ?? -1);
  expect(html).not.toMatch(/NaN|Infinity|undefined px/);
}

describe("svg charts", () => {
  it("escapes labels and handles empty data", () => {
    const svg = barChart("T<1>", [{ label: `<script>"x"&`, value: 3 }]);
    expect(svg).toContain("&lt;script&gt;&quot;x&quot;&amp;");
    expect(svg).not.toContain("<script>");
    expect(barChart("Empty", [])).toContain("no data");
    expect(donutChart("Zero", [{ label: "a", value: 0 }])).toContain("no data");
    expect(esc("'")).toBe("&#39;");
  });

  it("scales bars to the largest value and draws one arc per non-zero slice", () => {
    const svg = barChart("x", [
      { label: "a", value: 10 },
      { label: "b", value: 5 },
    ]);
    const widths = [...svg.matchAll(/<rect [^>]*width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(widths[0]).toBeCloseTo((widths[1] ?? 0) * 2, 0);
    const donut = donutChart("d", [
      { label: "a", value: 1 },
      { label: "b", value: 0 },
      { label: "c", value: 3 },
    ]);
    expect(donut.match(/<circle/g)?.length).toBe(2);
    expect(donut).toContain("(75%)");
    expect(columnChart("c", [{ label: "depth 0", value: 1 }])).toContain("depth 0");
    expect(pairedBars("p", [{ label: "m", before: 2, after: 5 }])).toContain("2 → 5 (+3)");
  });

  it("buckets ranking positions", () => {
    const b = positionBuckets([1, 2, 3, 7, 15, 30, 99, null]);
    expect(b.map((x) => x.value)).toEqual([1, 2, 1, 1, 1, 1]);
  });
});

describe("HTML reports", () => {
  it("renders the real cardpointers reverse run with every ranking chart", async () => {
    const r = validateReverse(await load("reverse.json"));
    const crawl = validateCrawl(await load("crawl.json"));
    const html = renderReverseHtml(r, crawl);
    assertSelfContained(html);
    for (const t of [
      "Executive summary",
      "Ranking position distribution",
      "Estimated traffic by section",
      "Top keywords by estimated traffic",
      "Search intent mix",
      "Keywords shared with competitors",
      "Pages by click depth",
      "Issues by severity",
      "Page-two and near-miss opportunities",
    ]) {
      expect(html).toContain(t);
    }
    expect(html).toContain("nerdwallet.com");
    expect(html).toContain("academy credit card");
    expect(html.match(/<svg\b/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("degrades without rankings and renders a crawl", async () => {
    const r = validateReverse({ ...((await load("reverse.json")) as Record<string, unknown>), rankings: null });
    const html = renderReverseHtml(r);
    assertSelfContained(html);
    expect(html).not.toContain("Ranking position distribution");
    expect(html).toContain("Schema types");
    const crawlHtml = renderCrawlHtml(validateCrawl(await load("crawl.json")));
    assertSelfContained(crawlHtml);
    expect(crawlHtml).toContain("Issues by rule");
  });

  it("writes crawl.html and diff.html next to the JSON reports", async () => {
    const a = await tmp();
    await runCrawl({ domain: "example.com", out: a, maxPages: 100, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
    const original = structuredClone(SITE);
    SITE["https://example.com/d4"] = { status: 500, body: "oops" };
    const b = await tmp();
    try {
      await runCrawl({ domain: "example.com", out: b, maxPages: 100, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
    } finally {
      for (const k of Object.keys(SITE)) delete SITE[k];
      Object.assign(SITE, original);
    }
    const d = await tmp();
    await runDiff({ oldRun: a, newRun: b, out: d });
    expect(await writeHtmlReports(a)).toEqual([join(a, "report", "crawl.html")]);
    const [diffHtml] = await writeHtmlReports(d);
    expect(diffHtml).toBe(join(d, "report", "diff.html"));
    const html = await readFile(diffHtml ?? "", "utf8");
    assertSelfContained(html);
    expect(html).toContain("Metrics before → after");
    expect(html).toContain("Findings by status");
    expect(await readdir(join(d, "report"))).toContain("diff.html");
    await expect(writeHtmlReports(await tmp())).rejects.toThrow(/no report/);
  });

  it("parses --html on crawl, reverse, diff and the html command", () => {
    const c = parseCli(["crawl", "example.com", "--html"]);
    expect(c.command === "crawl" && c.options.html).toBe(true);
    const r = parseCli(["reverse", "example.com", "--html"]);
    expect(r.command === "reverse" && r.options.html).toBe(true);
    const d = parseCli(["diff", "a", "b", "--out", "x", "--html"]);
    expect(d.command === "diff" && d.options.html).toBe(true);
    expect(() => parseCli(["diff", "a", "b", "--html"])).toThrow(/--out/);
    const h = parseCli(["html", "runs/x"]);
    expect(h.command === "html" && h.run.endsWith("runs/x")).toBe(true);
  });
});
