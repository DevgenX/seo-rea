// Derives the ranked "Top 10 actions" from a dossier and renders the table.

import { issueId } from "../issues.js";
import type { Dossier, TopAction } from "../dossier.js";
import { cell, domainOf, ids, isDomainOrSub, median } from "../util.js";
import { SEARCH_CRAWLERS, schemaFrequency, titleHasKeyword } from "./claims.js";

export type DossierFindings = Omit<Dossier, "topActions">;
type Candidate = Omit<TopAction, "rank">;

const IMPACT = { high: 3, medium: 2, low: 1 } as const;
const EFFORT = { S: 0, M: 1, L: 2 } as const;
const MAX_ACTIONS = 10;
const RICH_TYPES = ["FAQPage", "HowTo"];

/** Higher first: impact counts double, effort subtracts. */
export function actionScore(a: Pick<TopAction, "impact" | "effort">): number {
  return IMPACT[a.impact] * 2 - EFFORT[a.effort];
}

const code = (s: string): string => `\u0060${s}\u0060`;
const uniq = (list: string[]): string[] => [...new Set(list.filter(Boolean))];

function siteActions(d: DossierFindings, add: (c: Candidate) => void): void {
  const t = d.target;
  const tIds = t.evidenceIds;
  const home = t.pages[0];
  if (!t.fetched)
    add({
      id: "TECH-UNREACHABLE",
      title: `Make ${t.domain} reachable to crawlers`,
      why: `The page could not be fetched: ${t.error || "unknown error"}.`,
      evidenceIds: tIds,
      effort: "S",
      impact: "high",
      owner: "dev",
    });
  if (t.robots.blocksRoot)
    add({
      id: "TECH-ROBOTS-BLOCKS-ALL",
      title: "Remove the site-wide Disallow: / from robots.txt",
      why: "robots.txt blocks every crawler from the whole site.",
      evidenceIds: [t.robots.evidenceId],
      effort: "S",
      impact: "high",
      owner: "dev",
    });
  const ai = t.aiReadiness;
  const blocked = ai.crawlers.filter((c) => c.access === "blocked" && SEARCH_CRAWLERS.has(c.token));
  if (blocked.length)
    add({
      id: "AEO-AI-CRAWLER-BLOCKED",
      title: `Allow ${blocked.map((c) => c.token).join(", ")} in robots.txt`,
      why: "These bots fetch pages for AI search answers; blocking them keeps the site out of those answers.",
      evidenceIds: [t.robots.evidenceId, ...ai.evidenceIds],
      effort: "S",
      impact: "high",
      owner: "dev",
    });
  if (home && home.wordCount < 150)
    add({
      id: "TECH-THIN-RAW-HTML",
      title: "Serve the main copy in the initial HTML (server-side render or prerender)",
      why: `Only ${home.wordCount} words in raw HTML; most AI crawlers do not run JavaScript.`,
      evidenceIds: tIds,
      effort: "M",
      impact: "high",
      owner: "dev",
    });
  const sv = t.schemaValidation;
  if (t.fetched && !sv.blocks)
    add({
      id: "SCHEMA-MISSING",
      title: "Add JSON-LD: Organization plus the type that matches the page (SoftwareApplication, Article, Product)",
      why: "No structured data was found on the target.",
      evidenceIds: sv.evidenceIds,
      effort: "S",
      impact: "medium",
      owner: "dev",
    });
  const bad = sv.checks.filter((c) => !c.valid);
  if (bad.length || sv.parseErrors.length)
    add({
      id: "SCHEMA-INVALID",
      title: `Fix JSON-LD errors: ${uniq([
        ...bad.map((c) => `${c.type}: ${c.errors[0] ?? "invalid"}`),
        ...sv.parseErrors,
      ])
        .slice(0, 3)
        .join("; ")}`,
      why: "Invalid structured data is ignored for rich results.",
      evidenceIds: sv.evidenceIds,
      effort: "S",
      impact: "medium",
      owner: "dev",
    });
  if (!ai.llmsTxt.present)
    add({
      id: "AEO-LLMS-TXT-MISSING",
      title: "Publish /llms.txt (title, one-line summary, sections of key page links)",
      why: "No llms.txt was found; it gives AI tools a short map of the site (llmstxt.org).",
      evidenceIds: ai.evidenceIds.slice(0, 1),
      effort: "S",
      impact: "medium",
      owner: "dev",
    });
  else if (!ai.llmsTxt.valid)
    add({
      id: "AEO-LLMS-TXT-INVALID",
      title: `Fix /llms.txt: ${ai.llmsTxt.errors.slice(0, 2).join("; ")}`,
      why: "The file exists but does not follow the llmstxt.org format.",
      evidenceIds: ai.evidenceIds.slice(0, 1),
      effort: "S",
      impact: "low",
      owner: "dev",
    });
  if (t.fetched && !t.sitemap.urlCount)
    add({
      id: "TECH-SITEMAP-MISSING",
      title: "Publish /sitemap.xml and reference it in robots.txt",
      why: "No sitemap was found.",
      evidenceIds: [t.robots.evidenceId, t.sitemap.evidenceId],
      effort: "S",
      impact: "medium",
      owner: "dev",
    });
  for (const p of t.performance.filter((x) => x.ok)) {
    const perf = p.scores.performance;
    const lab = Object.entries(p.lab)
      .slice(0, 3)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    if (perf !== undefined && perf !== null && perf < 90)
      add({
        id: issueId("PERF-SCORE-LOW", p.strategy),
        title: `Improve ${p.strategy} page speed (PageSpeed performance ${perf})`,
        why: `Lab metrics: ${lab || "n/a"}. Slow pages lose rankings and users.`,
        evidenceIds: [p.evidenceId],
        effort: perf < 50 ? "L" : "M",
        impact: perf < 50 ? "medium" : "low",
        owner: "dev",
      });
    const seo = p.scores.seo;
    if (seo !== undefined && seo !== null && seo < 90)
      add({
        id: issueId("PERF-SEO-SCORE-LOW", p.strategy),
        title: `Fix the PageSpeed SEO audit items (${p.strategy} SEO score ${seo})`,
        why: "Lighthouse SEO checks flag basics such as meta tags, link text and crawlability.",
        evidenceIds: [p.evidenceId],
        effort: "S",
        impact: "medium",
        owner: "seo",
      });
    break;
  }
  if (home && !home.metaDescription)
    add({
      id: "ONPAGE-META-DESCRIPTION-MISSING",
      title: "Add a meta description (about 150 characters) that says what the page offers",
      why: "The target page has no meta description.",
      evidenceIds: tIds,
      effort: "S",
      impact: "low",
      owner: "seo",
    });
}

