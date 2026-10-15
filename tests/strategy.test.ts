import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractSignals } from "../src/adapters/signals.js";
import { pickChildren, sitemapStem } from "../src/adapters/sitemap-walk.js";
import { readExtUrlUsage, readItunesLookup, readTranco, appStoreId } from "../src/adapters/offpage.js";
import { buildStrategy } from "../src/core/strategy/build.js";
import {
  buildClusters,
  classifyTemplate,
  clusterKey,
  detectProgrammatic,
  headingSimilarity,
  slugAffix,
  stratifiedSample,
} from "../src/core/strategy/clusters.js";
import { assignRoles, clusterGaps, keywordOverlap, visibility } from "../src/core/strategy/compare.js";
import { driverCandidates, rankDrivers } from "../src/core/strategy/drivers.js";
import { buildKeywords, buildPillars, isOwnedUrl, rankFor } from "../src/core/strategy/pillars.js";
import { StrategySchema, strategyJsonSchema, validateStrategy } from "../src/core/strategy/schema.js";
import { deriveHeadTerms, isSupportUrl } from "../src/core/strategy/terms.js";
import { findWeaknesses } from "../src/core/strategy/weaknesses.js";
import { renderStrategy } from "../src/core/report/strategy.js";
import { blockedSerp, challengerSite, leaderSite, page, profile, run, serp } from "./strategy-fixture.js";

const NOW = new Date("2026-10-14T12:00:00Z");

describe("cluster grouping", () => {
  it("keys URLs by first path segment, containers, locales and subdomains", () => {
    expect(clusterKey("https://a.com/")).toBe("/");
    expect(clusterKey("https://a.com/cards/x-review")).toBe("/cards");
    expect(clusterKey("https://a.com/blog/credit-cards/best-x")).toBe("/blog/credit-cards");
    expect(clusterKey("https://a.com/ca/banking/x")).toBe("/ca/banking");
    expect(clusterKey("https://a.com/blog/x")).toBe("/blog");
    expect(clusterKey("https://help.a.com/article/1-x", "a.com")).toBe("//help.a.com/article");
    expect(clusterKey("https://www.a.com/x", "a.com")).toBe("/x");
  });

  it("groups URLs, merges singletons and counts hubs, words and inlinks", () => {
    const o = "https://a.com";
    const reviews = Array.from({ length: 6 }, (_, i) => `${o}/cards/c${i}-review`);
    const hub = page(`${o}/cards`, { internalLinks: reviews });
    const r0 = page(reviews[0] as string, { wordCount: 2000 });
    const r1 = page(reviews[1] as string, { wordCount: 1000 });
    // A site-wide menu on an author page links into every cluster; it is not a hub.
    const author = page(`${o}/author/sam`, { internalLinks: reviews });
    const clusters = buildClusters(
      [`${o}/`, `${o}/cards`, ...reviews, `${o}/privacy`, `${o}/about`],
      [hub, r0, r1, author],
      [],
      "a.com",
    );
    const cards = clusters.find((c) => c.key === "/cards");
    expect(cards).toMatchObject({ urlCount: 7, fetchedPages: 3, inlinks: 12, baseTemplate: "review" });
    expect(cards?.medianWords).toBe(1000);
    expect(cards?.hubs).toEqual([{ url: `${o}/cards`, linksIntoCluster: 6 }]);
    expect(clusters.find((c) => c.key === "/(top-level)")?.urlCount).toBe(2);
    expect(clusters[0]?.key).toBe("/cards");
  });

  it("classifies page templates from path, title, schema and inputs", () => {
    expect(classifyTemplate("https://a.com/amex-gold-vs-chase-sapphire")).toBe("comparison");
    expect(classifyTemplate("https://a.com/x", "Best travel cards for students")).toBe("comparison");
    expect(classifyTemplate("https://a.com/cards/amex-gold-review")).toBe("review");
    expect(classifyTemplate("https://a.com/calculators/payoff")).toBe("tool");
    expect(classifyTemplate("https://a.com/x", "", [], 4)).toBe("tool");
    expect(classifyTemplate("https://a.com/guide/statement-date")).toBe("guide");
    expect(classifyTemplate("https://a.com/blog/news-item")).toBe("blog");
    expect(classifyTemplate("https://a.com/pricing")).toBe("product");
    expect(classifyTemplate("https://a.com/x", "", ["SoftwareApplication"])).toBe("product");
    expect(classifyTemplate("https://help.a.com/article/1")).toBe("guide");
    expect(classifyTemplate("https://a.com/")).toBe("page");
    expect(classifyTemplate("https://a.com/p/acme-compare-inc-licenses-and-disclosures")).toBe("page");
  });

  it("samples round-robin across clusters", () => {
    const urls = [
      ...Array.from({ length: 50 }, (_, i) => `https://a.com/blog/p${i}`),
      "https://a.com/tools/x",
      "https://a.com/pricing",
    ];
    const s = stratifiedSample(urls, 5);
    expect(s).toContain("https://a.com/tools/x");
    expect(s).toContain("https://a.com/pricing");
    expect(s).toHaveLength(5);
  });

  it("picks child sitemaps one per type", () => {
    expect(sitemapStem("https://x.com/sitemaps/us/wp-sitemap-posts-articles-12.xml")).toBe("us/posts-articles");
    const kids = [
      ...Array.from({ length: 30 }, (_, i) => `https://x.com/sitemaps/us/wp-sitemap-posts-articles-${i + 1}.xml`),
      "https://x.com/sitemaps/us/wp-sitemap-posts-calculator-pages-1.xml",
      "https://x.com/sitemaps/us/wp-sitemap-posts-credit-cards-pages-1.xml",
    ];
    const picked = pickChildren(kids, 4);
    expect(picked).toHaveLength(4);
    expect(picked).toContain("https://x.com/sitemaps/us/wp-sitemap-posts-calculator-pages-1.xml");
    expect(picked).toContain("https://x.com/sitemaps/us/wp-sitemap-posts-credit-cards-pages-1.xml");
  });
});

