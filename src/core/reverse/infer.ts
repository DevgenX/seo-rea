// Infer a site's SEO / AEO strategy from its crawl plus free signals.
// Pure: every input is passed in, so it is tested offline.

import type { CrawlerCheck, LlmsTxtReport } from "../../adapters/ai-readiness.js";
import { analyzeCrawl, buildGraph, isIndexable } from "../crawl/analyze.js";
import type { CrawlReport } from "../crawl/schema.js";
import type { ReverseFinding, ReverseReport, Template } from "./schema.js";
import {
  QUESTION,
  avg,
  cadence,
  detectProgrammatic,
  groupBy,
  headTerms,
  pathOf,
  round,
  segs,
  templateOf,
  topBy,
} from "./signals.js";

export { detectProgrammatic, headTerms, stripSiteName, templateOf, tokens } from "./signals.js";

export interface ReverseInput {
  crawl: CrawlReport;
  crawlReportPath: string;
  ai: { crawlers: CrawlerCheck[]; llmsTxt: LlmsTxtReport; llmsFullTxt: LlmsTxtReport } | null;
  offpage: {
    trancoRank: number | null;
    wikipediaLinkingPages: number | null;
    wikipediaMentions: number | null;
    commonCrawlPages: number | null;
  } | null;
  evidence: { crawl: string; robots?: string; llms?: string[]; offpage?: string };
  now: Date;
  /** Brand words left out of keyword terms (domain name parts). */
  brandTokens: string[];
}

