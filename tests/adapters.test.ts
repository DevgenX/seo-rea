import { describe, expect, it } from "vitest";
import {
  adLibraryLookups,
  adLibraryUrlAdapter,
  advertiserFromUrl,
  brandFromDomain,
  pickAdvertisers,
  visibleAdCount,
} from "../src/adapters/adlib.js";
import { buildCitation, isAiEngine } from "../src/adapters/cite.js";
import { crawlCandidates, inlinkCounts } from "../src/adapters/links.js";
import { pageAdapter } from "../src/adapters/page.js";
import { parsePsi, psiAdapter, psiUrl } from "../src/adapters/performance.js";
import { htmlSerpAdapter, savedFileSerpAdapter, urlListSerpAdapter } from "../src/adapters/serp.js";
import { fakeCtx, fx, html } from "./helpers.js";

describe("ad libraries", () => {
  it("derives brands and advertisers", () => {
    expect(brandFromDomain("getcardlab.app")).toBe("cardlab");
    expect(brandFromDomain("https://www.awardwallet.com/x")).toBe("awardwallet");
    expect(brandFromDomain("money.usnews.com")).toBe("usnews");
    expect(brandFromDomain("shop.example.co.uk")).toBe("example");
    expect(advertiserFromUrl("https://apps.apple.com/us/app/maxrewards-credit-card-rewards/id1435710443")).toEqual({
      domain: "",
      brand: "maxrewards",
    });
    expect(advertiserFromUrl("https://play.google.com/store/apps/details?hl=en_US&id=com.cardpointers.app")).toEqual({
      domain: "",
      brand: "cardpointers",
    });
    expect(advertiserFromUrl("https://www.businessinsider.com/x")).toEqual({
      domain: "businessinsider.com",
      brand: "businessinsider",
    });
  });

  it("puts the target first and product sites before publishers", () => {
    const picked = pickAdvertisers("getcardlab.app", [
      "https://www.forbes.com/advisor/best-apps/",
      "https://maxrewards.com/",
      "https://apps.apple.com/us/app/awardwallet-track-rewards/id388442727",
      "https://www.cnbc.com/select/x/",
      "https://maxrewards.com/",
    ]);
    expect(picked.map((a) => a.brand)).toEqual(["cardlab", "maxrewards", "awardwallet", "forbes"]);
  });

  it("builds lookup URLs for all three platforms", () => {
    const l = adLibraryLookups("getcardlab.app");
    expect(l.map((x) => x.platform)).toEqual([
      "Google Ads Transparency Center",
      "Meta Ad Library",
      "LinkedIn Ad Library",
    ]);
    expect(l[0]?.url).toContain("domain=getcardlab.app");
    expect(l[1]?.url).toContain("q=cardlab");
    expect(adLibraryLookups("", "maxrewards")[0]?.url).toBe("https://adstransparency.google.com/?region=anywhere");
  });

  it("reads visible counts", () => {
    expect(visibleAdCount("Meta Ad Library", "Ads ~1,200 results Filters")).toMatchObject({ count: 1200 });
    expect(visibleAdCount("Meta Ad Library", "~3.4K results")).toMatchObject({ count: 3400 });
    expect(visibleAdCount("LinkedIn Ad Library", "12 ads match your search")).toMatchObject({ count: 12 });
    expect(visibleAdCount("Google Ads Transparency Center", "No ads found")).toMatchObject({ count: 0 });
    expect(visibleAdCount("Google Ads Transparency Center", "Sign in")).toEqual({ count: null, text: "" });
  });

  it("records manual checks without network", async () => {
    const r = await adLibraryUrlAdapter.run(
      { advertisers: [{ domain: "", brand: "maxrewards" }] },
      fakeCtx(() => Promise.reject(new Error("no"))),
    );
    expect(r.every((x) => x.status === "manual-check")).toBe(true);
    expect(r[0]?.note).toMatch(/advertiser domain unknown/);
  });
});

describe("citations", () => {
  it("validates engines and URLs", () => {
    expect(isAiEngine("grok")).toBe(true);
    expect(() => buildCitation({ engine: "bard", prompt: "x", urls: "" })).toThrow(/engine must be one of/);
    expect(() => buildCitation({ engine: "chatgpt", prompt: " ", urls: "" })).toThrow(/prompt/);
    const c = buildCitation({
      engine: "perplexity",
      prompt: "best app",
      urls: ["https://www.a.com/x", "nope", "https://a.com/y"],
    });
    expect(c.urls).toHaveLength(2);
    expect(c.domains).toEqual(["a.com"]);
  });
});

