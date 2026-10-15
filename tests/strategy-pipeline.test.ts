import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateStrategy } from "../src/core/strategy/schema.js";
import { planQueries, runStrategy } from "../src/services/strategy.js";
import { Frontier } from "../src/services/strategy-site.js";
import { fx, html, tmp } from "./helpers.js";

const json = (v: unknown, status = 200): Response => html(JSON.stringify(v), status, "application/json");

/** Bing result page for any query; leader.com ranks #1, challenger.app never. */
function bing(q: string): string {
  const rows = ["leader.com/cards", "rival.org/x", "other.net/y"]
    .map(
      (u, i) =>
        `<li class="b_algo"><h2><a href="https://${u}/${i}">${q} at ${u}</a></h2><div class="b_caption"><p>${q} explained.</p></div></li>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><title>${q} - Search</title></head><body><ol id="b_results">${rows}</ol></body></html>`;
}

const reviews = Array.from({ length: 20 }, (_, i) => `https://leader.com/cards/card${i}-rewards-review`);

function site(host: string, path: string): Response {
  if (host === "leader.com") {
    if (path === "/robots.txt")
      return html("User-agent: *\nDisallow: /private\nSitemap: https://leader.com/sitemap.xml", 200, "text/plain");
    if (path === "/sitemap.xml")
      return html(
        `<urlset>${["https://leader.com/", "https://leader.com/cards", ...reviews, "https://leader.com/private/x"].map((u) => `<url><loc>${u}</loc></url>`).join("")}</urlset>`,
        200,
        "application/xml",
      );
    if (path === "/") return html(fx("strategy-home.html").replace(/cardpointers/gi, "leader"));
    if (path === "/cards")
      return html(
        `<html><head><title>Rewards card reviews</title></head><body><h1>Rewards card reviews</h1>${reviews.map((u) => `<a href="${u}">r</a>`).join("")}</body></html>`,
      );
    if (path.startsWith("/cards/"))
      return html(
        `<html><head><title>Card rewards review</title><script type="application/ld+json">{"@type":"Review","itemReviewed":{"@type":"Product","name":"x"},"author":{"@type":"Person","name":"A"},"reviewRating":{"@type":"Rating","ratingValue":4}}</script></head><body><h1>Card rewards review</h1><p>${"word ".repeat(1500)}</p><h2>Rewards</h2><h2>Fees</h2></body></html>`,
      );
  }
  if (host === "challenger.app") {
    if (path === "/robots.txt") return html("User-agent: *\nDisallow:", 200, "text/plain");
    if (path === "/sitemap.xml")
      return html(
        "<urlset><url><loc>https://challenger.app/</loc></url><url><loc>https://challenger.app/guide/due-date</loc></url></urlset>",
        200,
        "application/xml",
      );
    if (path === "/") return html(fx("target-home.html"));
    if (path === "/guide/due-date")
      return html("<html><head><title>Due date guide</title></head><body><h1>Due date</h1><p>Short.</p></body></html>");
  }
  return html("not found", 404);
}

function fakeFetch(requested: string[]): typeof fetch {
  return async (input) => {
    const url = String(input);
    requested.push(url);
    const u = new URL(url);
    if (u.hostname === "www.bing.com") return html(bing(u.searchParams.get("q") ?? ""));
    if (u.hostname === "www.google.com") return html(fx("google-block.html"));
    if (u.hostname === "html.duckduckgo.com") return html('<div class="anomaly-modal">bots</div>', 202);
    if (u.hostname === "www.googleapis.com") return json({}, 429);
    if (u.hostname === "tranco-list.eu")
      return json(u.pathname.endsWith("leader.com") ? { ranks: [{ date: "2026-10-14", rank: 4832 }] } : { ranks: [] });
    if (u.hostname === "en.wikipedia.org")
      return u.searchParams.get("list") === "exturlusage"
        ? json({ query: { exturlusage: [{ title: "Rewards" }] } })
        : json({ query: { searchinfo: { totalhits: 3 }, search: [] } });
    if (u.hostname === "index.commoncrawl.org") return html("bad gateway", 502);
    if (u.hostname === "itunes.apple.com")
      return json({
        results: [{ trackId: 1472875808, trackName: "Leader", averageUserRating: 4.7, userRatingCount: 10355 }],
      });
    return site(u.hostname.replace(/^www\./, ""), u.pathname);
  };
}

const t = (p: string): Array<{ term: string }> => Array.from({ length: 8 }, (_, i) => ({ term: `${p} ${i}` }));

describe("strategy (offline)", () => {
  it("does not fetch the homepage twice when the nav links it", () => {
    const f = new Frontier("a.com", ["https://a.com/", "https://a.com/x"]);
    f.markFetched("https://a.com/");
    expect(f.next()).toBe("https://a.com/x");
    expect(f.next()).toBeUndefined();
  });

  it("plans head-term and brand queries with a 6/4 split under --vs", () => {
    const q = planQueries(
      [
        { domain: "a.com", brand: "a", terms: t("a") },
        { domain: "b.com", brand: "b", terms: t("b") },
      ],
      10,
    );
    expect(q.filter((x) => x.kind === "head-term" && x.from === "a.com")).toHaveLength(6);
    expect(q.filter((x) => x.kind === "head-term" && x.from === "b.com")).toHaveLength(4);
    expect(q.filter((x) => x.kind === "brand").map((x) => x.term)).toEqual(["a", "b"]);
  });

  it("runs end to end with --vs at budget 0 and writes strategy.md, strategy.json and evidence", async () => {
    const dir = await tmp();
    const requested: string[] = [];
    const out = join(dir, "out");
    const { strategy, run } = await runStrategy({
      domain: "challenger.app",
      vs: "leader.com",
      out,
      budgetUsd: 0,
      crawl: 6,
      terms: 4,
      engines: ["google", "duckduckgo", "bing"],
      browser: false,
      cacheDir: join(dir, "cache"),
      ledgerPath: join(dir, "ledger.csv"),
      fetchImpl: fakeFetch(requested),
      delayMs: 0,
      minSearchDelayMs: 0,
      env: { DATAFORSEO_LOGIN: "x", DATAFORSEO_PASSWORD: "y" },
      now: () => new Date("2026-10-14T12:00:00Z"),
    });

    expect(requested.some((u) => u.includes("dataforseo"))).toBe(false);
    expect(requested).not.toContain("https://leader.com/private/x");
    const leader = run.sites.find((s) => s.domain === "leader.com");
    expect(leader?.pages.length).toBe(6);
    expect(leader?.offpage).toMatchObject({ trancoRank: 4832, wikiLinkingArticles: 1, commonCrawlBlocks: null });
    expect(leader?.app).toMatchObject({ ratingCount: 10355 });
    expect(leader?.clusters.find((c) => c.key === "/cards")?.programmatic?.pattern).toMatch(/review/);
    // Google and DuckDuckGo block once, then only Bing is asked.
    expect(run.serpNotes.join("\n")).toMatch(/Google HTML blocked .* not asked again/);
    expect(requested.filter((u) => u.includes("www.google.com"))).toHaveLength(1);
    expect(run.serps.every((s) => s.engine === "Bing HTML")).toBe(true);

    expect(strategy.roles).toMatchObject({ leader: "leader.com", challenger: "challenger.app" });
    expect(strategy.actionsFor).toBe("challenger.app");
    expect(strategy.unknowns.join("\n")).toMatch(/budget is 0/);
    expect(strategy.unknowns.join("\n")).toMatch(/Common Crawl footprint unavailable/);
    const L = strategy.sites.find((s) => s.domain === "leader.com");
    expect(L?.drivers.map((d) => d.id)).toEqual(expect.arrayContaining(["app", "popularity"]));
    expect(L?.keywords.rankedTop10).toBeGreaterThan(0);
    expect(strategy.comparison?.clusterGaps.some((g) => g.cluster === "/cards")).toBe(true);

    const onDisk = validateStrategy(JSON.parse(await readFile(join(out, "report", "strategy.json"), "utf8")));
    expect(onDisk.runId).toBe(run.runId);
    const index = JSON.parse(await readFile(join(out, "evidence", "index.json"), "utf8")) as Array<{ id: string }>;
    const ids = new Set(index.map((e) => e.id));
    const cited = [
      ...onDisk.topActions.flatMap((a) => a.evidenceIds),
      ...onDisk.sites.flatMap((s) => [...s.drivers, ...s.weaknesses].flatMap((x) => x.evidenceIds)),
    ];
    expect(cited.length).toBeGreaterThan(0);
    for (const id of cited) expect(ids.has(id)).toBe(true);
    const md = await readFile(join(out, "report", "strategy.md"), "utf8");
    expect(md.indexOf("## Top 10 actions for challenger.app")).toBeLessThan(md.indexOf("## 1. Snapshot"));
    expect(md).toContain("## 10. Side-by-side (--vs)");
    expect(JSON.parse(await readFile(join(out, "data", "strategy-run.json"), "utf8"))).toMatchObject({
      vs: "leader.com",
    });

    await expect(
      runStrategy({
        domain: "challenger.app",
        out,
        fetchImpl: fakeFetch([]),
        browser: false,
        cacheDir: join(dir, "cache"),
      }),
    ).rejects.toThrow(/--force/);
  });
});
