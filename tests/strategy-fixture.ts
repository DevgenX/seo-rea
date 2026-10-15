// Builders for strategy run data used by the strategy tests (no network).

import { extractSignals } from "../src/adapters/signals.js";
import type { AiReadinessSummary } from "../src/core/run.js";
import { buildClusters } from "../src/core/strategy/clusters.js";
import { brandTokensFor, deriveHeadTerms } from "../src/core/strategy/terms.js";
import type { CrawledPage, SerpCheck, SiteProfile, StrategyRun } from "../src/core/strategy/types.js";

let ev = 100;
const nextId = (): string => `E${String(++ev).padStart(3, "0")}`;

export function page(url: string, o: Partial<CrawledPage> & { html?: string } = {}): CrawledPage {
  const { html, ...rest } = o;
  return {
    url,
    isHome: new URL(url).pathname === "/",
    title: "",
    metaDescription: "A page.",
    metaRobots: "",
    canonical: url,
    hreflang: [],
    lang: "en",
    h1: ["Heading"],
    h2: [],
    wordCount: 800,
    schemaTypes: [],
    schemaErrors: [],
    schemaBlocks: 0,
    internalLinks: [],
    externalLinkCount: 0,
    signals: extractSignals(html ?? "<html><body><h1>Heading</h1></body></html>", url),
    evidenceId: nextId(),
    ...rest,
  };
}

export const ai = (blocked: string[] = []): AiReadinessSummary => ({
  crawlers: ["GPTBot", "OAI-SearchBot", "PerplexityBot"].map((token) => ({
    token,
    operator: "x",
    purpose: "x",
    access: blocked.includes(token) ? ("blocked" as const) : ("allowed" as const),
    explicit: blocked.includes(token),
    rule: "",
  })),
  llmsTxt: {
    present: false,
    status: 404,
    url: "",
    contentType: "",
    bytes: 0,
    title: "",
    summary: "",
    sections: [],
    errors: ["HTTP 404"],
    warnings: [],
    valid: false,
    linkCount: 0,
  },
  llmsFullTxt: {
    present: false,
    status: 404,
    url: "",
    contentType: "",
    bytes: 0,
    title: "",
    summary: "",
    sections: [],
    errors: [],
    warnings: [],
    valid: false,
    linkCount: 0,
  },
  llmsEvidenceIds: ["E090"],
  crawlerEvidenceId: "E091",
  perf: [],
});

export interface ProfileOpts {
  urls?: string[];
  pages?: CrawledPage[];
  tranco?: number | null;
  wiki?: number | null;
  blocked?: string[];
  ownedUrls?: string[];
}

export function profile(domain: string, o: ProfileOpts = {}): SiteProfile {
  const origin = `https://${domain}`;
  const pages = o.pages ?? [page(`${origin}/`, { title: `${domain} home` })];
  const urls = o.urls ?? pages.map((p) => p.url);
  const brand = domain.split(".")[0] as string;
  const brandTokens = brandTokensFor(domain, brand);
  const clusters = buildClusters(urls, pages, brandTokens, domain);
  return {
    domain,
    origin,
    brand,
    brandTokens,
    robots: { found: true, blocksRoot: false, sitemapLines: 1, evidenceId: "E001" },
    sitemap: {
      files: [{ url: `${origin}/sitemap.xml`, kind: "urlset", locs: urls.length }],
      indexChildren: 0,
      childStems: [],
      urlCount: urls.length,
      evidenceId: "E002",
    },
    navUrls: [],
    knownUrls: urls.length,
    pages,
    crawlEvidenceId: "E003",
    robotsSkipped: 0,
    ai: ai(o.blocked),
    offpage: {
      trancoRank: o.tranco ?? null,
      trancoDate: "2026-10-14",
      wikiLinkingArticles: o.wiki ?? 0,
      wikiLinkSample: [],
      wikiMentions: 0,
      commonCrawlBlocks: null,
      commonCrawlId: "",
      problems: [],
      evidenceIds: { tranco: "E004", wikiLinks: "E005", wikiMentions: "E006", commonCrawl: "E007" },
    },
    ads: [],
    citations: [],
    app: null,
    ownedUrls: o.ownedUrls ?? [],
    subdomains: [],
    urls,
    clusters,
    terms: deriveHeadTerms(pages, urls, clusters, brandTokens, 10),
    error: "",
  };
}

