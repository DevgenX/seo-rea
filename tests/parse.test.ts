import { describe, expect, it } from "vitest";
import { countWords, parsePage, summarizePage } from "../src/adapters/page.js";
import {
  detectBlock,
  detectEngine,
  judgeSerp,
  MIN_RELEVANCE,
  parseBing,
  parseDuckDuckGo,
  parseGoogle,
  serpRelevance,
  unwrapBing,
  unwrapDuckDuckGo,
  unwrapGoogle,
} from "../src/adapters/serp-parse.js";
import { domainOf, normalizeDomain, parseUrlList, sameSite } from "../src/core/util.js";
import { fx } from "./helpers.js";

describe("parsePage", () => {
  const p = parsePage(fx("article.html"), "https://www.alpha.com/best-rewards-apps/");

  it("reads head facts", () => {
    expect(p.title).toBe("Best Credit Card Rewards Apps & Trackers (2026)");
    expect(p.metaDescription).toBe("We tested 9 credit card rewards apps for points tracking.");
    expect(p.metaRobots).toBe("index,follow");
    expect(p.ogTitle).toBe("Best Rewards Apps");
    expect(p.canonical).toBe("https://www.alpha.com/best-rewards-apps/");
    expect(p.hreflang).toEqual(["en-gb"]);
    expect(p.lang).toBe("en-US");
  });

  it("reads headings, ignoring comments and scripts", () => {
    expect(p.headings.h1).toEqual(["Best Credit Card Rewards Apps"]);
    expect(p.headings.h2).toEqual(["How we picked", "Top picks"]);
    expect(p.headings.h3).toEqual(["CardPointers", "MaxRewards"]);
    expect(p.text).not.toContain("not a heading");
    expect(p.text).not.toContain("color:red");
  });

  it("splits internal and external links", () => {
    expect(p.internalLinks.map((l) => [l.href, l.anchor])).toEqual([
      ["https://www.alpha.com/", "Home"],
      ["https://www.alpha.com/cards/", "Cards"],
      ["https://www.alpha.com/reviews/cardpointers/", "Read the CardPointers review"],
      ["https://blog.alpha.com/maxrewards", "MaxRewards"],
    ]);
    expect(p.externalLinks.map((l) => l.href)).toEqual(["https://twitter.com/alpha"]);
  });

  it("collects schema types and counts words", () => {
    expect(p.schemaTypes).toEqual(["Article", "BreadcrumbList", "FAQPage", "Person", "Question"]);
    expect(p.schema.blocks).toBe(3);
    expect(p.schema.parseErrors).toHaveLength(1);
    expect(p.wordCount).toBeGreaterThan(30);
    expect(p.wordCount).toBeLessThan(80);
  });

  it("summarizes without text or raw links", () => {
    const s = summarizePage(p);
    expect(s).not.toHaveProperty("text");
    expect(s.internalLinkCount).toBe(4);
    expect(s.topAnchors[0]).toEqual({ anchor: "Home", count: 1 });
  });
});

describe("helpers", () => {
  it("counts words and compares sites", () => {
    expect(countWords("It's a 2-step, well-known app.")).toBe(5);
    expect(sameSite("https://blog.a.com/x", "https://www.a.com/")).toBe(true);
    expect(sameSite("https://a.com.evil.net/", "https://a.com/")).toBe(false);
  });

  it("normalizes domains and URL lists", () => {
    expect(normalizeDomain("https://www.GetCardLab.app/pricing")).toBe("getcardlab.app");
    expect(domainOf("not a url")).toBe("");
    expect(parseUrlList("https://a.com/x, ftp://b.com\nhttps://c.org")).toEqual(["https://a.com/x", "https://c.org"]);
  });
});