function competitorActions(d: DossierFindings, add: (c: Candidate) => void): void {
  const t = d.target;
  const home = t.pages[0];
  const kw = d.inputs.keyword;
  const comps = d.competitors.filter((c) => c.analysed);
  const both = uniq([...comps.map((c) => c.evidenceId), ...t.evidenceIds]);
  if (comps.length && home) {
    const med = median(comps.map((c) => c.wordCount));
    if (med && home.wordCount < med / 2)
      add({
        id: "CONTENT-DEPTH-GAP",
        title: kw
          ? `Publish a dedicated page for "${kw}" (about ${med} words, guide or comparison format)`
          : `Expand the main page copy towards ${med} words`,
        why: `Ranking pages median ${med} words vs ${home.wordCount} on the target page.`,
        evidenceIds: both,
        effort: "L",
        impact: "high",
        owner: "content",
      });
  }
  if (kw && home && !titleHasKeyword(home.title, kw)) {
    const inTitle = comps.filter((c) => titleHasKeyword(c.title, kw)).length;
    add({
      id: "ONPAGE-TITLE-KEYWORD-MISSING",
      title: `Put "${kw}" (or close wording) in the title and H1 of the page meant to rank`,
      why: `The target title "${home.title || "(none)"}" lacks the keyword terms${comps.length ? `; ${inTitle}/${comps.length} ranking pages have them` : ""}.`,
      evidenceIds: both,
      effort: "S",
      impact: "high",
      owner: "seo",
    });
  }
  const freq = schemaFrequency(comps.map((c) => ({ page: { schemaTypes: c.schema.types } })));
  for (const type of RICH_TYPES) {
    const n = comps.filter((c) => c.schema.types.includes(type)).length;
    if (n && !t.schemaValidation.types.includes(type))
      add({
        id: issueId("SCHEMA-RICH-TYPE-MISSING", type),
        title: `Add a ${type === "FAQPage" ? "FAQ section with FAQPage" : "step-by-step section with HowTo"} JSON-LD`,
        why: `${n}/${comps.length} ranking pages use ${type}; the target has none. Answer-style blocks are easy for AI answers to quote.`,
        evidenceIds: comps.filter((c) => c.schema.types.includes(type)).map((c) => c.evidenceId),
        effort: "M",
        impact: n >= 2 ? "medium" : "low",
        owner: "content",
      });
  }
  const missing = freq.filter(
    (f) =>
      !RICH_TYPES.includes(f.type) &&
      f.count >= Math.max(2, Math.ceil(comps.length / 3)) &&
      !t.schemaValidation.types.includes(f.type),
  );
  if (missing.length)
    add({
      id: "SCHEMA-COMPETITOR-TYPES-MISSING",
      title: `Add JSON-LD types ranking pages share: ${missing
        .slice(0, 4)
        .map((m) => m.type)
        .join(", ")}`,
      why: "Structured data common among the winners and missing on the target.",
      evidenceIds: both,
      effort: "S",
      impact: "medium",
      owner: "seo",
    });
  if (d.keywordGap.length)
    add({
      id: "CONTENT-KEYWORD-GAP",
      title: `Cover competitor phrases in headings and copy: ${d.keywordGap
        .slice(0, 8)
        .map((k) => k.phrase)
        .join(", ")}`,
      why: "Used by two or more ranking pages and missing from the crawled target pages.",
      evidenceIds: both,
      effort: "M",
      impact: "medium",
      owner: "content",
    });
  const ownAd = (domain: string): boolean => Boolean(domain) && isDomainOrSub(domain, t.domain);
  const serpAds = d.serp.ads.filter((a) => !ownAd(domainOf(a.url)));
  const libAds = d.ads.filter((a) => a.status === "captured" && (a.visibleCount ?? 0) > 0 && !ownAd(a.domain));
  if (serpAds.length || libAds.length)
    add({
      id: "PAID-COMPETITOR-ADS",
      title: "Review competitor ads (hooks, offers, landing pages) for messaging to reuse in copy",
      why: `${serpAds.length} search ad(s) on the SERP and ${libAds.length} ad-library listing(s) with visible ads.`,
      evidenceIds: uniq([
        ...d.serp.engines.filter((e) => e.adCount).map((e) => e.evidenceId),
        ...libAds.flatMap((a) => a.evidenceIds),
      ]),
      effort: "S",
      impact: "low",
      owner: "seo",
    });
  if (d.citations.length && !d.citations.some((c) => c.targetCited))
    add({
      id: "AEO-NOT-CITED",
      title: "Write a citable comparison page aimed at the sources AI answers cite",
      why: `The target was not cited in any of ${d.citations.length} recorded AI answer(s).`,
      evidenceIds: d.citations.map((c) => c.evidenceId),
      effort: "M",
      impact: "medium",
      owner: "content",
    });
}