export function serp(term: string, from: string, domains: string[], kind: SerpCheck["kind"] = "head-term"): SerpCheck {
  return {
    term,
    kind,
    from,
    engine: "Bing (headless Chromium)",
    problem: "",
    evidenceId: nextId(),
    organic: domains.map((d, i) => ({
      position: i + 1,
      url: `https://${d}/${term.replace(/\s+/g, "-")}`,
      domain: d,
      title: `${term} - ${d}`,
      snippet: "",
    })),
    ads: [],
  };
}

export const blockedSerp = (term: string, from: string): SerpCheck => ({
  ...serp(term, from, []),
  problem: "Google captcha (unusual traffic page)",
});

export function run(sites: SiteProfile[], serps: SerpCheck[]): StrategyRun {
  return {
    tool: "seo-rea",
    version: "0.4.0",
    runId: "20261014T120000Z",
    createdAt: "2026-10-14T12:00:00.000Z",
    budgetUsd: 0,
    spentUsd: 0,
    subject: sites[0]?.domain ?? "",
    vs: sites[1]?.domain ?? null,
    sites,
    serps,
    serpNotes: [],
    unknowns: [],
  };
}

/** A leader with a 40-URL programmatic review template and a hub page linking to it. */
export function leaderSite(domain = "leader.com"): SiteProfile {
  const o = `https://${domain}`;
  const cards = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "kappa", "zeta"];
  const reviews = Array.from({ length: 40 }, (_, i) => `${o}/cards/${cards[i % 8]}-card-${i}-review`);
  const guides = Array.from({ length: 12 }, (_, i) => `${o}/learn/credit-score-tips-${i}`);
  const hub = page(`${o}/cards`, {
    title: "Best rewards credit cards",
    internalLinks: reviews.slice(0, 30),
    schemaTypes: ["ItemList"],
    schemaBlocks: 1,
  });
  const pages = [
    page(`${o}/`, {
      title: "Leader: rewards credit cards compared",
      metaDescription: "Compare rewards credit cards and credit card reviews.",
      h1: ["Rewards credit cards"],
      schemaTypes: ["Organization"],
      schemaBlocks: 1,
    }),
    hub,
    ...reviews.slice(0, 4).map((u) =>
      page(u, {
        title: "Alpha card review: rewards credit card",
        h1: ["Alpha card review"],
        h2: ["Rewards", "Fees", "Pros and cons", "Verdict"],
        wordCount: 2400,
        schemaTypes: ["Review", "BreadcrumbList"],
        schemaBlocks: 1,
      }),
    ),
    page(guides[0] as string, {
      title: "Credit score tips",
      wordCount: 1500,
      schemaTypes: ["Article"],
      schemaBlocks: 1,
    }),
  ];
  return profile(domain, { urls: [`${o}/`, `${o}/cards`, ...reviews, ...guides], pages, tranco: 4800, wiki: 29 });
}

/** A small challenger: a homepage and three guides, no schema, no rankings. */
export function challengerSite(domain = "challenger.app"): SiteProfile {
  const o = `https://${domain}`;
  const pages = [
    page(`${o}/`, { title: "Challenger: card tracker", h1: ["Track your cards"], metaDescription: "" }),
    ...["statement-date", "due-date", "grace-period"].map((g) =>
      page(`${o}/guide/${g}`, { title: `Guide: ${g.replace(/-/g, " ")}`, wordCount: 180, metaDescription: "" }),
    ),
  ];
  return profile(domain, { pages, tranco: null, wiki: 0 });
}
