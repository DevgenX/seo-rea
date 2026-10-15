// Ranked drivers: the reasons a site leads, each triggered by a measured
// signal, scored 0-100 and rated for how hard it is to copy. Pure.

import { median } from "../util.js";
import { classifyTemplate, type Cluster } from "./clusters.js";
import type { Driver, Pillars, SiteStrategy } from "./schema.js";
import { isSupportUrl } from "./terms.js";
import type { SiteProfile } from "./types.js";

export interface DriverCandidate extends Omit<Driver, "rank"> {
  /** Comparable size of the signal, used to discount drivers a rival matches. */
  metric: number;
  copyStep: { step: string; effort: "S" | "M" | "L"; impact: "low" | "medium" | "high" };
}

export interface DriverInput {
  site: SiteProfile;
  pillars: Pillars;
  keywords: SiteStrategy["keywords"];
}

const clamp = (n: number, lo = 0, hi = 100): number => Math.round(Math.max(lo, Math.min(hi, n)));
const pct = (x: number | null): string => (x === null ? "n/a" : `${Math.round(x * 100)}%`);
const fmt = (n: number): string => n.toLocaleString("en-US");
const ids = (list: Array<string | undefined>): string[] => [...new Set(list.filter((x): x is string => !!x))];
/** Path, with the host kept for subdomains (help.example.com/article/1). */
export const pathOf = (u: string): string => {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\./, "");
    return `${host.split(".").length > 2 ? host : ""}${x.pathname || "/"}`;
  } catch {
    return u;
  }
};

const CONTENT = new Set(["blog", "guide", "review", "comparison"]);
/** Content clusters: no catch-all bucket, no homepage, no help centre. */
const realClusters = (s: SiteProfile): Cluster[] =>
  s.clusters.filter((c) => c.key !== "/(top-level)" && c.key !== "/" && !isSupportUrl(c.exampleUrls[0] ?? ""));