/** Up to 10 actions ranked by impact and effort; ties keep rule order. */
export function deriveTopActions(d: DossierFindings): TopAction[] {
  const found: Candidate[] = [];
  const add = (c: Candidate): void => {
    found.push({ ...c, evidenceIds: uniq(c.evidenceIds) });
  };
  siteActions(d, add);
  competitorActions(d, add);
  return found
    .map((c, i) => ({ c, i }))
    .toSorted((a, b) => actionScore(b.c) - actionScore(a.c) || a.i - b.i)
    .slice(0, MAX_ACTIONS)
    .map(({ c }, i) => ({ rank: i + 1, ...c }));
}

export function renderTopActions(actions: TopAction[]): string[] {
  const L = ["## Top 10 actions", ""];
  if (!actions.length) return [...L, "No actions derived from these checks.", ""];
  L.push("| # | ID | Action | Why | Impact | Effort | Owner | Evidence |", "|---|---|---|---|---|---|---|---|");
  for (const a of actions)
    L.push(
      `| ${a.rank} | ${code(a.id)} | ${cell(a.title)} | ${cell(a.why)} | ${a.impact} | ${a.effort} | ${a.owner} | ${ids(a.evidenceIds) || "-"} |`,
    );
  L.push("", "Ranked by impact, then effort. Full data: [dossier.json](dossier.json).", "");
  return L;
}
