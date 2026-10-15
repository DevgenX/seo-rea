import { describe, expect, it } from "vitest";
import {
  AI_CRAWLERS,
  aiReadinessAdapter,
  checkAiCrawlers,
  llmsReportFrom,
  validateLlmsTxt,
} from "../src/adapters/ai-readiness.js";
import { isAllowed, parseRobots, parseSitemap, siteFilesAdapter } from "../src/adapters/site.js";
import type { FetchResult } from "../src/core/types.js";
import { fakeCtx, fx, html } from "./helpers.js";

describe("robots.txt", () => {
  const r = parseRobots(fx("robots.txt"));

  it("parses groups and sitemaps", () => {
    expect(r.sitemaps).toEqual(["https://example.com/sitemap_index.xml"]);
    expect(r.groups).toHaveLength(2);
    expect(r.groups[1]?.agents).toEqual(["*", "seo-rea"]);
  });

  it("applies longest-match rules per agent", () => {
    expect(isAllowed(r, "seo-rea", "https://example.com/nogoogle")).toBe(true);
    expect(isAllowed(r, "Googlebot", "https://example.com/nogoogle")).toBe(false);
    expect(isAllowed(r, "seo-rea", "https://example.com/private/x")).toBe(false);
    expect(isAllowed(r, "seo-rea", "https://example.com/private/public-page")).toBe(true);
    expect(isAllowed(r, "seo-rea", "https://example.com/files/a.pdf")).toBe(false);
    expect(isAllowed(r, "seo-rea", "https://example.com/files/a.pdf?x=1")).toBe(true);
    expect(isAllowed(parseRobots(""), "seo-rea", "https://example.com/anything")).toBe(true);
  });
});

describe("sitemaps", () => {
  it("parses indexes, CDATA and entities", () => {
    expect(parseSitemap(fx("sitemap-index.xml"))).toEqual({
      kind: "index",
      locs: ["https://example.com/sitemap-pages.xml", "https://example.com/sitemap-posts.xml?a=1&b=2"],
    });
    expect(parseSitemap(fx("sitemap.xml"))).toEqual({
      kind: "urlset",
      locs: ["https://example.com/", "https://example.com/a?x=1&y=2"],
    });
    expect(parseSitemap("<html></html>").kind).toBe("unknown");
  });

  it("follows robots Sitemap lines and indexes", async () => {
    const ctx = fakeCtx(async (input) => {
      const u = new URL(String(input));
      if (u.pathname === "/robots.txt")
        return html("User-agent: *\nSitemap: https://ex.com/idx.xml", 200, "text/plain");
      if (u.pathname === "/idx.xml")
        return html("<sitemapindex><sitemap><loc>https://ex.com/a.xml</loc></sitemap></sitemapindex>");
      if (u.pathname === "/a.xml") return html("<urlset><url><loc>https://ex.com/p</loc></url></urlset>");
      return html("", 404);
    });
    const s = await siteFilesAdapter.run({ origin: "https://ex.com" }, ctx);
    expect(s.sitemapUrls).toEqual(["https://ex.com/p"]);
    expect(s.sitemapSources.map((x) => x.kind)).toEqual(["index", "urlset"]);
  });
});

describe("AI crawlers", () => {
  const checks = checkAiCrawlers(parseRobots(fx("robots-ai.txt")), "https://example.com");
  const access = (t: string) => checks.find((c) => c.token === t);

  it("covers the required crawler tokens", () => {
    const tokens = AI_CRAWLERS.map((c) => c.token);
    for (const t of [
      "GPTBot",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "CCBot",
      "OAI-SearchBot",
      "Applebot-Extended",
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it("reads explicit groups, shared groups and the * fallback", () => {
    expect(access("GPTBot")).toMatchObject({ access: "blocked", explicit: true });
    expect(access("CCBot")).toMatchObject({ access: "blocked", explicit: true });
    expect(access("Google-Extended")).toMatchObject({ access: "blocked", explicit: true });
    expect(access("PerplexityBot")).toMatchObject({ access: "partial", explicit: true });
    expect(access("ClaudeBot")).toMatchObject({ access: "partial", explicit: false });
    expect(access("ClaudeBot")?.rule).toMatch(/falls back to \*/);
    expect(checkAiCrawlers(parseRobots(""), "https://e.com")[0]).toMatchObject({ access: "allowed" });
  });
});

describe("llms.txt", () => {
  it("accepts a well-formed file", () => {
    const v = validateLlmsTxt(fx("llms.txt"));
    expect(v).toMatchObject({
      valid: true,
      title: "CardLab",
      sections: ["Docs", "Optional"],
      errors: [],
      warnings: [],
    });
    expect(v.summary).toMatch(/which credit card/);
    expect(v.links.map((l) => l.url)).toEqual([
      "https://getcardlab.app/features",
      "/pricing",
      "https://getcardlab.app/press",
    ]);
    expect(v.links[2]?.section).toBe("Optional");
  });

  it("reports format problems", () => {
    const v = validateLlmsTxt(fx("llms-bad.txt"));
    expect(v.valid).toBe(false);
    expect(v.errors).toEqual(["first line must be an H1 title (# Name)"]);
    expect(v.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/list item is not/),
        expect.stringMatching(/not an absolute or root-relative URL: docs\.html/),
        "no > blockquote summary after the title",
      ]),
    );
  });

  it("treats an HTML fallback page as absent", () => {
    const r: FetchResult = {
      url: "https://a.com/llms.txt",
      finalUrl: "",
      ok: true,
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html></html>",
      fetchedAt: "",
      fromCache: false,
    };
    expect(llmsReportFrom(r.url, r)).toMatchObject({ present: false, valid: false });
    expect(llmsReportFrom(r.url, { ...r, ok: false, status: 404, body: "" })).toMatchObject({
      present: false,
      errors: ["HTTP 404"],
    });
    const md = llmsReportFrom(r.url, { ...r, contentType: "application/octet-stream", body: fx("llms.txt") });
    expect(md.present).toBe(true);
    expect(md.warnings[0]).toMatch(/content-type/);
  });

  it("only checks the title in llms-full.txt", () => {
    expect(validateLlmsTxt("# A\n\n# B\n\n### deep\n- loose item", { full: true })).toMatchObject({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(validateLlmsTxt("no title", { full: true }).valid).toBe(false);
  });

  it("relaxes link rules for llms-full.txt", async () => {
    const ctx = fakeCtx(async (input) => {
      const u = new URL(String(input));
      if (u.pathname === "/llms.txt") return html(fx("llms.txt"), 200, "text/plain");
      if (u.pathname === "/llms-full.txt") return html("# CardLab\n\nAll the docs in one file.", 200, "text/markdown");
      return html("", 404);
    });
    const r = await aiReadinessAdapter.run({ origin: "https://getcardlab.app", robots: parseRobots("") }, ctx);
    expect(r.llmsTxt.valid).toBe(true);
    expect(r.llmsFullTxt).toMatchObject({ present: true, valid: true, warnings: [] });
    expect(r.crawlers.every((c) => c.access === "allowed")).toBe(true);
  });
});