const many = (n: number, f: (i: number) => string): string[] => Array.from({ length: n }, (_, i) => f(i));

describe("programmatic detection", () => {
  it("finds a shared slug suffix", () => {
    const urls = many(20, (i) => `https://a.com/cards/brand${i}-card-review`);
    const p = detectProgrammatic("/cards", urls, []);
    expect(p).toMatchObject({ basis: "slug-affix", share: 1 });
    expect(p?.pattern).toMatch(/^\/cards\/\{x\}-(card-)?review$/);
  });

  it("treats digits as placeholders (merchant-5-back-48)", () => {
    const names = [
      "menchies",
      "tsuki-sushi",
      "city-pho",
      "mi-tradicion",
      "hot-head",
      "jimmy-johns",
      "tat",
      "spice",
      "handels",
      "tee-jayes",
    ];
    const urls = names.map((n, i) => `https://a.com/offers/${n}-5-back-${i * 7}/`);
    const p = detectProgrammatic("/offers", urls, []);
    expect(p?.pattern).toContain("back-#");
    expect(p?.share).toBeGreaterThanOrEqual(0.8);
  });

  it("finds numeric id schemes and identical heading templates", () => {
    expect(
      detectProgrammatic(
        "/p",
        many(20, (i) => `https://a.com/p/${1000 + i}`),
        [],
      )?.basis,
    ).toBe("numeric-id");
    const h2 = ["Overview", "Rates", "Fees", "FAQ"];
    const fetched = [{ h2 }, { h2 }, { h2: [...h2, "Extra"] }];
    expect(headingSimilarity(fetched)).toBeGreaterThan(0.7);
    const urls = many(
      20,
      (i) =>
        `https://a.com/banks/${["chase", "citi", "boa", "wells", "usbank"][i % 5]}-${["ny", "ca", "tx", "fl"][i % 4]}x${i}`,
    );
    expect(detectProgrammatic("/banks", urls, fetched)?.basis).toBe("heading-template");
  });

  it("does not flag small or hand-written clusters", () => {
    expect(
      detectProgrammatic(
        "/cards",
        many(8, (i) => `https://a.com/cards/x${i}-review`),
        [],
      ),
    ).toBeNull();
    const editorial = [
      "how-to-pay-off-debt",
      "what-is-apr",
      "best-way-to-save",
      "credit-score-myths",
      "roth-vs-traditional",
    ];
    expect(
      detectProgrammatic(
        "/learn",
        many(20, (i) => `https://a.com/learn/${editorial[i % 5]}-${["a", "b", "c", "d"][i % 4]}-part`),
        [],
      )?.basis ?? null,
    ).not.toBe("numeric-id");
    expect(slugAffix(["a-b", "c-d"])?.share).toBe(0.5);
  });

  it("never flags a help centre", () => {
    const urls = many(30, (i) => `https://help.a.com/article/${i}-how-to-x`);
    const c = buildClusters(urls, [], [], "a.com").find((x) => x.key === "//help.a.com/article");
    expect(c?.programmatic).toBeNull();
    expect(c?.template).toBe("guide");
  });
});