describe("SERP parsers", () => {
  it("parses DuckDuckGo HTML, unwraps links, splits ads, dedupes", () => {
    const r = parseDuckDuckGo(fx("ddg.html"));
    expect(r.organic.map((x) => [x.position, x.url])).toEqual([
      [1, "https://www.alpha.com/best-rewards-apps/"],
      [2, "https://beta.org/guide"],
    ]);
    expect(r.organic[0]?.title).toBe("Best Apps to Track Credit Card Rewards of 2026");
    expect(r.organic[0]?.snippet).toBe("Compare the top rewards trackers & wallets.");
    expect(r.ads.map((a) => a.url)).toEqual(["https://ads.example.net/promo"]);
    expect(unwrapDuckDuckGo("//duckduckgo.com/l/?uddg=https%3A%2F%2Fx.com%2F")).toBe("https://x.com/");
  });

  it("parses the DuckDuckGo JavaScript layout", () => {
    const body = `<article data-testid="result"><a data-testid="result-title-a" href="https://x.com/a">Credit card rewards app list</a><div data-result="snippet">best</div></article>`;
    expect(parseDuckDuckGo(body).organic).toEqual([
      { position: 1, url: "https://x.com/a", title: "Credit card rewards app list", snippet: "best" },
    ]);
  });

  it("parses Bing and decodes /ck/a links", () => {
    const r = parseBing(fx("bing.html"));
    expect(r.organic.map((x) => x.url)).toEqual(["https://www.gamma.com/apps", "https://delta.io/cards"]);
    expect(r.organic[0]?.title).toBe("Gamma Rewards Apps");
    expect(r.organic[0]?.snippet).toBe("Gamma ranks the best apps ® for points.");
    expect(r.ads.map((a) => a.url)).toEqual(["https://ads.example.org/landing"]);
    expect(unwrapBing("https://example.com/x")).toBe("https://example.com/x");
  });

  it("parses Google direct and /url?q= links, skipping Google's own", () => {
    const r = parseGoogle(fx("google-results.html"));
    expect(r.organic.map((x) => [x.url, x.title])).toEqual([
      ["https://www.alpha.com/best-rewards-apps/", "Best Credit Card Rewards Apps"],
      ["https://beta.org/guide", "Rewards app guide"],
    ]);
    expect(unwrapGoogle("/url?q=https://a.com/&sa=U")).toBe("https://a.com/");
  });

  it("separates Google ads", () => {
    const body = `<div id="tads"><a href="https://ad.com/x"><div role="heading">Ad title</div></a></div><a href="https://org.com/"><h3>Organic</h3></a>`;
    const r = parseGoogle(body);
    expect(r.ads).toEqual([{ url: "https://ad.com/x", title: "Ad title", snippet: "" }]);
    expect(r.organic.map((x) => x.url)).toEqual(["https://org.com/"]);
  });

  it("detects engines in saved pages", () => {
    expect(detectEngine(fx("ddg.html"))).toBe("duckduckgo");
    expect(detectEngine(fx("bing.html"))).toBe("bing");
    expect(detectEngine(fx("google-results.html"))).toBe("google");
    expect(detectEngine("<html></html>")).toBe("");
  });

  it("detects blocks, captchas and consent pages", () => {
    expect(detectBlock("google", fx("google-block.html"), 200)).toMatch(/JavaScript/);
    expect(detectBlock("google", "", 200, "https://www.google.com/sorry/index?continue=x")).toMatch(/captcha/);
    expect(detectBlock("google", "", 200, "https://consent.google.com/m?x")).toMatch(/consent/);
    expect(detectBlock("bing", "<div>Please solve this CAPTCHA</div>", 200)).toMatch(/captcha/);
    expect(detectBlock("bing", "", 429)).toBe("rate limited (HTTP 429)");
    expect(detectBlock("bing", '<div id="b_captcha">', 200)).toBe("Bing challenge page");
    expect(detectBlock("duckduckgo", fx("ddg.html"), 200)).toBe("");
  });

  it("scores relevance and flags bot-degraded results", () => {
    const kw = "credit card rewards app";
    const degraded = [
      {
        url: "https://www.creditkarma.com/",
        title: "Credit scores, reports and much more",
        snippet: "Free credit scores.",
      },
      { url: "https://en.wikipedia.org/wiki/Credit", title: "Credit - Wikipedia", snippet: "Credit is the trust..." },
    ];
    const good = [
      { url: "https://www.alpha.com/best-rewards-apps/", title: "Best Apps to Track Credit Card Rewards", snippet: "" },
      { url: "https://beta.org/x", title: "Credit card app guide", snippet: "rewards tracking" },
      { url: "https://c.com/", title: "Something else", snippet: "" },
    ];
    expect(serpRelevance(kw, degraded)).toBe(0);
    expect(serpRelevance(kw, good)).toBeGreaterThanOrEqual(MIN_RELEVANCE);
    expect(serpRelevance(kw, [])).toBe(0);
  });

  it("does not treat Bing's embedded Turnstile script as a block when results exist", () => {
    const body = `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script><div class="cf-turnstile"></div>${fx("bing.html")}`;
    expect(judgeSerp("bing", "rewards apps", body, 200).problem).toBe("");
    expect(judgeSerp("bing", "rewards apps", '<div class="cf-turnstile"></div>', 200).problem).toBe(
      "Bing challenge page",
    );
  });

  it("judges a SERP body", () => {
    expect(judgeSerp("duckduckgo", "credit card rewards app", fx("ddg.html"), 200).problem).toBe("");
    expect(judgeSerp("google", "x", fx("google-block.html"), 200).problem).toMatch(/JavaScript/);
    expect(judgeSerp("bing", "x", "<html><body>nothing</body></html>", 200).problem).toMatch(/no results/);
    const degraded = `<li class="b_algo"><h2><a href="https://w.org/credit">Credit - Wikipedia</a></h2></li>`;
    expect(judgeSerp("bing", "credit card rewards app", degraded, 200).problem).toMatch(/degraded/);
  });
});

describe("tracking parameters", () => {
  it("strips engine click-tracking params from result URLs", async () => {
    const { stripTracking } = await import("../src/adapters/serp-parse.js");
    expect(stripTracking("https://cnbc.com/a/?msockid=1f&x=1&utm_source=b")).toBe("https://cnbc.com/a/?x=1");
    expect(
      parseBing('<li class="b_algo"><h2><a href="https://a.com/x?msockid=9">A</a></h2></li>').organic[0]?.url,
    ).toBe("https://a.com/x");
  });
});