export function inferStrategy(
  input: ReverseInput,
): Omit<ReverseReport, "timestamps" | "toolVersion" | "runId" | "evidenceIndex"> {
  const { crawl, evidence: ev } = input;
  const brand = new Set(input.brandTokens.map((t) => t.toLowerCase()));
  const all = crawl.pages;
  const pages = all.filter(isIndexable);
  const n = pages.length || 1;
  const E = [ev.crawl];
  const tpl = new Map(pages.map((p) => [p.url, templateOf(p, crawl.startUrl)]));
  const g = buildGraph(all, crawl.startUrl);
  const a = analyzeCrawl({ pages: all, startUrl: crawl.startUrl, sitemapUrls: [], blocked: [] });

  // Templates
  const byTpl = groupBy(pages, (p) => tpl.get(p.url) as string);
  const templates = topBy(byTpl, 20).map(([type, l]) => ({
    type: type as Template,
    pages: l.length,
    avgWords: Math.round(avg(l.map((p) => p.wordCount))),
    examples: l.slice(0, 3).map((p) => p.url),
  }));

  const programmatic = detectProgrammatic(pages);
  // Entity names on programmatic pages (merchants, cards) would swamp the
  // topic list, so target topics come from the hand-made pages.
  const inPattern = (u: string): boolean =>
    programmatic.some((p) => {
      const prefix = p.pattern.slice(0, -1);
      return pathOf(u).startsWith(prefix) && pathOf(u) !== prefix;
    });
  const editorial = pages.filter((p) => !inPattern(p.url));
  const keywords = headTerms(editorial.length >= 3 ? editorial : pages, brand);

  // Clusters by first path segment
  const byCluster = groupBy(pages, (p) => (segs(p.url)[0] ? `/${segs(p.url)[0]}` : "/"));
  const clusters = topBy(byCluster, 12).map(([key, l]) => {
    const tc = groupBy(l, (p) => tpl.get(p.url) as string);
    const types = new Map<string, number>();
    for (const p of l) for (const t of p.schemaTypes) types.set(t, (types.get(t) ?? 0) + 1);
    const hubPage = l.toSorted((x, y) => (g.pagerank.get(y.url) ?? 0) - (g.pagerank.get(x.url) ?? 0))[0];
    return {
      key,
      pages: l.length,
      share: round(l.length / n),
      template: (topBy(tc, 1)[0]?.[0] ?? "other") as Template,
      avgWords: Math.round(avg(l.map((p) => p.wordCount))),
      schemaTypes: [...types.entries()]
        .toSorted((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([t]) => t),
      topTerms: headTerms(
        l.filter((p) => !inPattern(p.url)),
        brand,
        5,
      ).map((k) => k.term),
      hub: l.length >= 3 && hubPage ? hubPage.url : null,
      examples: l.slice(0, 3).map((p) => p.url),
    };
  });

  // Linking
  const html = all.filter((p) => p.internalLinks.length || p.title);
  const linkFreq = new Map<string, number>();
  for (const p of html) for (const l of new Set(p.internalLinks)) linkFreq.set(l, (linkFreq.get(l) ?? 0) + 1);
  const globalLinks = [...linkFreq.entries()]
    .filter(([, c]) => html.length >= 5 && c >= html.length * 0.8)
    .toSorted((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([u]) => u)
    .slice(0, 30);
  const notHub = /\/(login|log-in|signin|sign-in|signup|sign-up|register|account|search|forgot|cart|checkout)\b/i;
  const hubs = [...g.pagerank.entries()]
    .filter(([u]) => u !== crawl.startUrl && tpl.get(u) !== "legal" && !notHub.test(pathOf(u)))
    .toSorted((x, y) => y[1] - x[1])
    .slice(0, 8)
    .map(([url, pr]) => ({ url, pagerank: round(pr, 5), inlinks: g.inlinks.get(url) ?? 0 }));
  const count = (rule: string): number => a.issues.filter((i) => i.rule === rule).length;
  const linking = {
    avgInternalLinks: round(avg(pages.map((p) => p.internalLinks.length)), 1),
    globalLinks,
    hubs,
    orphanPages: count("CRAWL-ORPHAN"),
    deepPages: count("CRAWL-DEEP-PAGE"),
    depthHistogram: a.graph.depthHistogram,
  };

  // Schema
  const schemaCount = new Map<string, number>();
  for (const p of pages) for (const t of new Set(p.schemaTypes)) schemaCount.set(t, (schemaCount.get(t) ?? 0) + 1);
  const schema = [...schemaCount.entries()]
    .toSorted((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 15)
    .map(([type, c]) => ({ type, pages: c, share: round(c / n) }));

  // Off-page and outbound
  const out = new Map<string, number>();
  for (const p of pages) for (const d of p.externalDomains) out.set(d, (out.get(d) ?? 0) + 1);
  const outboundDomains = [...out.entries()]
    .toSorted((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 12)
    .map(([domain, c]) => ({ domain, pages: c }));
  const offpage = {
    trancoRank: input.offpage?.trancoRank ?? null,
    wikipediaLinkingPages: input.offpage?.wikipediaLinkingPages ?? null,
    wikipediaMentions: input.offpage?.wikipediaMentions ?? null,
    commonCrawlPages: input.offpage?.commonCrawlPages ?? null,
    outboundDomains,
    evidenceIds: [ev.offpage, ev.crawl].filter((x): x is string => Boolean(x)),
  };

  // AEO
  const has = (t: string): number => pages.filter((p) => p.schemaTypes.includes(t)).length;
  const aeo = {
    llmsTxt: {
      present: input.ai?.llmsTxt.present ?? false,
      valid: input.ai?.llmsTxt.valid ?? false,
      links: input.ai?.llmsTxt.links.length ?? 0,
    },
    llmsFullTxt: input.ai?.llmsFullTxt.present ?? false,
    aiCrawlers: (input.ai?.crawlers ?? []).map((c) => ({ token: c.token, operator: c.operator, access: c.access })),
    faqPages: has("FAQPage"),
    howToPages: has("HowTo"),
    questionTitles: pages.filter((p) => QUESTION.test(p.title) || p.h1.some((h) => QUESTION.test(h))).length,
    rawHtmlReadableShare: round(pages.filter((p) => p.wordCount >= 200).length / n),
    evidenceIds: [ev.robots, ...(ev.llms ?? []), ev.crawl].filter((x): x is string => Boolean(x)),
  };

  const cad = cadence(pages, input.now);
  const techCount = new Map<string, number>();
  for (const p of pages) for (const t of p.tech) techCount.set(t, (techCount.get(t) ?? 0) + 1);
  const tech = [...techCount.entries()]
    .toSorted((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 12)
    .map(([name, c]) => ({ name, pages: c }));

  // Summary claims
  const summary: ReverseFinding[] = [];
  const topCluster = clusters.find((c) => c.key !== "/");
  if (topCluster)
    summary.push({
      claim: `Content is concentrated in ${topCluster.key} (${topCluster.pages} of ${pages.length} indexable pages, mostly ${topCluster.template} pages)${topCluster.topTerms.length ? ` around "${topCluster.topTerms.slice(0, 3).join('", "')}"` : ""}.`,
      basis: "observed",
      confidence: crawl.stats.complete ? "high" : "medium",
      evidenceIds: E,
      examples: topCluster.examples,
    });
  if (keywords.length)
    summary.push({
      claim: `Likely target topics (repeated across titles, H1s and URLs): ${keywords
        .slice(0, 6)
        .map((k) => `"${k.term}"`)
        .join(", ")}.`,
      basis: "inferred",
      confidence: "medium",
      evidenceIds: E,
      examples: keywords[0]?.examples ?? [],
    });
  const tplLine = templates.filter((t) => t.type !== "other" && t.type !== "home" && t.type !== "legal").slice(0, 4);
  if (tplLine.length)
    summary.push({
      claim: `Page types that carry the site: ${tplLine.map((t) => `${t.type} (${t.pages})`).join(", ")}.`,
      basis: "inferred",
      confidence: "medium",
      evidenceIds: E,
      examples: tplLine.flatMap((t) => t.examples.slice(0, 1)),
    });
  if (programmatic.length)
    summary.push({
      claim: `Programmatic SEO: ${programmatic.map((p) => `${p.pattern} (${p.pages} pages, titles "${p.titlePattern}")`).join("; ")}.`,
      basis: "inferred",
      confidence: "medium",
      evidenceIds: E,
      examples: programmatic[0]?.examples ?? [],
    });
  summary.push({
    claim: `Internal linking: ${globalLinks.length} links repeat on most pages (nav/footer); average ${linking.avgInternalLinks} internal links per page; strongest internal hubs: ${
      hubs
        .slice(0, 3)
        .map((h) => pathOf(h.url))
        .join(", ") || "none"
    }.`,
    basis: "observed",
    confidence: "high",
    evidenceIds: E,
    examples: hubs.slice(0, 3).map((h) => h.url),
  });
  if (schema.length)
    summary.push({
      claim: `Structured data: ${schema
        .slice(0, 5)
        .map((s) => `${s.type} on ${Math.round(s.share * 100)}%`)
        .join(", ")} of indexable pages.`,
      basis: "observed",
      confidence: "high",
      evidenceIds: E,
      examples: [],
    });
  const blocked = aeo.aiCrawlers.filter((c) => c.access === "blocked").map((c) => c.token);
  summary.push({
    claim: `AEO: llms.txt ${aeo.llmsTxt.present ? (aeo.llmsTxt.valid ? `present and valid (${aeo.llmsTxt.links} links)` : "present but invalid") : "absent"}; AI crawlers blocked: ${blocked.join(", ") || "none"}; FAQPage on ${aeo.faqPages} page(s); ${aeo.questionTitles} question-style titles; ${Math.round(aeo.rawHtmlReadableShare * 100)}% of pages readable without JavaScript.`,
    basis: "observed",
    confidence: input.ai ? "high" : "low",
    evidenceIds: aeo.evidenceIds,
    examples: [],
  });
  if (cad.datedPages)
    summary.push({
      claim: `Publishing cadence: ${cad.last90Days} dated page(s) in the last 90 days, ${cad.last365Days} in the last year (median gap ${cad.medianGapDays ?? "n/a"} days; ${cad.updatedLast90Days} updated in 90 days).`,
      basis: "observed",
      confidence: cad.datedPages >= 10 ? "medium" : "low",
      evidenceIds: E,
      examples: [],
    });
  if (tech.length)
    summary.push({
      claim: `Stack fingerprints: ${tech
        .slice(0, 5)
        .map((t) => t.name)
        .join(", ")}.`,
      basis: "observed",
      confidence: "medium",
      evidenceIds: E,
      examples: [],
    });
  if (offpage.trancoRank !== null || offpage.wikipediaLinkingPages !== null)
    summary.push({
      claim: `Authority signals (free): Tranco rank ${offpage.trancoRank ?? "not listed"}; ${offpage.wikipediaLinkingPages ?? "unknown"} Wikipedia article(s) link to it; ${offpage.commonCrawlPages ?? "unknown"} Common Crawl index page(s).`,
      basis: "observed",
      confidence: "medium",
      evidenceIds: offpage.evidenceIds,
      examples: [],
    });

  // Playbook: what to copy
  const playbook: ReverseReport["playbook"] = [];
  const add = (
    step: string,
    why: string,
    effort: "S" | "M" | "L",
    impact: "high" | "medium" | "low",
    ids = E,
  ): void => {
    playbook.push({ step, why, effort, impact, evidenceIds: ids });
  };
  if (topCluster && topCluster.pages >= 5)
    add(
      `Build a ${topCluster.key} cluster of ${topCluster.template} pages`,
      `${topCluster.pages} pages (${Math.round(topCluster.share * 100)}% of the site) sit there${topCluster.hub ? `, linked from the hub ${pathOf(topCluster.hub)}` : ""}.`,
      "L",
      "high",
    );
  const comp = byTpl.get("comparison") ?? [];
  if (comp.length >= 2)
    add(
      "Publish comparison / alternatives pages",
      `${comp.length} comparison pages, e.g. ${pathOf(comp[0]?.url ?? "")}.`,
      "M",
      "high",
    );
  const tools = byTpl.get("tool") ?? [];
  if (tools.length)
    add(
      "Ship free tools or calculators",
      `${tools.length} tool page(s), e.g. ${pathOf(tools[0]?.url ?? "")}; tools earn links and match "calculator" queries.`,
      "M",
      "medium",
    );
  for (const p of programmatic.slice(0, 2))
    add(
      `Template pages like ${p.pattern}`,
      p.titlePattern.startsWith("(")
        ? `${p.pages} pages share one layout.`
        : `${p.pages} pages share the title pattern "${p.titlePattern}".`,
      "L",
      "high",
    );
  if (aeo.faqPages >= 2)
    add("Add FAQ sections with FAQPage JSON-LD", `${aeo.faqPages} pages use FAQPage.`, "S", "medium", aeo.evidenceIds);
  if (aeo.llmsTxt.present)
    add("Publish /llms.txt", `They publish one with ${aeo.llmsTxt.links} links.`, "S", "low", aeo.evidenceIds);
  if (cad.last90Days >= 3)
    add(
      `Publish about ${Math.max(1, Math.round(cad.last90Days / 3))} dated pages a month`,
      `${cad.last90Days} dated pages in the last 90 days.`,
      "M",
      "medium",
    );
  if (hubs[0])
    add(
      "Create hub pages linked from the global navigation",
      `${pathOf(hubs[0].url)} has ${hubs[0].inlinks} internal inlinks and the highest internal PageRank after the home page.`,
      "S",
      "medium",
    );
  for (const s of schema.filter((x) => x.share >= 0.3).slice(0, 2))
    add(`Mark up pages with ${s.type}`, `${Math.round(s.share * 100)}% of their pages carry it.`, "S", "low");

  const unknowns = [
    "Rankings and traffic: not measured (free mode does not query SERPs per page).",
    "Backlinks: only free proxies (Tranco, Wikipedia, Common Crawl, outbound links); no link index.",
    "JavaScript-rendered content is not seen; counts reflect raw HTML, like most AI crawlers.",
  ];
  if (!crawl.stats.complete)
    unknowns.push(
      `Crawl stopped at ${crawl.stats.pagesCrawled} pages with ${crawl.stats.queuedLeft} still queued; raise --max-pages for full coverage.`,
    );
  if (!cad.datedPages) unknowns.push("No publish dates found in page metadata; cadence unknown.");

  return {
    schemaVersion: "1",
    tool: "seo-rea",
    kind: "reverse",
    domain: crawl.domain,
    cost: { usd: 0, paidCalls: 0 },
    coverage: {
      pagesCrawled: crawl.stats.pagesCrawled,
      indexablePages: pages.length,
      crawlComplete: crawl.stats.complete,
      crawlReport: input.crawlReportPath,
    },
    summary,
    keywords,
    clusters,
    templates,
    programmatic,
    linking,
    offpage,
    schema,
    aeo,
    cadence: cad,
    tech,
    playbook,
    unknowns,
  };
}