const link = (href: string): string => `<html><body><a href="${href}">in</a></body></html>`;

describe("signals and terms", () => {
  it("extracts distribution, dates, Q&A and answer-first intros", () => {
    const html = readFileSync(new URL("./fixtures/strategy-home.html", import.meta.url), "utf8");
    const s = extractSignals(html, "https://cardpointers.com/");
    expect(s.distribution.appStore[0]).toContain("id1472875808");
    expect(s.distribution.playStore).toHaveLength(1);
    expect(s.distribution.extension).toHaveLength(1);
    expect(s.distribution.social.map((x) => x.platform).toSorted()).toEqual(["instagram", "x", "youtube"]);
    expect(s.distribution.community[0]).toContain("reddit.com/r/cardpointers");
    expect(s.distribution.newsletter).toBe(true);
    expect(s.modified).toBe("2026-09-30");
    expect(s.questionBlocks).toBe(3);
    expect(s.answerFirst).toBe(true);
    expect(s.orgName).toBe("CardPointers");
    expect(s.sameAs).toHaveLength(2);
    expect(s.navLinks.map((l) => l.anchor)).toEqual(["Cards", "Offers", "Pro"]);
    expect(s.pressLinks).toEqual(["https://www.forbes.com/advisor/cardpointers-review"]);
  });

  it("ignores staff LinkedIn profiles as brand social links", () => {
    expect(
      extractSignals(link("https://www.linkedin.com/in/jane-doe-123"), "https://a.com/").distribution.social,
    ).toEqual([]);
    expect(
      extractSignals(link("https://www.linkedin.com/company/acme"), "https://a.com/").distribution.social[0]?.platform,
    ).toBe("linkedin");
  });

  it("derives on-topic head terms without lists, brand or support pages", () => {
    const o = "https://cardpointers.com";
    const pages = [
      page(`${o}/`, {
        title: "CardPointers: Credit card rewards made easy",
        metaDescription: "Earn more credit card rewards. Works with Amex, Chase, BoA, Citi.",
        h1: ["Earn more from your credit cards every day"],
      }),
      page(`${o}/offers/`, { title: "Credit card offers | CardPointers", h1: ["Credit card offers"] }),
      page(`${o}/cards/`, { title: "Credit card rewards by card", h2: ["Amex, Chase, BoA, Citi"] }),
      page("https://help.cardpointers.com/article/24-how-to-install-on-safari", { title: "How to install on Safari" }),
    ];
    const terms = deriveHeadTerms(
      pages,
      pages.map((p) => p.url),
      [],
      ["cardpointers"],
    ).map((t) => t.term);
    expect(terms).toContain("credit card rewards");
    expect(terms).toContain("credit card offers");
    expect(terms.join(" ")).not.toMatch(/cardpointers|amex chase|safari|every day/);
    const slogan = deriveHeadTerms(
      [page(`${o}/`, { title: "Money: credit card rewards made easy", h1: ["Smart financial decisions start here"] })],
      [`${o}/`, `${o}/cards/best-credit-card-rewards`],
      [],
      ["cardpointers"],
    ).map((t) => t.term);
    expect(slogan.join(" ")).not.toMatch(/financial decisions/);
    expect(slogan).toContain("credit card rewards");
    expect(slogan.join(" ")).not.toMatch(/made easy/);
    expect(isSupportUrl("https://help.cardpointers.com/x")).toBe(true);
    expect(isSupportUrl("https://a.com/help/x")).toBe(true);
    expect(isSupportUrl("https://a.com/blog/x")).toBe(false);
  });

  it("reads free off-page responses", () => {
    expect(
      readTranco({
        ranks: [
          { date: "2026-10-14", rank: 4832 },
          { date: "2026-10-13", rank: 4800 },
        ],
      }),
    ).toEqual({
      rank: 4832,
      date: "2026-10-14",
      best: 4800,
    });
    expect(readTranco({ nope: 1 })).toBeNull();
    expect(
      readExtUrlUsage({ query: { exturlusage: [{ title: "A" }, { title: "A" }, { title: "B" }] } })?.linkingArticles,
    ).toBe(2);
    expect(appStoreId("https://apps.apple.com/app/apple-store/id1472875808?pt=1")).toBe("1472875808");
    expect(
      readItunesLookup({ results: [{ trackId: 1, trackName: "X", averageUserRating: 4.7, userRatingCount: 10355 }] }),
    ).toMatchObject({
      name: "X",
      rating: 4.7,
      ratingCount: 10355,
    });
  });
});

