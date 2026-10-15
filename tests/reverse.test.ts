import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCli } from "../src/cli.js";
import type { CrawlPage } from "../src/core/crawl/schema.js";
import { detectProgrammatic, headTerms, templateOf, tokens } from "../src/core/reverse/infer.js";
import { reverseJsonSchema, validateReverse } from "../src/core/reverse/schema.js";
import { runCrawl } from "../src/services/crawl.js";
import { brandTokens, runReverse } from "../src/services/reverse.js";
import { fakeFetch } from "./crawl-site.js";

const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-rev-"));
const quiet = (): void => {};
const START = "https://x.com/";

const page = (url: string, over: Partial<CrawlPage> = {}): CrawlPage => ({
  url,
  finalUrl: url,
  status: 200,
  depth: 1,
  source: "link",
  contentType: "text/html",
  title: "",
  metaDescription: "",
  metaRobots: "",
  canonical: "",
  h1: [],
  h2Count: 3,
  wordCount: 500,
  lang: "en",
  hreflang: [],
  schemaTypes: [],
  internalLinks: [],
  externalLinkCount: 0,
  externalDomains: [],
  published: "",
  modified: "",
  tech: [],
  contentHash: url,
  fetchedAt: "",
  ...over,
});

describe("inference helpers", () => {
  it("classifies templates", () => {
    expect(templateOf(page(START), START)).toBe("home");
    expect(templateOf(page("https://x.com/blog/how-to-earn-points"), START)).toBe("article");
    expect(templateOf(page("https://x.com/a", { schemaTypes: ["BlogPosting"] }), START)).toBe("article");
    expect(templateOf(page("https://x.com/amex-vs-chase"), START)).toBe("comparison");
    expect(templateOf(page("https://x.com/x", { title: "Best travel cards" }), START)).toBe("comparison");
    expect(templateOf(page("https://x.com/calculators/points"), START)).toBe("tool");
    expect(templateOf(page("https://x.com/blog/topic/taxes"), START)).toBe("category");
    expect(templateOf(page("https://x.com/privacy"), START)).toBe("legal");
    expect(templateOf(page("https://x.com/help/login"), START)).toBe("help");
    expect(templateOf(page("https://x.com/pricing"), START)).toBe("product");
    expect(templateOf(page("https://x.com/about"), START)).toBe("other");
    expect(templateOf(page("https://x.com/offers/joes-pizza-5-back"), START)).toBe("entity");
  });

  it("finds head terms without brand words", () => {
    expect(tokens("CardLab: the best Credit Card app", new Set(["cardlab"]))).toEqual(["credit", "card"]);
    const pages = [
      page("https://x.com/a", { title: "Credit card rewards guide", h1: ["Credit card rewards"] }),
      page("https://x.com/b", { title: "Credit card rewards for travel" }),
      page("https://x.com/c", { title: "Travel insurance basics" }),
    ];
    const t = headTerms(pages, new Set());
    expect(
      t
        .slice(0, 2)
        .map((k) => k.term)
        .toSorted(),
    ).toEqual(["card rewards", "credit card"]);
    expect(t.find((k) => k.term === "card rewards")?.pages).toBe(2);
    expect(t.some((k) => k.term === "credit")).toBe(false);
  });

  it("derives brand tokens from the domain", () => {
    expect(brandTokens("getcardlab.app")).toEqual(["getcardlab", "cardlab"]);
    expect(brandTokens("cardpointers.com")).toEqual(["cardpointers"]);
  });

  it("detects programmatic patterns", () => {
    const list = Array.from({ length: 12 }, (_, i) =>
      page(`https://x.com/cards/card-${i}`, { title: `Card ${i} review and rewards rates` }),
    );
    const p = detectProgrammatic(list);
    expect(p[0]).toMatchObject({
      pattern: "/cards/*",
      pages: 12,
      titlePattern: "... rewards rates",
    });
    expect(detectProgrammatic(list.slice(0, 5))).toEqual([]);
    const offers = Array.from({ length: 10 }, (_, i) =>
      page(`https://x.com/offers/m-${i}`, { title: `Merchant ${i}: 5% Back | Brand`, h2Count: i }),
    );
    expect(detectProgrammatic(offers)[0]?.titlePattern).toBe("... 5% back");
  });
});

describe("reverse command", () => {
  it("writes an evidence-backed strategy report from a crawl, free only", async () => {
    const out = await tmp();
    const { report, reportPath } = await runReverse({
      domain: "example.com",
      out,
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
      now: () => new Date("2026-10-15T00:00:00Z"),
    });
    expect(() => validateReverse(report)).not.toThrow();
    expect(report.cost).toEqual({ usd: 0, paidCalls: 0 });
    expect(report.coverage.pagesCrawled).toBeGreaterThan(5);
    expect(report.summary.length).toBeGreaterThan(2);
    const index = JSON.parse(await readFile(join(out, "evidence", "index.json"), "utf8")) as Array<{ id: string }>;
    const known = new Set(index.map((e) => e.id));
    for (const s of report.summary) for (const id of s.evidenceIds) expect(known, id).toContain(id);
    for (const p of report.playbook) for (const id of p.evidenceIds) expect(known, id).toContain(id);
    expect(report.offpage.trancoRank).toBeNull();
    expect(report.aeo.aiCrawlers.length).toBeGreaterThan(0);
    expect(report.unknowns.join(" ")).toMatch(/Backlinks/);
    const md = await readFile(reportPath, "utf8");
    expect(md).toContain("## 1. The strategy in brief");
    expect(md).toContain("## 10. Playbook: what to copy");
  });

  it("reuses an existing crawl without fetching pages again", async () => {
    const crawlOut = await tmp();
    await runCrawl({ domain: "example.com", out: crawlOut, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
    const calls: string[] = [];
    const { report } = await runReverse({
      domain: "example.com",
      out: await tmp(),
      fromCrawl: crawlOut,
      offpage: false,
      delayMs: 0,
      fetchImpl: fakeFetch(calls),
      log: quiet,
    });
    expect(calls.every((c) => /robots\.txt|llms(-full)?\.txt/.test(c))).toBe(true);
    expect(report.offpage.evidenceIds).toHaveLength(1);
    await expect(
      runReverse({
        domain: "other.com",
        out: await tmp(),
        fromCrawl: crawlOut,
        offpage: false,
        fetchImpl: fakeFetch(),
        log: quiet,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      runReverse({
        domain: "example.com",
        out: await tmp(),
        fromCrawl: await tmp(),
        fetchImpl: fakeFetch(),
        log: quiet,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("parses the CLI and keeps the schema doc in sync", async () => {
    expect(parseCli(["reverse", "cardpointers.com", "--max-pages", "200", "--no-offpage"])).toMatchObject({
      command: "reverse",
      options: { domain: "cardpointers.com", maxPages: 200, offpage: false, fromCrawl: null },
    });
    expect(() => parseCli(["reverse"])).toThrow(/needs a domain/);
    expect(JSON.parse(await readFile("docs/reverse-schema.json", "utf8"))).toEqual(reverseJsonSchema());
  });
});