describe("links", () => {
  it("counts inlinks and picks crawl candidates", () => {
    const pages = [
      {
        internalLinks: [
          { href: "https://t.com/a", anchor: "A", rel: "" },
          { href: "https://t.com/a", anchor: "A2", rel: "" },
          { href: "bad", anchor: "", rel: "" },
        ],
      },
    ];
    expect(inlinkCounts(pages)).toEqual([{ path: "/a", count: 2, anchors: ["A", "A2"] }]);
    const seen = new Set(["/"]);
    const c = crawlCandidates(
      "t.com",
      ["https://t.com/", "https://t.com/x", "https://t.com/f.pdf", "https://other.com/y"],
      [
        { href: "https://www.t.com/x", anchor: "", rel: "" },
        { href: "https://t.com/z", anchor: "", rel: "" },
      ],
      seen,
    );
    expect(c).toEqual(["https://t.com/x", "https://t.com/z"]);
  });
});

describe("PageSpeed Insights", () => {
  const psiJson = {
    lighthouseResult: {
      categories: { performance: { score: 0.42 }, seo: { score: 0.9 }, accessibility: { score: null } },
      audits: { "largest-contentful-paint": { displayValue: "4.1 s" } },
    },
    loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3900, category: "AVERAGE" } } },
  };

  it("parses scores, lab and field data", () => {
    expect(parsePsi(psiJson)).toEqual({
      scores: { performance: 42, accessibility: null, "best-practices": null, seo: 90 },
      lab: { "largest-contentful-paint": "4.1 s" },
      field: { LARGEST_CONTENTFUL_PAINT_MS: "3900 (AVERAGE)" },
    });
  });

  it("sends the key in a header, never in the URL", async () => {
    let seen: { url: string; key: string | null } = { url: "", key: null };
    const ctx = fakeCtx(
      async (u, init) => {
        seen = { url: String(u), key: new Headers(init?.headers).get("x-goog-api-key") };
        return html(JSON.stringify(psiJson), 200, "application/json");
      },
      { PSI_API_KEY: "test-key" },
    );
    const r = await psiAdapter.run({ url: "https://a.com/" }, ctx);
    expect(r.ok).toBe(true);
    expect(seen.key).toBe("test-key");
    expect(seen.url).not.toContain("test-key");
    expect(psiUrl("https://a.com/", "mobile")).toContain("category=seo");
  });

  it("skips gracefully on quota errors", async () => {
    const r = await psiAdapter.run(
      { url: "https://a.com/" },
      fakeCtx(async () => html("{}", 429)),
    );
    expect(r).toMatchObject({ ok: false, skipped: expect.stringMatching(/quota/) });
    expect((await psiAdapter.available(fakeCtx(async () => html("")))).reason).toMatch(/no key/);
  });
});

describe("SERP and page adapters", () => {
  it("HTML adapter stops at the first usable engine", async () => {
    const hosts: string[] = [];
    const ctx = fakeCtx(async (u) => {
      const h = new URL(String(u)).hostname;
      hosts.push(h);
      return h === "www.google.com" ? html(fx("google-block.html")) : html(fx("ddg.html"));
    });
    const r = await htmlSerpAdapter.run(
      { keyword: "credit card rewards app", engines: ["google", "duckduckgo", "bing"] },
      ctx,
    );
    expect(r.map((x) => [x.engine, Boolean(x.judgement.problem)])).toEqual([
      ["google", true],
      ["duckduckgo", false],
    ]);
    expect(hosts).toEqual(["www.google.com", "html.duckduckgo.com"]);
  });

  it("URL-list and saved-file adapters", async () => {
    const ctx = fakeCtx(async () => html(""));
    const [u] = await urlListSerpAdapter.run({ urls: ["https://a.com/", "https://b.com/"] }, ctx);
    expect(u?.judgement.parsed.organic.map((x) => x.position)).toEqual([1, 2]);
    const dir = await import("./helpers.js").then((m) => m.tmp());
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/serp.html`, fx("bing.html"));
    const [s] = await savedFileSerpAdapter.run({ files: [`${dir}/serp.html`], keyword: "rewards apps" }, ctx);
    expect(s).toMatchObject({ engine: "bing", label: "Saved Bing page (serp.html)" });
  });

  it("page adapter reports non-HTML responses", async () => {
    const r = await pageAdapter.run(
      "https://a.com/x.pdf",
      fakeCtx(async () => html("%PDF", 200, "application/pdf")),
    );
    expect(r.page).toBeNull();
    expect(r.error).toMatch(/application\/pdf/);
  });
});