describe("rank checks", () => {
  it("finds the domain, owned listings, misses and blocked SERPs", () => {
    const serps = [
      serp("rewards app", "a.com", ["x.com", "www.a.com", "y.com"]),
      {
        ...serp("card app", "a.com", ["x.com"]),
        organic: [
          {
            position: 3,
            url: "https://apps.apple.com/us/app/a/id123",
            domain: "apps.apple.com",
            title: "",
            snippet: "",
          },
        ],
      },
      serp("other", "a.com", ["x.com"]),
      blockedSerp("blocked term", "a.com"),
    ];
    expect(rankFor("rewards app", "a.com", serps)).toMatchObject({ status: "ranked", position: 2 });
    expect(rankFor("card app", "a.com", serps, ["https://apps.apple.com/app/apple-store/id123?pt=1"])).toMatchObject({
      status: "ranked",
      position: 3,
    });
    expect(rankFor("other", "a.com", serps).status).toBe("not-in-results");
    expect(rankFor("blocked term", "a.com", serps).status).toBe("unknown");
    expect(rankFor("never checked", "a.com", serps).status).toBe("unknown");
    expect(isOwnedUrl("https://twitter.com/a/status/1", ["https://twitter.com/a"])).toBe(true);
    expect(isOwnedUrl("https://twitter.com/ab", ["https://twitter.com/a"])).toBe(false);
  });
});