/** Every driver a site's data supports, unranked. */
export function driverCandidates({ site: s, pillars: p, keywords: k }: DriverInput): DriverCandidate[] {
  const out: DriverCandidate[] = [];
  const mapIds = ids([s.sitemap.evidenceId, s.crawlEvidenceId]);
  const pageIds = (urls: string[]): string[] =>
    ids(s.pages.filter((x) => urls.includes(x.url)).map((x) => x.evidenceId));

  for (const c of realClusters(s).filter((x) => x.programmatic)) {
    const g = c.programmatic as NonNullable<Cluster["programmatic"]>;
    out.push({
      id: `programmatic:${c.key}`,
      title: `Programmatic ${c.baseTemplate === "page" ? "" : `${c.baseTemplate} `}pages: ${fmt(c.urlCount)} URLs on one template at ${g.pattern}`,
      detail: `${pct(g.share)} of ${c.key} URLs fit ${g.pattern} (${g.basis}${g.headingSimilarity !== null ? `; H2 overlap ${g.headingSimilarity} across fetched pages` : ""}). Examples: ${c.exampleUrls.map(pathOf).join(", ")}.`,
      strength: clamp(30 + 15 * Math.log10(c.urlCount)),
      metric: c.urlCount,
      copyDifficulty: c.urlCount > 1000 ? "hard" : "medium",
      copyNote: `Needs a structured data source covering ~${fmt(c.urlCount)} entities plus a template; the template is easy, the data is the moat.`,
      basis: "inferred",
      evidenceIds: mapIds,
      copyStep: {
        step: `Build one ${c.baseTemplate} template like ${g.pattern} and launch it for the 20 entities your users ask about most, then expand (${s.domain} runs ${fmt(c.urlCount)} of these; e.g. ${c.exampleUrls[0] ? pathOf(c.exampleUrls[0]) : c.key}).`,
        effort: "L",
        impact: "high",
      },
    });
  }

  const urls = Math.max(s.sitemap.urlCount, s.knownUrls);
  const big = realClusters(s).filter((c) => c.urlCount >= 10);
  if (urls >= 50 && big.length >= 2) {
    const stems = s.sitemap.childStems.slice(0, 3).map((x) => `${x.stem} x${x.files}`);
    out.push({
      id: "scale",
      title: `Topical breadth: ${fmt(urls)} known URLs across ${big.length} clusters of 10+ pages`,
      detail: `Largest clusters: ${big
        .slice(0, 4)
        .map((c) => `${c.key} (${fmt(c.urlCount)}, ${c.template})`)
        .join(
          ", ",
        )}.${s.sitemap.indexChildren ? ` Sitemap index lists ${s.sitemap.indexChildren} child sitemaps${stems.length ? ` (${stems.join(", ")})` : ""}.` : ""}`,
      strength: clamp(15 + 14 * Math.log10(urls) + 3 * Math.min(big.length, 10)),
      metric: urls,
      copyDifficulty: urls > 5000 ? "hard" : "medium",
      copyNote: `Years of publishing; copy the cluster shape, not the volume.`,
      basis: "observed",
      evidenceIds: mapIds,
      copyStep: {
        step: `Pick the 2-3 ${s.domain} clusters closest to your product (${big
          .slice(0, 3)
          .map((c) => c.key)
          .join(", ")}) and publish 10+ linked pages in each before widening.`,
        effort: "L",
        impact: "high",
      },
    });
  }

  const ranked = k.terms.filter((t) => t.check.position !== null && t.check.position <= 10);
  if (ranked.length) {
    const med = median(ranked.map((t) => t.check.position as number)) ?? 10;
    out.push({
      id: "serp",
      title: `Ranks top 10 for ${ranked.length}/${k.checked} of its own head terms (median #${med})`,
      detail: ranked
        .slice(0, 6)
        .map((t) => `"${t.term}" #${t.check.position} (${pathOf(t.check.url)}, ${t.check.engine})`)
        .join("; "),
      strength: clamp((80 * ranked.length) / Math.max(k.checked, 1) + (11 - med) * 2),
      metric: ranked.length,
      copyDifficulty: "hard",
      copyNote: "Rankings follow from the other drivers; target the same terms with better pages.",
      basis: "observed",
      evidenceIds: ids(ranked.map((t) => t.check.evidenceId)),
      copyStep: {
        step: `Write one page per term ${s.domain} ranks for, modelled on its ranking URL: ${ranked
          .slice(0, 3)
          .map((t) => `"${t.term}" (#${t.check.position} ${pathOf(t.check.url)})`)
          .join(", ")}.`,
        effort: "M",
        impact: "high",
      },
    });
  }

  const o = p.offPage;
  if (o.trancoRank !== null) {
    const r = o.trancoRank;
    const base = r <= 1000 ? 95 : r <= 10000 ? 85 : r <= 50000 ? 72 : r <= 100000 ? 65 : r <= 500000 ? 50 : 40;
    const wiki = o.wikipediaLinkingArticles ?? 0;
    out.push({
      id: "popularity",
      title: `Popularity: Tranco rank #${fmt(r)}${wiki ? `; ${wiki} Wikipedia article(s) link to it` : ""}`,
      detail: `Tranco ranks the top 1M domains by aggregated traffic lists (${s.offpage.trancoDate}).${s.offpage.wikiLinkSample.length ? ` Linking articles include: ${s.offpage.wikiLinkSample.slice(0, 4).join(", ")}.` : ""}`,
      strength: clamp(base + Math.min(10, wiki / 5)),
      metric: 1e6 / r,
      copyDifficulty: "hard",
      copyNote: "Brand demand and reference links build over years.",
      basis: "observed",
      evidenceIds: ids([s.offpage.evidenceIds.tranco, s.offpage.evidenceIds.wikiLinks]),
      copyStep: {
        step: `Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (${s.domain} is linked from ${wiki} Wikipedia article(s)).`,
        effort: "L",
        impact: "medium",
      },
    });
  }

  const third = o.brandSerpThirdParty ?? 0;
  if (third >= 3)
    out.push({
      id: "brand-mentions",
      title: `Third-party coverage: brand search "${s.brand}" returns ${third} other domains`,
      detail: `Domains: ${o.brandSerpDomains.slice(0, 8).join(", ")}.`,
      strength: clamp(25 + 6 * third, 0, 85),
      metric: third,
      copyDifficulty: "hard",
      copyNote: "Reviews, forums and press pick a brand up once it has users.",
      basis: "observed",
      evidenceIds: o.evidenceIds,
      copyStep: {
        step: `Get listed or reviewed on the sites that cover ${s.brand}: ${o.brandSerpDomains.slice(0, 5).join(", ")}.`,
        effort: "M",
        impact: "medium",
      },
    });

  const t = p.technical;
  if (t.pagesWithSchema !== null && t.pagesWithSchema >= 0.5 && p.onPage.pagesFetched >= 3) {
    const errShare = t.pagesWithSchemaErrors / p.onPage.pagesFetched;
    const types = t.schemaTypes.slice(0, 5).map((x) => `${x.type} ${x.pages}`);
    out.push({
      id: "schema",
      title: `Structured data on ${pct(t.pagesWithSchema)} of ${p.onPage.pagesFetched} sampled pages`,
      detail: `Types by page count: ${types.join(", ")}. Pages with JSON-LD errors: ${t.pagesWithSchemaErrors}.`,
      strength: clamp(25 + 45 * t.pagesWithSchema + (p.aeo.faqSchemaPages ? 5 : 0) - 20 * errShare),
      metric: t.pagesWithSchema,
      copyDifficulty: "easy",
      copyNote: "A template change; no content needed.",
      basis: "observed",
      evidenceIds: t.evidenceIds.slice(0, 6),
      copyStep: {
        step: `Add the JSON-LD ${s.domain} uses on matching templates: ${t.schemaTypes
          .slice(0, 4)
          .map((x) => x.type)
          .join(", ")}.`,
        effort: "S",
        impact: "medium",
      },
    });
  }

  const content = s.pages.filter(
    (x) => !x.isHome && CONTENT.has(classifyTemplate(x.url, x.title, x.schemaTypes, x.signals.formInputs)),
  );
  const medWords = median(content.map((x) => x.wordCount));
  if (content.length >= 3 && medWords !== null && medWords >= 1200)
    out.push({
      id: "depth",
      title: `Long-form content: median ${fmt(medWords)} words across ${content.length} fetched editorial pages`,
      detail: `Median ${median(content.map((x) => x.h2.length))} H2 sections. Longest: ${content
        .toSorted((a, b) => b.wordCount - a.wordCount)
        .slice(0, 2)
        .map((x) => `${pathOf(x.url)} (${fmt(x.wordCount)})`)
        .join(", ")}.`,
      strength: clamp(35 + (medWords - 1200) / 40, 0, 85),
      metric: medWords,
      copyDifficulty: "medium",
      copyNote: "Needs writers with subject knowledge; length alone does not rank.",
      basis: "observed",
      evidenceIds: pageIds(content.map((x) => x.url)).slice(0, 6),
      copyStep: {
        step: `Match depth on your top 5 pages: about ${fmt(medWords)} words and ${median(content.map((x) => x.h2.length))} H2 sections, like ${content[0] ? pathOf(content[0].url) : s.domain}.`,
        effort: "M",
        impact: "medium",
      },
    });

  const on = p.onPage;
  if (on.datedPages >= 5 && on.updatedWithinYear !== null && on.updatedWithinYear >= 0.6)
    out.push({
      id: "freshness",
      title: `Fresh content: ${pct(on.updatedWithinYear)} of ${on.datedPages} dated pages updated within 12 months`,
      detail: `Median page age ${on.medianAgeDays} days (dateModified, article:modified_time or visible "Updated" text).`,
      strength: clamp(30 + 45 * on.updatedWithinYear),
      metric: on.updatedWithinYear,
      copyDifficulty: "medium",
      copyNote: "Needs an editorial refresh calendar.",
      basis: "observed",
      evidenceIds: on.evidenceIds.slice(0, 6),
      copyStep: {
        step: `Show "Updated <date>" plus dateModified on every guide and re-review the top pages every ${(on.medianAgeDays ?? 365) <= 120 ? 90 : 180} days (${s.domain} median age: ${on.medianAgeDays} days).`,
        effort: "S",
        impact: "medium",
      },
    });

  const hubs = realClusters(s)
    .flatMap((c) => c.hubs.map((h) => ({ ...h, cluster: c })))
    .toSorted((a, b) => b.linksIntoCluster - a.linksIntoCluster);
  const hub = hubs[0];
  if (hub && hub.linksIntoCluster >= 20)
    out.push({
      id: "hubs",
      title: `Hub pages: ${pathOf(hub.url)} links to ${hub.linksIntoCluster} pages in ${hub.cluster.key}`,
      detail: hubs
        .slice(0, 4)
        .map((h) => `${pathOf(h.url)} -> ${h.cluster.key} (${h.linksIntoCluster})`)
        .join("; "),
      strength: clamp(30 + hub.linksIntoCluster / 3, 0, 80),
      metric: hub.linksIntoCluster,
      copyDifficulty: "easy",
      copyNote: "Pure site architecture.",
      basis: "observed",
      evidenceIds: pageIds([hub.url]),
      copyStep: {
        step: `Create one hub per cluster that links every child page, as ${pathOf(hub.url)} does for ${hub.cluster.key}.`,
        effort: "S",
        impact: "medium",
      },
    });

  const toolUrls = s.urls.filter((u) => classifyTemplate(u) === "tool");
  const toolCount = Math.max(
    toolUrls.length,
    realClusters(s)
      .filter((c) => c.baseTemplate === "tool")
      .reduce((n, c) => n + c.urlCount, 0),
  );
  if (toolCount >= 3)
    out.push({
      id: "tools",
      title: `Interactive tools: ${toolCount} calculator/tool URLs`,
      detail: `Examples: ${toolUrls.slice(0, 4).map(pathOf).join(", ")}.`,
      strength: clamp(30 + 6 * Math.min(toolCount, 8)),
      metric: toolCount,
      copyDifficulty: "medium",
      copyNote: "Needs engineering, then earns links and repeat visits.",
      basis: "inferred",
      evidenceIds: mapIds,
      copyStep: {
        step: `Ship free tools for the questions your users repeat; ${s.domain} has ${toolUrls
          .slice(0, 3)
          .map(pathOf)
          .join(", ")}.`,
        effort: "M",
        impact: "medium",
      },
    });

  const commercial = s.urls.filter((u) => ["review", "comparison"].includes(classifyTemplate(u)));
  if (commercial.length >= 5)
    out.push({
      id: "commercial",
      title: `Commercial-intent pages: ${commercial.length} review/comparison URLs in the mapped sample`,
      detail: `Examples: ${commercial.slice(0, 4).map(pathOf).join(", ")}.`,
      strength: clamp(30 + 2 * commercial.length, 0, 85),
      metric: commercial.length,
      copyDifficulty: "medium",
      copyNote: "Needs honest product testing to be credible.",
      basis: "inferred",
      evidenceIds: mapIds,
      copyStep: {
        step: `Publish "X vs Y" and "<product> review" pages for what your users compare, like ${commercial
          .slice(0, 2)
          .map(pathOf)
          .join(" and ")}.`,
        effort: "M",
        impact: "high",
      },
    });

  const chans = p.distribution.channels;
  const groups = new Set(chans.map((c) => (c.channel.startsWith("Social") ? "social" : c.channel)));
  const socialCount = chans.filter((c) => c.channel.startsWith("Social")).length;
  if (socialCount < 2) groups.delete("social");
  if (groups.size >= 3)
    out.push({
      id: "distribution",
      title: `Distribution beyond search: ${[...groups].map((g) => (g === "social" ? `${socialCount} social profiles` : g)).join(", ")}`,
      detail: chans.map((c) => `${c.channel}${c.url ? ` (${c.url})` : ""}`).join("; "),
      strength: clamp(20 + 12 * groups.size, 0, 85),
      metric: groups.size,
      copyDifficulty: groups.has("iOS App Store") || groups.has("Browser extension") ? "hard" : "medium",
      copyNote: "Each channel is a product or a habit, not a page.",
      basis: "observed",
      evidenceIds: p.distribution.evidenceIds,
      copyStep: {
        step: `Add the owned channels ${s.domain} uses that you lack (${[...groups].join(", ")}); start with a newsletter or extension tied to your best tool.`,
        effort: "L",
        impact: "medium",
      },
    });

  if (p.paid.serpAdsByDomain >= 1)
    out.push({
      id: "paid",
      title: `Buys search ads: ${p.paid.serpAdsByDomain} ad(s) by ${s.domain} on the checked SERPs`,
      detail: `${p.paid.serpsWithAnyAds}/${p.paid.serpsChecked} usable SERPs showed ads.`,
      strength: clamp(30 + 12 * p.paid.serpAdsByDomain, 0, 75),
      metric: p.paid.serpAdsByDomain,
      copyDifficulty: "easy",
      copyNote: "Only budget.",
      basis: "observed",
      evidenceIds: p.paid.evidenceIds,
      copyStep: {
        step: `Test a capped search-ads budget on the terms where ${s.domain} advertises.`,
        effort: "S",
        impact: "medium",
      },
    });

  const a = p.aeo;
  const af = a.answerFirstShare ?? 0;
  if (!a.blockedSearchCrawlers.length && (af >= 0.3 || a.questionBlockPages >= 3)) {
    const score = 25 + (a.llmsTxt === "valid" ? 15 : 0) + 30 * af + Math.min(15, a.questionBlockPages * 3);
    const parts = [
      af >= 0.3 ? `${pct(a.answerFirstShare)} of inner pages open with a direct answer` : "",
      a.questionBlockPages >= 3 ? `${a.questionBlockPages} pages with Q&A blocks` : "",
      a.faqSchemaPages ? `FAQPage schema on ${a.faqSchemaPages}` : "",
      a.llmsTxt === "valid" ? "valid llms.txt" : "",
    ].filter(Boolean);
    out.push({
      id: "aeo",
      title: `Answer-ready for AI search: ${parts.join(", ")}`,
      detail: "No AI search crawler (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) is blocked.",
      strength: clamp(score, 0, 80),
      metric: score,
      copyDifficulty: "easy",
      copyNote: "Formatting and robots.txt changes.",
      basis: "observed",
      evidenceIds: a.evidenceIds,
      copyStep: {
        step: "Open each guide with a 1-3 sentence direct answer, add a question-led FAQ block, publish /llms.txt.",
        effort: "S",
        impact: "medium",
      },
    });
  }

  const app = s.app;
  if (app && (app.ratingCount ?? 0) >= 100)
    out.push({
      id: "app",
      title: `App Store demand: "${app.name}" rated ${app.rating?.toFixed(1) ?? "?"} from ${fmt(app.ratingCount ?? 0)} ratings`,
      detail: `${app.genre}; ${app.price || "price n/a"}; last update ${app.updatedAt || "unknown"}. Store listings rank for brand and category searches and send users who never touch the website.`,
      strength: clamp(30 + 12 * Math.log10(app.ratingCount ?? 1) + ((app.rating ?? 0) >= 4.5 ? 8 : 0), 0, 90),
      metric: app.ratingCount ?? 0,
      copyDifficulty: (app.ratingCount ?? 0) > 5000 ? "hard" : "medium",
      copyNote: "Ratings accrue with users; prompt for reviews at the moment of value.",
      basis: "observed",
      evidenceIds: ids([app.evidenceId]),
      copyStep: {
        step: `Ask for App Store ratings right after the in-app moment users came for; ${s.domain} has ${fmt(app.ratingCount ?? 0)}.`,
        effort: "S",
        impact: "medium",
      },
    });

  const perf = t.psi?.performance;
  if (perf !== null && perf !== undefined && perf >= 85)
    out.push({
      id: "speed",
      title: `Fast mobile homepage: PageSpeed performance ${perf}${t.psi?.lcp ? `, LCP ${t.psi.lcp}` : ""}`,
      detail: `PageSpeed SEO score ${t.psi?.seo ?? "n/a"}.`,
      strength: clamp(35 + (perf - 85)),
      metric: perf,
      copyDifficulty: "medium",
      copyNote: "Front-end work.",
      basis: "observed",
      evidenceIds: ids([t.psi?.evidenceId]),
      copyStep: {
        step: `Get mobile PageSpeed to ${perf}+ on your homepage and top templates.`,
        effort: "M",
        impact: "low",
      },
    });

  if (a.organizationSchema && a.sameAsCount >= 3)
    out.push({
      id: "entity",
      title: `Clear entity: Organization JSON-LD with ${a.sameAsCount} sameAs profiles`,
      detail: "Ties the brand to its profiles for knowledge panels and AI answers.",
      strength: clamp(30 + 4 * a.sameAsCount, 0, 60),
      metric: a.sameAsCount,
      copyDifficulty: "easy",
      copyNote: "One JSON-LD block.",
      basis: "observed",
      evidenceIds: a.evidenceIds.slice(0, 3),
      copyStep: {
        step: "Add Organization JSON-LD with logo and sameAs links to every official profile.",
        effort: "S",
        impact: "low",
      },
    });
  return out;
}

const MIN_STRENGTH = 30;
const MAX_DRIVERS = 8;

/**
 * Rank a site's drivers. When a rival's matching signal is at least 80% as
 * large, the driver is no differentiator and its strength drops by 40%.
 */
export function rankDrivers(
  own: DriverCandidate[],
  rival: DriverCandidate[] = [],
  rivalDomain = "",
): { drivers: Driver[]; candidates: DriverCandidate[] } {
  const adjusted = own.map((d) => {
    const r = rival.find((x) => x.id === d.id);
    if (r && r.metric >= 0.8 * d.metric)
      return {
        ...d,
        strength: Math.round(d.strength * 0.6),
        detail: `${d.detail} ${rivalDomain} matches this (${r.title}).`,
      };
    return d;
  });
  const kept = adjusted
    .filter((d) => d.strength >= MIN_STRENGTH)
    .toSorted((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))
    .slice(0, MAX_DRIVERS);
  return {
    candidates: kept,
    drivers: kept.map(({ metric: _m, copyStep: _c, ...d }, i) => ({ rank: i + 1, ...d })),
  };
}
