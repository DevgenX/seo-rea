// Weaknesses and openings: where a site is measurably weak. Every item is
// triggered by a number from the run data. Pure.

import { classifyTemplate } from "./clusters.js";
import { pathOf } from "./drivers.js";
import { isSupportUrl } from "./terms.js";
import type { Pillars, SiteStrategy, Weakness } from "./schema.js";
import type { SerpCheck, SiteProfile } from "./types.js";

const uniq = (x: string, i: number, list: string[]): boolean => list.indexOf(x) === i;

const SEV = { high: 3, medium: 2, low: 1 } as const;
const ids = (list: Array<string | undefined>): string[] => [...new Set(list.filter((x): x is string => !!x))];
const pct = (x: number): string => `${Math.round(x * 100)}%`;

export interface WeaknessFix {
  weakness: Weakness;
  /** The fix for the site itself (used for its own top actions). */
  fix: { step: string; effort: "S" | "M" | "L"; impact: "low" | "medium" | "high"; owner: "content" | "dev" | "seo" };
}

export function findWeaknesses(
  s: SiteProfile,
  p: Pillars,
  k: SiteStrategy["keywords"],
  serps: SerpCheck[],
): WeaknessFix[] {
  const out: WeaknessFix[] = [];
  const add = (w: Weakness, fix: WeaknessFix["fix"]): void => {
    out.push({ weakness: { ...w, evidenceIds: ids(w.evidenceIds) }, fix });
  };
  const P = s.pages;
  const n = P.length;
  const pageIds = (list = P): string[] => ids(list.map((x) => x.evidenceId)).slice(0, 6);

  if (!n)
    add(
      {
        id: "unreachable",
        title: `No pages could be fetched from ${s.domain}`,
        detail: s.error || "every fetch failed",
        severity: "high",
        opening: "Nothing to analyse; check the domain or robots.txt.",
        basis: "observed",
        evidenceIds: [s.crawlEvidenceId],
      },
      {
        step: `Make ${s.domain} reachable to crawlers (${s.error || "fetch failed"})`,
        effort: "S",
        impact: "high",
        owner: "dev",
      },
    );

  // Queries the site targets but does not rank for, with who ranks instead.
  const misses = k.terms.filter((t) => t.check.status === "not-in-results");
  if (misses.length) {
    const lines = misses.slice(0, 5).map((t) => {
      const c = serps.find((x) => x.term === t.term && x.kind === "head-term");
      return `"${t.term}" (#1 ${c?.organic[0]?.domain ?? "?"})`;
    });
    add(
      {
        id: "unranked-terms",
        title: `Not in the checked results for ${misses.length}/${k.checked} of its own head terms`,
        detail: lines.join("; "),
        severity: misses.length >= Math.max(3, k.checked / 2) ? "high" : "medium",
        opening: `Publish a better page for ${misses
          .slice(0, 3)
          .map((t) => `"${t.term}"`)
          .join(", ")}; ${s.domain} is not in the checked results.`,
        basis: "observed",
        evidenceIds: misses.map((t) => t.check.evidenceId),
      },
      {
        step: `Give each unranked head term one page with the term in title and H1: ${misses
          .slice(0, 4)
          .map((t) => `"${t.term}"`)
          .join(", ")}`,
        effort: "M",
        impact: "high",
        owner: "content",
      },
    );
  }

  for (const c of s.clusters.filter(
    (x) =>
      x.key !== "/(top-level)" &&
      x.fetchedPages >= 2 &&
      x.medianWords !== null &&
      x.medianWords < 300 &&
      !isSupportUrl(x.exampleUrls[0] ?? "") &&
      !["tool", "product", "category"].includes(x.baseTemplate),
  ))
    add(
      {
        id: `thin:${c.key}`,
        title: `Thin cluster ${c.key}: median ${c.medianWords} words over ${c.fetchedPages} fetched pages`,
        detail: `${c.urlCount} URLs, ${c.template} template; examples ${c.exampleUrls.slice(0, 2).map(pathOf).join(", ")}.`,
        severity: c.urlCount >= 20 ? "medium" : "low",
        opening: `Out-write ${c.key} with ~${Math.max(800, (c.medianWords ?? 0) * 3)}-word pages on ${c.terms.slice(0, 3).join(", ") || c.name}.`,
        basis: "observed",
        evidenceIds: [s.crawlEvidenceId],
      },
      {
        step: `Expand ${c.key} pages past ${Math.max(600, (c.medianWords ?? 0) * 2)} words with answers and examples`,
        effort: "M",
        impact: "medium",
        owner: "content",
      },
    );

  const t = p.technical;
  const noSchema = P.filter((x) => !x.schemaBlocks);
  if (n >= 3 && noSchema.length / n >= 0.3)
    add(
      {
        id: "schema-missing",
        title: `No JSON-LD on ${noSchema.length}/${n} sampled pages`,
        detail: `e.g. ${noSchema
          .slice(0, 3)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}.`,
        severity: noSchema.length / n >= 0.7 ? "medium" : "low",
        opening: `Mark up the same templates with JSON-LD; ${s.domain} leaves ${noSchema.length}/${n} sampled pages bare.`,
        basis: "observed",
        evidenceIds: pageIds(noSchema),
      },
      {
        step: `Add JSON-LD to the ${noSchema.length} unmarked pages (${noSchema
          .slice(0, 2)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}): Organization on home, Article/Product/FAQPage by template`,
        effort: "S",
        impact: "medium",
        owner: "dev",
      },
    );
  if (t.pagesWithSchemaErrors)
    add(
      {
        id: "schema-errors",
        title: `JSON-LD errors on ${t.pagesWithSchemaErrors} sampled page(s)`,
        detail: t.schemaErrorSamples.slice(0, 3).join("; "),
        severity: "low",
        opening: "Invalid markup is ignored for rich results.",
        basis: "observed",
        evidenceIds: pageIds(P.filter((x) => x.schemaErrors.length)),
      },
      {
        step: `Fix JSON-LD errors: ${t.schemaErrorSamples.slice(0, 2).join("; ")}`,
        effort: "S",
        impact: "medium",
        owner: "dev",
      },
    );

  const perf = t.psi?.performance;
  if (perf !== null && perf !== undefined && perf < 75)
    add(
      {
        id: "slow",
        title: `Slow mobile homepage: PageSpeed performance ${perf}${t.psi?.lcp ? `, LCP ${t.psi.lcp}` : ""}`,
        detail: `PageSpeed SEO ${t.psi?.seo ?? "n/a"}; median HTML ${t.medianHtmlKb ?? "?"} KB across sampled pages.`,
        severity: perf < 50 ? "high" : "medium",
        opening: `Beat its mobile PageSpeed ${perf} on the pages that compete for the same queries.`,
        basis: "observed",
        evidenceIds: [t.psi?.evidenceId ?? ""],
      },
      {
        step: `Raise mobile PageSpeed from ${perf} (LCP ${t.psi?.lcp || "n/a"}): compress hero media, defer scripts`,
        effort: perf < 50 ? "L" : "M",
        impact: "medium",
        owner: "dev",
      },
    );

  const a = p.aeo;
  if (a.blockedSearchCrawlers.length)
    add(
      {
        id: "ai-blocked",
        title: `Blocks AI search crawlers: ${a.blockedSearchCrawlers.join(", ")}`,
        detail: "robots.txt keeps these bots out, so AI answers cannot fetch the site.",
        severity: "high",
        opening: `Allow ${a.blockedSearchCrawlers.join(", ")} on your own site to take the AI-answer citations ${s.domain} gives up.`,
        basis: "observed",
        evidenceIds: a.evidenceIds,
      },
      { step: `Allow ${a.blockedSearchCrawlers.join(", ")} in robots.txt`, effort: "S", impact: "high", owner: "dev" },
    );
  else if (a.blockedCrawlers.length)
    add(
      {
        id: "ai-training-blocked",
        title: `Blocks AI training crawlers: ${a.blockedCrawlers.join(", ")}`,
        detail: "Search-time bots are allowed; training bots are not (a policy choice).",
        severity: "low",
        opening: "Models trained without the site know less about the brand.",
        basis: "observed",
        evidenceIds: a.evidenceIds,
      },
      {
        step: `Review whether blocking ${a.blockedCrawlers.join(", ")} is intended`,
        effort: "S",
        impact: "low",
        owner: "seo",
      },
    );
  if (a.llmsTxt !== "valid")
    add(
      {
        id: "llms-txt",
        title: a.llmsTxt === "absent" ? "No /llms.txt" : "/llms.txt does not follow llmstxt.org",
        detail: s.ai.llmsTxt.errors.slice(0, 2).join("; ") || "not found",
        severity: "low",
        opening: "Publish your own /llms.txt; it has none that validates.",
        basis: "observed",
        evidenceIds: s.ai.llmsEvidenceIds.slice(0, 1),
      },
      {
        step: "Publish /llms.txt: H1 name, > summary, ## sections linking key pages",
        effort: "S",
        impact: "low",
        owner: "dev",
      },
    );
  if (n >= 5 && !a.questionBlockPages && !a.faqSchemaPages)
    add(
      {
        id: "no-qa",
        title: `No FAQ or question-led sections on any of ${n} sampled pages`,
        detail: "No H2/H3 ending in '?', no <details>, no FAQPage schema.",
        severity: "medium",
        opening: `Add FAQ blocks to your pages on the same topics; ${s.domain} has none on ${n} sampled pages.`,
        basis: "observed",
        evidenceIds: pageIds(),
      },
      {
        step: "Add a 4-6 question FAQ block (with FAQPage JSON-LD) to the top 5 pages",
        effort: "S",
        impact: "medium",
        owner: "content",
      },
    );
  const nonHome = P.filter((x) => !x.isHome);
  if (nonHome.length >= 5 && (a.answerFirstShare ?? 0) < 0.2)
    add(
      {
        id: "no-answer-first",
        title: `Only ${pct(a.answerFirstShare ?? 0)} of ${nonHome.length} inner pages open with a direct answer`,
        detail: "First paragraph after the H1 is missing, too long, or does not name the topic.",
        severity: "low",
        opening: `Lead your pages with the answer; ${s.domain} does so on ${pct(a.answerFirstShare ?? 0)} of inner pages.`,
        basis: "inferred",
        evidenceIds: pageIds(nonHome),
      },
      {
        step: "Open each inner page with a 1-3 sentence answer that repeats the H1 topic",
        effort: "S",
        impact: "medium",
        owner: "content",
      },
    );

  const on = p.onPage;
  const editorial = P.filter((x) =>
    ["blog", "guide", "review", "comparison"].includes(classifyTemplate(x.url, x.title, x.schemaTypes)),
  );
  const undated = editorial.filter((x) => !x.signals.modified && !x.signals.published);
  if (on.datedPages >= 5 && (on.medianAgeDays ?? 0) > 365)
    add(
      {
        id: "stale",
        title: `Stale content: median page age ${on.medianAgeDays} days across ${on.datedPages} dated pages`,
        detail: on.updatedWithinYear
          ? `Only ${pct(on.updatedWithinYear)} updated within 12 months.`
          : "None updated within 12 months.",
        severity: "medium",
        opening: `Publish dated, current versions of its oldest topics (median age ${on.medianAgeDays} days).`,
        basis: "observed",
        evidenceIds: on.evidenceIds.slice(0, 6),
      },
      {
        step: "Refresh and re-date the oldest high-traffic pages first",
        effort: "M",
        impact: "medium",
        owner: "content",
      },
    );
  else if (editorial.length >= 3 && undated.length / editorial.length >= 0.5)
    add(
      {
        id: "undated",
        title: `No visible or structured date on ${undated.length}/${editorial.length} editorial pages`,
        detail: `e.g. ${undated
          .slice(0, 2)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}.`,
        severity: "low",
        opening: `Date your guides visibly; ${undated.length}/${editorial.length} of its editorial pages show no date.`,
        basis: "observed",
        evidenceIds: pageIds(undated),
      },
      {
        step: 'Show "Updated <date>" and add datePublished/dateModified JSON-LD to guides',
        effort: "S",
        impact: "low",
        owner: "dev",
      },
    );

  const noH1 = P.filter((x) => !x.h1.length);
  if (n >= 3 && noH1.length / n >= 0.3)
    add(
      {
        id: "h1-missing",
        title: `No H1 on ${noH1.length}/${n} sampled pages`,
        detail: `e.g. ${noH1
          .slice(0, 3)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}.`,
        severity: noH1.length / n >= 0.6 ? "medium" : "low",
        opening: `Give your matching pages a clear H1; ${s.domain} leaves ${noH1.length}/${n} without one.`,
        basis: "observed",
        evidenceIds: pageIds(noH1),
      },
      {
        step: `Add one descriptive H1 per page (${noH1
          .slice(0, 2)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")} first)`,
        effort: "S",
        impact: "medium",
        owner: "content",
      },
    );
  if (s.app && (s.app.ratingCount ?? 0) < 100)
    add(
      {
        id: "app-ratings",
        title: `Few App Store ratings: "${s.app.name}" has ${s.app.ratingCount ?? 0}`,
        detail: `Average ${s.app.rating?.toFixed(1) ?? "n/a"}; ${s.app.genre}.`,
        severity: "medium",
        opening: "A rival app with more ratings wins the store search and the trust check.",
        basis: "observed",
        evidenceIds: [s.app.evidenceId],
      },
      {
        step: `Prompt happy users for an App Store rating (now ${s.app.ratingCount ?? 0})`,
        effort: "S",
        impact: "medium",
        owner: "seo",
      },
    );
  const noMeta = P.filter((x) => !x.metaDescription);
  if (n >= 3 && noMeta.length / n >= 0.2)
    add(
      {
        id: "meta-missing",
        title: `Missing meta description on ${noMeta.length}/${n} sampled pages`,
        detail: `e.g. ${noMeta
          .slice(0, 3)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}.`,
        severity: "low",
        opening: "Engines write their own snippet; a clear one wins clicks.",
        basis: "observed",
        evidenceIds: pageIds(noMeta),
      },
      {
        step: `Write meta descriptions for ${noMeta.length} pages (${pathOf(noMeta[0]?.url ?? "/")} first)`,
        effort: "S",
        impact: "low",
        owner: "seo",
      },
    );
  const noCanon = P.filter((x) => !x.canonical);
  if (n >= 3 && noCanon.length / n >= 0.3)
    add(
      {
        id: "canonical-missing",
        title: `No canonical tag on ${noCanon.length}/${n} sampled pages`,
        detail: `e.g. ${noCanon
          .slice(0, 3)
          .map((x) => pathOf(x.url))
          .filter(uniq)
          .join(", ")}.`,
        severity: "low",
        opening: "Duplicate URLs split signals.",
        basis: "observed",
        evidenceIds: pageIds(noCanon),
      },
      { step: "Add self-referencing canonical tags on every template", effort: "S", impact: "low", owner: "dev" },
    );
  if ((t.medianHtmlKb ?? 0) > 400)
    add(
      {
        id: "heavy",
        title: `Heavy HTML: median ${t.medianHtmlKb} KB per sampled page`,
        detail: "Raw HTML only (scripts and images not counted).",
        severity: "low",
        opening: "Lighter pages crawl and render faster.",
        basis: "observed",
        evidenceIds: pageIds(),
      },
      {
        step: `Cut inline payload below 200 KB (now ${t.medianHtmlKb} KB median)`,
        effort: "M",
        impact: "low",
        owner: "dev",
      },
    );
  if (!t.sitemapUrls && n)
    add(
      {
        id: "no-sitemap",
        title: "No sitemap found (robots.txt Sitemap: lines and /sitemap.xml)",
        detail: `${s.robots.sitemapLines} Sitemap line(s) in robots.txt.`,
        severity: "medium",
        opening: `Ship a sitemap on day one; ${s.domain} has none, so its new pages are found slower.`,
        basis: "observed",
        evidenceIds: [s.robots.evidenceId, s.sitemap.evidenceId],
      },
      { step: "Publish /sitemap.xml and list it in robots.txt", effort: "S", impact: "medium", owner: "dev" },
    );
  const o = p.offPage;
  if (o.trancoRank === null && !o.wikipediaLinkingArticles)
    add(
      {
        id: "weak-offpage",
        title: `Weak public footprint: not in the Tranco top 1M; ${o.wikipediaLinkingArticles ?? "unknown"} Wikipedia links`,
        detail: `Brand SERP third-party domains: ${o.brandSerpThirdParty ?? "unknown"}.`,
        severity: "medium",
        opening: `Out-earn its mentions: ${s.domain} is outside the Tranco top 1M with ${o.wikipediaLinkingArticles ?? 0} Wikipedia links.`,
        basis: "observed",
        evidenceIds: o.evidenceIds,
      },
      {
        step: "Earn 5-10 mentions on the review and community sites in your niche",
        effort: "L",
        impact: "medium",
        owner: "seo",
      },
    );
  if (s.knownUrls > 0 && s.knownUrls < 30)
    add(
      {
        id: "small",
        title: `Small footprint: ${s.knownUrls} known URLs in ${s.clusters.length} cluster(s)`,
        detail: `Largest: ${s.clusters
          .slice(0, 3)
          .map((c) => `${c.key} (${c.urlCount})`)
          .join(", ")}.`,
        severity: "medium",
        opening: `Cover more queries than its ${s.knownUrls} URLs do, starting with its own head terms.`,
        basis: "observed",
        evidenceIds: [s.sitemap.evidenceId, s.crawlEvidenceId],
      },
      {
        step: `Add indexable pages for the topics already in the product: ${
          [...new Set(P.flatMap((x) => x.h2).filter((h) => h.length > 8 && h.length < 60))]
            .slice(0, 3)
            .map((h) => `"${h}"`)
            .join(", ") || "one per head term"
        }`,
        effort: "L",
        impact: "high",
        owner: "content",
      },
    );
  return out.toSorted((x, y) => SEV[y.weakness.severity] - SEV[x.weakness.severity]).slice(0, 12);
}