describe("driver ranking", () => {
  it("ranks programmatic scale, popularity and SERP footprint for the leader", () => {
    const L = leaderSite();
    const serps = L.terms.slice(0, 3).map((t) => serp(t.term, L.domain, ["leader.com", "x.com"]));
    const keywords = buildKeywords(L, serps);
    const pillars = buildPillars(L, serps, NOW);
    const { drivers } = rankDrivers(driverCandidates({ site: L, pillars, keywords }));
    const ids = drivers.map((d) => d.id);
    expect(ids).toContain("programmatic:/cards");
    expect(ids).toContain("popularity");
    expect(ids).toContain("serp");
    expect(drivers.length).toBeGreaterThanOrEqual(3);
    expect(drivers.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < drivers.length; i++)
      expect((drivers[i - 1] as { strength: number }).strength).toBeGreaterThanOrEqual(
        (drivers[i] as { strength: number }).strength,
      );
    const prog = drivers.find((d) => d.id === "programmatic:/cards");
    expect(prog?.title).toMatch(/41 URLs/);
    expect(prog?.evidenceIds.length).toBeGreaterThan(0);
    expect(drivers.find((d) => d.id === "popularity")?.title).toContain("#4,800");
  });

  it("discounts a driver the rival matches", () => {
    const L = leaderSite();
    const R = leaderSite("rival.com");
    const kw = (s: typeof L) => buildKeywords(s, []);
    const own = driverCandidates({ site: L, pillars: buildPillars(L, [], NOW), keywords: kw(L) });
    const rival = driverCandidates({ site: R, pillars: buildPillars(R, [], NOW), keywords: kw(R) });
    const alone = rankDrivers(own).drivers.find((d) => d.id === "popularity");
    const vs = rankDrivers(own, rival, "rival.com").drivers.find((d) => d.id === "popularity");
    expect(vs?.strength ?? 0).toBeLessThan(alone?.strength ?? 0);
    expect(vs?.detail ?? "").toContain("rival.com matches");
  });

  it("finds weaknesses with numbers", () => {
    const C = challengerSite();
    const serps = C.terms.slice(0, 3).map((t) => serp(t.term, C.domain, ["leader.com"]));
    const k = buildKeywords(C, serps);
    const w = findWeaknesses(C, buildPillars(C, serps, NOW), k, serps).map((x) => x.weakness);
    const ids = w.map((x) => x.id);
    expect(ids).toContain("schema-missing");
    expect(ids).toContain("thin:/guide");
    expect(ids).toContain("meta-missing");
    expect(ids).toContain("weak-offpage");
    expect(w.find((x) => x.id === "thin:/guide")?.title).toMatch(/median 180 words over 3 fetched pages/);
    if (k.checked) expect(ids).toContain("unranked-terms");
  });

  it("does not call a help centre a thin cluster", () => {
    const o = "https://a.com";
    const help = ["x", "y", "z"].map((g) => `https://help.a.com/category/${g}`);
    const pages = [page(`${o}/`), ...help.map((u) => page(u, { title: "Help", wordCount: 90 }))];
    const p = profile("a.com", { urls: [`${o}/`, ...help], pages });
    const ids = findWeaknesses(p, buildPillars(p, [], NOW), buildKeywords(p, []), []).map((x) => x.weakness.id);
    expect(ids.some((x) => x.startsWith("thin:"))).toBe(false);
  });
});

describe("strategy dossier", () => {
  it("builds a schema-valid single-domain dossier with top actions", () => {
    const L = leaderSite();
    const serps = [
      ...L.terms.slice(0, 3).map((t) => serp(t.term, L.domain, ["x.com", "leader.com"])),
      blockedSerp("blocked", L.domain),
    ];
    const d = validateStrategy(buildStrategy(run([L], serps), NOW));
    expect(d.kind).toBe("strategy");
    expect(d.roles).toMatchObject({ leader: "leader.com", challenger: null });
    expect(d.comparison).toBeNull();
    expect(d.sites[0]?.map.clusters.some((c) => c.template === "programmatic")).toBe(true);
    expect(d.competitors[0]).toMatchObject({ domain: "x.com", serps: 3 });
    expect(d.unknowns.join(" ")).toMatch(/1\/4 SERP checks were blocked/);
    expect(d.plan.for).toBe("a challenger to leader.com");
    for (const a of d.topActions) expect(a.evidenceIds.length).toBeGreaterThan(0);
    const md = renderStrategy(d);
    for (const h of [
      "## Top 10 actions for leader.com",
      "## 1. Snapshot",
      "## 2. Site and cluster map",
      "## 3. Keywords",
      "## 4. Competitors",
      "## 5. Pillars",
      "## 6. Ranked drivers",
      "## 7. Copyable playbook",
      "## 8. Weaknesses",
      "## 9. 30/60/90-day plan",
      "## 10. Side-by-side",
    ])
      expect(md).toContain(h);
    expect(md).toContain("/cards/{x}");
  });

  it("points an unranked term at the cluster named after it", () => {
    const o = "https://money.com";
    const loans = Array.from({ length: 12 }, (_, i) => `${o}/student-loans/repay-plan-${i}`);
    const pages = [
      page(`${o}/`, { title: "Money: student loans and budgets", h1: ["Student loans made simple"] }),
      page(loans[0] as string, { title: "Student loans repayment plans", h1: ["Student loans repayment"] }),
    ];
    const p = profile("money.com", { urls: [`${o}/`, ...loans], pages });
    expect(p.terms.map((t) => t.term)).toContain("student loans");
    const d = buildStrategy(run([p], [serp("student loans", p.domain, ["studentaid.gov"])]), NOW);
    expect(d.topActions[0]?.title).toMatch(/^Make \/student-loans the target page for "student loans"/);
  });

  it("rejects data that breaks the schema and exports a JSON Schema", () => {
    const d = buildStrategy(run([leaderSite()], []), NOW);
    expect(() => validateStrategy({ ...d, kind: "teardown" })).toThrow(/strategy does not match/);
    expect(() => validateStrategy({ ...d, topActions: Array.from({ length: 11 }, () => d.topActions[0]) })).toThrow();
    expect(StrategySchema.safeParse(d).success).toBe(true);
    const js = strategyJsonSchema();
    expect(js.title).toBe("seo-rea strategy dossier v1");
    const onDisk = JSON.parse(
      readFileSync(new URL("../docs/strategy-schema.json", import.meta.url), "utf8"),
    ) as unknown;
    expect(onDisk).toEqual(js);
  });
});

