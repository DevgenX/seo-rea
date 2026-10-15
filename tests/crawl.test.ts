import { mkdtemp, readFile, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCli } from "../src/cli.js";
import { analyzeCrawl, buildGraph } from "../src/core/crawl/analyze.js";
import { detectTech, extractDates } from "../src/core/crawl/extract.js";
import { crawlJsonSchema, validateCrawl } from "../src/core/crawl/schema.js";
import { loadPages, loadState, pagesPath, statePath } from "../src/core/crawl/state.js";
import { inScope, isAssetUrl, normalizeUrl } from "../src/core/crawl/url.js";
import { SeoReaError } from "../src/core/errors.js";
import { issueId } from "../src/core/issues.js";
import { runCrawl } from "../src/services/crawl.js";
import { fakeFetch } from "./crawl-site.js";

const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-crawl-"));
const quiet = (): void => {};

describe("crawl url rules", () => {
  it("normalises urls", () => {
    expect(normalizeUrl("HTTPS://Example.com/a?utm_source=x&b=2&a=1#frag")).toBe("https://example.com/a?a=1&b=2");
    expect(normalizeUrl("/x", "https://example.com/y")).toBe("https://example.com/x");
    expect(normalizeUrl("mailto:a@b.c")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
  it("scopes to the host, ignoring www", () => {
    expect(inScope("https://www.example.com/x", "example.com")).toBe(true);
    expect(inScope("https://blog.example.com/x", "example.com")).toBe(false);
    expect(isAssetUrl("https://example.com/a.pdf")).toBe(true);
    expect(isAssetUrl("https://example.com/a")).toBe(false);
  });
  it("fingerprints stack and dates", () => {
    expect(detectTech('<meta name="generator" content="WordPress 6.6"><script src="/wp-content/x.js">')).toEqual([
      "generator: WordPress 6.6",
      "WordPress",
    ]);
    expect(detectTech('<script id="__NEXT_DATA__">')).toContain("Next.js");
    expect(extractDates('<script type="application/ld+json">{"datePublished":"2026-01-02"}</script>').published).toBe(
      "2026-01-02T00:00:00.000Z",
    );
  });
});

describe("crawler", () => {
  it("crawls breadth-first, respects robots.txt and finds site issues", async () => {
    const out = await tmp();
    const calls: string[] = [];
    const { report } = await runCrawl({
      domain: "example.com",
      out,
      delayMs: 0,
      fetchImpl: fakeFetch(calls),
      log: quiet,
    });
    expect(() => validateCrawl(report)).not.toThrow();
    expect(calls).not.toContain("https://example.com/private/x");
    expect(calls).not.toContain("https://example.com/logo.png");
    expect(calls.filter((c) => c === "https://example.com/a")).toHaveLength(1);
    expect(report.stats.complete).toBe(true);
    expect(report.stats.blockedByRobots).toBe(1);
    const rules = new Set(report.issues.map((i) => i.rule));
    for (const r of [
      "CRAWL-HTTP-4XX",
      "CRAWL-REDIRECTED-LINK",
      "CRAWL-SITEMAP-NOT-OK",
      "CRAWL-NOINDEX-IN-SITEMAP",
      "CRAWL-TITLE-DUPLICATE",
      "CRAWL-THIN-CONTENT",
      "CRAWL-ORPHAN",
      "CRAWL-DEEP-PAGE",
      "CRAWL-NOT-IN-SITEMAP",
      "CRAWL-BLOCKED-LINKED",
    ])
      expect(rules, r).toContain(r);
    const orphan = report.issues.find((i) => i.rule === "CRAWL-ORPHAN");
    expect(orphan?.url).toBe("https://example.com/orphan");
    expect(orphan?.id).toBe(issueId("CRAWL-ORPHAN", "https://example.com/orphan"));
    const deep = report.issues.find((i) => i.rule === "CRAWL-DEEP-PAGE");
    expect(deep?.url).toBe("https://example.com/d4");
    expect(report.graph.inlinks[0]?.url).toBe("https://example.com/");
    const sum = report.graph.pagerank.reduce((s, x) => s + x.score, 0);
    expect(sum).toBeGreaterThan(0.9);
    const md = await readFile(join(out, "report", "crawl.md"), "utf8");
    expect(md).toContain("`CRAWL-ORPHAN:");
  });

  it("gives the same issue ids on a second run", async () => {
    const a = await runCrawl({
      domain: "example.com",
      out: await tmp(),
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
    });
    const b = await runCrawl({
      domain: "example.com",
      out: await tmp(),
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
    });
    expect(b.report.issues.map((i) => i.id)).toEqual(a.report.issues.map((i) => i.id));
  });

  it("stops at maxPages and resumes without refetching", async () => {
    const out = await tmp();
    const first = await runCrawl({
      domain: "example.com",
      out,
      maxPages: 3,
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
    });
    expect(first.report.stats.pagesCrawled).toBe(3);
    expect(first.report.stats.complete).toBe(false);
    expect(first.report.stats.queuedLeft).toBeGreaterThan(0);
    const calls: string[] = [];
    const second = await runCrawl({
      domain: "example.com",
      out,
      maxPages: 100,
      delayMs: 0,
      fetchImpl: fakeFetch(calls),
      log: quiet,
    });
    expect(second.report.stats.resumed).toBe(true);
    expect(second.report.stats.complete).toBe(true);
    const firstUrls = first.report.pages.map((p) => p.url);
    for (const u of firstUrls) expect(calls).not.toContain(u);
    const all = second.report.pages.map((p) => p.url);
    expect(new Set(all).size).toBe(all.length);
    const fresh = await runCrawl({
      domain: "example.com",
      out: await tmp(),
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
    });
    expect(all.toSorted()).toEqual(fresh.report.pages.map((p) => p.url).toSorted());
  });

  it("aborts cleanly and keeps state for resume", async () => {
    const out = await tmp();
    const ac = new AbortController();
    ac.abort();
    const r = await runCrawl({
      domain: "example.com",
      out,
      delayMs: 0,
      fetchImpl: fakeFetch(),
      signal: ac.signal,
      log: quiet,
    });
    expect(r.report.stats.pagesCrawled).toBe(0);
    expect((await loadState(out, "example.com"))?.queue.length).toBeGreaterThan(0);
  });

  it("drops a torn last line in pages.jsonl", async () => {
    const out = await tmp();
    await runCrawl({ domain: "example.com", out, maxPages: 2, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
    await appendFile(pagesPath(out), '{"url":"https://example.com/tor');
    expect(await loadPages(out)).toHaveLength(2);
  });

  it("refuses a state for another domain or a corrupt one", async () => {
    const out = await tmp();
    await runCrawl({ domain: "example.com", out, maxPages: 1, delayMs: 0, fetchImpl: fakeFetch(), log: quiet });
    await expect(loadState(out, "other.com")).rejects.toMatchObject({ code: "CRAWL_STATE_INVALID" });
    await writeFile(statePath(out), "{nope");
    const e = await loadState(out, "example.com").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(SeoReaError);
    expect((e as SeoReaError).code).toBe("CRAWL_STATE_INVALID");
    const forced = await runCrawl({
      domain: "example.com",
      out,
      force: true,
      maxPages: 1,
      delayMs: 0,
      fetchImpl: fakeFetch(),
      log: quiet,
    });
    expect(forced.report.stats.resumed).toBe(false);
  });

  it("reports FETCH_FAILED when the start page is unreachable", async () => {
    const down = (async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as typeof fetch;
    await expect(
      runCrawl({ domain: "down.example", out: await tmp(), delayMs: 0, fetchImpl: down, log: quiet }),
    ).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
  });
});

const page = (url: string, links: string[], finalUrl = url) => ({
  url,
  finalUrl,
  status: 200,
  depth: 0,
  source: "link" as const,
  contentType: "text/html",
  title: url,
  metaDescription: "d",
  metaRobots: "",
  canonical: "",
  h1: ["h"],
  h2Count: 0,
  wordCount: 500,
  lang: "en",
  hreflang: [],
  schemaTypes: [],
  internalLinks: links,
  externalLinkCount: 0,
  externalDomains: [],
  published: "",
  modified: "",
  tech: [],
  contentHash: url,
  fetchedAt: "",
});

describe("crawl analysis", () => {
  it("computes click depth through redirects", () => {
    const pages = [
      page("https://x.com/", ["https://x.com/r"]),
      page("https://x.com/r", ["https://x.com/b"], "https://x.com/a"),
      page("https://x.com/b", []),
    ];
    const g = buildGraph(pages, "https://x.com/");
    expect(g.clickDepth.get("https://x.com/b")).toBe(2);
    const a = analyzeCrawl({ pages, startUrl: "https://x.com/", sitemapUrls: [], blocked: [] });
    expect(a.issues.some((i) => i.rule === "CRAWL-ORPHAN")).toBe(false);
  });
});

describe("crawl schema and CLI", () => {
  it("keeps docs/crawl-schema.json in sync", async () => {
    expect(JSON.parse(await readFile("docs/crawl-schema.json", "utf8"))).toEqual(crawlJsonSchema());
  });
  it("parses crawl options", () => {
    const c = parseCli(["crawl", "https://www.Example.com/", "--max-pages", "1200", "--delay-ms", "100", "--force"]);
    expect(c).toMatchObject({
      command: "crawl",
      options: { domain: "example.com", maxPages: 1200, delayMs: 100, force: true, maxDepth: 10 },
    });
    expect(() => parseCli(["crawl", "example.com", "--max-pages", "6000"])).toThrow(/between 1 and 5000/);
    expect(() => parseCli(["crawl"])).toThrow(/needs a domain/);
  });
});