describe("--vs comparison", () => {
  it("assigns roles from evidence, finds cluster and keyword gaps, plans for the challenger", () => {
    const C = challengerSite();
    const L = leaderSite();
    const terms = L.terms.slice(0, 3).map((t) => t.term);
    const serps = [
      ...terms.map((t) => serp(t, L.domain, ["leader.com", "x.com", "y.com"])),
      serp("card tracker", C.domain, ["x.com", "challenger.app"]),
    ];
    expect(visibility("leader.com", serps)).toBe(30);
    const roles = assignRoles([C, L], serps);
    expect(roles.leader.domain).toBe("leader.com");
    expect(roles.basis).toMatch(/SERP visibility 30 vs 9/);
    const gaps = clusterGaps(L, C);
    expect(gaps.map((g) => g.cluster)).toContain("/cards");
    const kw = keywordOverlap(L, C, serps);
    expect(kw.leaderOnly).toEqual(terms);
    expect(kw.challengerOnly).toEqual(["card tracker"]);

    const d = validateStrategy(buildStrategy(run([C, L], serps), NOW));
    expect(d.inputs).toMatchObject({ domain: "challenger.app", vs: "leader.com" });
    expect(d.actionsFor).toBe("challenger.app");
    expect(d.plan.for).toBe("challenger.app");
    const c = d.comparison;
    expect(c?.leader).toBe("leader.com");
    expect(c?.rows.find((r) => r.metric.startsWith("Tranco"))).toMatchObject({
      leader: "#4,800",
      challenger: "unknown",
      edge: "unknown",
    });
    expect(c?.rows.find((r) => r.metric === "Programmatic clusters")).toMatchObject({
      leader: "2",
      challenger: "0",
      edge: "leader",
    });
    expect(c?.clusterGaps.some((g) => g.cluster === "/cards")).toBe(true);
    expect(c?.firstMoves.length).toBeGreaterThan(0);
    expect(d.playbook.some((s) => s.from === "gap:/cards")).toBe(true);
    expect(d.playbook.some((s) => s.from.startsWith("kw:"))).toBe(true);
    expect(d.competitors.find((x) => x.domain === "leader.com")?.isVs).toBe(true);
    const md = renderStrategy(d);
    expect(md).toContain("| Pillar | Metric | leader.com | challenger.app | Edge |");
    expect(md).toContain("**Cluster gaps**");
  });

  it("does not count a help centre as a cluster gap", () => {
    const help = Array.from({ length: 5 }, (_, i) => `https://help.leader.com/article/${i}-install-extension`);
    const L = profile("leader.com", { urls: ["https://leader.com/", ...help] });
    expect(clusterGaps(L, challengerSite())).toEqual([]);
  });

  it("breaks visibility ties with Tranco", () => {
    const a = profile("a.com", { tranco: 900000 });
    const b = profile("b.com", { tranco: 5000 });
    expect(assignRoles([a, b], []).leader.domain).toBe("b.com");
  });
});
