// Turns a teardown run into finding-ledger claims and a playbook.

import type { AiReadinessSummary, CompetitorCard, TeardownRun } from "../run.js";
import type { Claim } from "../types.js";
import { isDomainOrSub, median } from "../util.js";

export interface PlaybookItem {
  action: string;
  why: string;
  evidence: string[];
}

export function titleHasKeyword(title: string, keyword: string): boolean {
  const t = String(title ?? "").toLowerCase();
  return String(keyword)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => t.includes(w.replace(/s$/, "")));
}

export const INTENT_RE = /\b(best|top|\d+\s+(?:best|top)?|review|reviews|vs|compare|comparison|20\d\d)\b/i;

export function analysed(run: TeardownRun): Array<CompetitorCard & { page: NonNullable<CompetitorCard["page"]> }> {
  return run.competitors.filter((c): c is CompetitorCard & { page: NonNullable<CompetitorCard["page"]> } =>
    Boolean(c.page),
  );
}

/** Helper types that appear inside other entities; not worth recommending on their own. */
const HELPER_TYPES = new Set([
  "ImageObject",
  "ListItem",
  "Person",
  "Rating",
  "AggregateRating",
  "Offer",
  "AggregateOffer",
  "Answer",
  "Question",
  "SpeakableSpecification",
  "EntryPoint",
  "SearchAction",
  "PostalAddress",
  "ContactPoint",
  "WebPage",
  "WebSite",
]);

export function schemaFrequency(
  comps: Array<{ page: { schemaTypes: string[] } }>,
): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of comps) {
    for (const t of c.page.schemaTypes) if (!HELPER_TYPES.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .toSorted((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export function serpBoundary(run: TeardownRun): string {
  const used = run.serp.attempts.filter((e) => e.organicCount > 0).map((e) => e.label);
  return `top ${run.serp.organic.length} organic results from ${run.serp.primaryLabel || used.join(" + ") || "no engine"} (en-US, logged out) on ${run.createdAt.slice(0, 10)}`;
}

type Add = (c: Partial<Claim> & Pick<Claim, "claim" | "evidence" | "type" | "boundary">) => void;

function serpClaims(run: TeardownRun, add: Add): void {
  const serpIds = run.serp.attempts.map((e) => e.evidenceId);
  const boundary = serpBoundary(run);
  for (const e of run.serp.attempts.filter((x) => x.problem)) {
    add({
      claim: `${e.label} was not used: ${e.problem}`,
      evidence: [e.evidenceId],
      type: "observed",
      confidence: "high",
      boundary: "single request",
      unknowns: `${e.label} rankings not observed`,
    });
  }
  if (!run.serp.organic.length) {
    add({
      claim: "No SERP results were collected",
      evidence: serpIds,
      type: "observed",
      confidence: "high",
      boundary: "all configured engines",
      unknowns: "Who ranks for the keyword",
    });
    return;
  }
  add({
    claim: `Top results: ${run.serp.organic
      .slice(0, 5)
      .map((r) => `#${r.position} ${r.domain}`)
      .join(", ")}`,
    evidence: serpIds,
    type: "observed",
    confidence: "high",
    boundary,
  });
  const hit = run.serp.organic.find((r) => isDomainOrSub(r.domain, run.target.domain));
  add({
    claim: hit
      ? `${run.target.domain} ranks #${hit.position}`
      : `${run.target.domain} does not appear in the observed results`,
    evidence: serpIds,
    type: "observed",
    confidence: run.serp.primary === "serp-urls" ? "medium" : "high",
    boundary,
    unknowns: "Personalised and other-location results not observed",
  });
  // Operator URL lists carry no titles, so fall back to the fetched page title.
  const titles = run.serp.organic
    .map((r) => r.title || run.competitors.find((c) => c.url === r.url)?.page?.title || "")
    .filter(Boolean);
  const titled = titles;
  const intent = titled.filter((t) => INTENT_RE.test(t)).length;
  if (titled.length && intent >= Math.ceil(titled.length / 2)) {
    add({
      claim: `Search intent is comparison/roundup: ${intent}/${titled.length} titles use "best", "top", a year or review wording`,
      evidence: [...serpIds, ...analysed(run).map((c) => c.evidenceId)],
      type: "inferred",
      boundary,
    });
  }
}

function pageClaims(run: TeardownRun, add: Add): void {
  const comps = analysed(run);
  const compIds = comps.map((c) => c.evidenceId);
  const tHome = run.target.pages[0];
  const tIds = [run.target.homeEvidenceId, run.target.crawlEvidenceId];
  if (comps.length) {
    const wc = comps.map((c) => c.page.wordCount);
    const both = [...compIds, ...tIds];
    const n = `${comps.length} fetched ranking pages`;
    add({
      claim: `Ranking pages median ${median(wc)} words (range ${Math.min(...wc)}-${Math.max(...wc)}); ${run.target.domain} homepage ${tHome?.wordCount ?? "n/a"} words`,
      evidence: both,
      type: "observed",
      confidence: "high",
      boundary: `${n}, raw HTML without JavaScript`,
    });
    const inTitle = comps.filter((c) => titleHasKeyword(c.page.title, run.keyword)).length;
    add({
      claim: `${inTitle}/${comps.length} ranking pages contain every keyword term in <title>; target homepage: ${tHome && titleHasKeyword(tHome.title, run.keyword) ? "yes" : "no"}`,
      evidence: both,
      type: "observed",
      confidence: "high",
      boundary: n,
    });
    add({
      claim: `Ranking pages median ${median(comps.map((c) => c.page.headings.h2.length))} H2 headings; target homepage ${tHome?.headings.h2.length ?? "n/a"}`,
      evidence: both,
      type: "observed",
      confidence: "high",
      boundary: n,
    });
    const types = schemaFrequency(comps);
    if (types.length) {
      add({
        claim: `Common schema types among ranking pages: ${types
          .slice(0, 6)
          .map((t) => `${t.type} (${t.count}/${comps.length})`)
          .join(", ")}; target: ${run.target.schemaTypes.join(", ") || "none"}`,
        evidence: both,
        type: "observed",
        confidence: "high",
        boundary: `JSON-LD on ${comps.length} ranking pages and ${run.target.pages.length} target pages`,
      });
    }
    add({
      claim: `Ranking pages median ${median(comps.map((c) => c.page.internalLinkCount))} internal links per page; target homepage ${tHome?.internalLinkCount ?? "n/a"}`,
      evidence: both,
      type: "observed",
      confidence: "high",
      boundary: "links in raw HTML",
    });
    const m = median(wc) ?? 0;
    if (tHome && tHome.wordCount < 150 && m > 500) {
      add({
        claim: `${run.target.domain} serves little text in raw HTML; crawlers that do not run JavaScript may see a thin page`,
        evidence: tIds,
        type: "inferred",
        boundary: "target homepage raw HTML",
        unknowns: "Rendered DOM not checked",
      });
    }
  }
  for (const c of run.competitors.filter((x) => !x.page)) {
    add({
      claim: `Could not analyse ${c.url}: ${c.error}`,
      evidence: [c.evidenceId],
      type: "observed",
      confidence: "high",
      boundary: "single request",
      unknowns: `On-page facts for ${c.domain}`,
    });
  }
  const invalid = [
    ...comps.map((c) => ({ id: c.evidenceId, page: c.page })),
    ...run.target.pages.map((p) => ({ id: run.target.crawlEvidenceId, page: p })),
  ].filter((x) => x.page.schema.nodes.some((n) => !n.valid) || x.page.schema.parseErrors.length);
  if (invalid.length) {
    add({
      claim: `${invalid.length} page(s) carry JSON-LD with missing required properties or parse errors`,
      evidence: invalid.map((x) => x.id),
      type: "observed",
      confidence: "high",
      boundary:
        "required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo, LocalBusiness",
    });
  }
}

export function aiClaims(ai: AiReadinessSummary, domain: string, robotsEvidenceId: string, add: Add): void {
  const blocked = ai.crawlers.filter((c) => c.access === "blocked");
  add({
    claim: blocked.length
      ? `${domain} robots.txt blocks ${blocked.map((c) => c.token).join(", ")} at /`
      : `${domain} robots.txt lets all ${ai.crawlers.length} checked AI crawlers fetch /`,
    evidence: [robotsEvidenceId, ai.crawlerEvidenceId],
    type: "observed",
    confidence: "high",
    boundary: "robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall",
    unknowns: "Server or CDN bot blocking not tested",
  });
  const l = ai.llmsTxt;
  add({
    claim: l.present
      ? `${domain}/llms.txt ${l.valid ? "follows" : "does not follow"} the llmstxt.org format (${l.sections.length} sections, ${l.linkCount} links${l.errors.length ? `; ${l.errors.join("; ")}` : ""})`
      : `${domain} has no /llms.txt (${l.errors[0] ?? "not found"})`,
    evidence: ai.llmsEvidenceIds.slice(0, 1),
    type: "observed",
    confidence: "high",
    boundary: "single fetch of /llms.txt",
  });
  add({
    claim: ai.llmsFullTxt.present
      ? `${domain}/llms-full.txt present (${ai.llmsFullTxt.bytes} bytes)`
      : `${domain} has no /llms-full.txt`,
    evidence: ai.llmsEvidenceIds.slice(1, 2),
    type: "observed",
    confidence: "high",
    boundary: "single fetch of /llms-full.txt",
  });
  for (const p of ai.perf.filter((x) => x.ok)) {
    add({
      claim: `${p.source === "psi" ? "PageSpeed Insights" : "Lighthouse"} (${p.strategy}) scores ${domain}: performance ${p.scores.performance ?? "?"}, SEO ${p.scores.seo ?? "?"}, accessibility ${p.scores.accessibility ?? "?"}`,
      evidence: [p.evidenceId],
      type: "observed",
      confidence: "medium",
      boundary: "one lab run; scores vary between runs",
      unknowns: Object.keys(p.field).length ? "" : "No field (CrUX) data for this URL",
    });
  }
}

function siteAdsCiteClaims(run: TeardownRun, add: Add): void {
  const sm = run.target.sitemap;
  add({
    claim: sm.urlCount
      ? `${run.target.domain} sitemap lists ${sm.urlCount} URLs`
      : `No sitemap found for ${run.target.domain}`,
    evidence: [run.target.robotsEvidenceId, sm.evidenceId],
    type: "observed",
    confidence: "high",
    boundary: "robots.txt Sitemap lines and /sitemap.xml",
  });
  if (run.target.robotsBlocksRoot)
    add({
      claim: `${run.target.domain} robots.txt disallows / for all agents`,
      evidence: [run.target.robotsEvidenceId],
      type: "observed",
      confidence: "high",
      boundary: "robots.txt",
    });
  const serpIds = run.serp.attempts.map((e) => e.evidenceId);
  add({
    claim: `${run.serp.ads.length} search ads observed on the collected SERPs`,
    evidence: serpIds,
    type: "observed",
    confidence: "medium",
    boundary: serpBoundary(run),
    unknowns: "Ads shown to logged-in or other-location users",
  });
  const captured = run.ads.filter((a) => a.status === "captured");
  for (const a of captured) {
    add({
      claim: `${a.platform} shows ${a.visibleCount} result(s) for "${a.brand}"`,
      evidence: [a.evidenceId, a.screenshotEvidenceId ?? ""].filter(Boolean),
      type: "observed",
      confidence: "medium",
      boundary:
        a.platform === "Google Ads Transparency Center"
          ? "one logged-out page load; ads pointing to this domain"
          : "one logged-out page load; keyword search, so other advertisers using the word are included",
      unknowns: "Creatives, run dates, spend",
    });
  }
  const manual = run.ads.filter((a) => a.status !== "captured");
  if (manual.length)
    add({
      claim: `${manual.length} ad-library lookup(s) need a manual check`,
      evidence: manual.map((a) => a.evidenceId),
      type: "observed",
      confidence: "high",
      boundary: "lookup URLs (and screenshots where captured)",
      unknowns: "Ad counts, run dates, creatives",
    });
  const cites = run.citations;
  if (cites.length) {
    add({
      claim: `${run.target.domain} cited in ${cites.filter((c) => c.targetCited).length}/${cites.length} recorded AI answers`,
      evidence: cites.map((c) => c.evidenceId),
      type: "observed",
      confidence: "high",
      boundary: "answers recorded with `seo-rea cite`",
    });
  }
  add({
    claim: "Backlink profiles were not collected",
    evidence: [],
    type: "observed",
    confidence: "high",
    boundary: "free automated pipeline",
    unknowns: "Referring domains, link velocity",
  });
}

/** Build the finding ledger rows from run data. */
export function buildClaims(run: TeardownRun): Claim[] {
  const claims: Claim[] = [];
  const add: Add = (c) => claims.push({ confidence: "medium", unknowns: "", ...c });
  serpClaims(run, add);
  pageClaims(run, add);
  if (run.aiReadiness) aiClaims(run.aiReadiness, run.target.domain, run.target.robotsEvidenceId, add);
  siteAdsCiteClaims(run, add);
  return claims;
}

const SEARCH_CRAWLERS = new Set(["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot"]);

export function aiPlaybook(ai: AiReadinessSummary, domain: string, robotsId: string): PlaybookItem[] {
  const out: PlaybookItem[] = [];
  const blockedSearch = ai.crawlers.filter((c) => c.access === "blocked" && SEARCH_CRAWLERS.has(c.token));
  if (blockedSearch.length) {
    out.push({
      action: `Allow ${blockedSearch.map((c) => c.token).join(", ")} in robots.txt if you want to appear in AI search answers`,
      why: "These bots fetch pages for AI search results, not training.",
      evidence: [robotsId, ai.crawlerEvidenceId],
    });
  }
  if (!ai.llmsTxt.present) {
    out.push({
      action: `Publish /llms.txt on ${domain}: "# Name", a "> one-line summary", then "## Docs"/"## Product" sections of "- [Page](url): what it covers" links`,
      why: "No llms.txt was found; it gives AI tools a short map of the site (llmstxt.org).",
      evidence: ai.llmsEvidenceIds.slice(0, 1),
    });
  } else if (!ai.llmsTxt.valid || ai.llmsTxt.warnings.length) {
    out.push({
      action: `Fix /llms.txt: ${[...ai.llmsTxt.errors, ...ai.llmsTxt.warnings].slice(0, 3).join("; ")}`,
      why: "The file exists but does not fully follow the llmstxt.org format.",
      evidence: ai.llmsEvidenceIds.slice(0, 1),
    });
  }
  const perf = ai.perf.find((p) => p.ok && (p.scores.performance ?? 100) < 50);
  if (perf)
    out.push({
      action: `Improve mobile performance (score ${perf.scores.performance}; ${Object.entries(perf.lab)
        .slice(0, 3)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")})`,
      why: "Slow pages lose rankings and users.",
      evidence: [perf.evidenceId],
    });
  return out;
}

/** Prioritised actions for the target, each tied to evidence. Drafts only. */
export function buildPlaybook(run: TeardownRun): PlaybookItem[] {
  const actions: PlaybookItem[] = [];
  const comps = analysed(run);
  const compIds = comps.map((c) => c.evidenceId);
  const tHome = run.target.pages[0];
  const tIds = [run.target.homeEvidenceId, run.target.crawlEvidenceId];
  const both = [...compIds, ...tIds];
  const serpIds = run.serp.attempts.map((e) => e.evidenceId);
  const ranks = run.serp.organic.some((r) => isDomainOrSub(r.domain, run.target.domain));
  const roundup = run.serp.organic.filter(
    (r) => INTENT_RE.test(r.title) || INTENT_RE.test(comps.find((c) => c.url === r.url)?.page.title ?? ""),
  );

  if (!ranks && roundup.length) {
    const domains = [...new Set(roundup.map((r) => r.domain))].slice(0, 5);
    actions.push({
      action: `Get listed in the roundups that already rank (${domains.join(", ")}): draft a short pitch with what the product does differently. Do not send from this tool`,
      evidence: serpIds,
      why: "Most results are third-party roundups, so inclusion is the fastest way onto this SERP.",
    });
  }
  if (comps.length && tHome) {
    const med = median(comps.map((c) => c.page.wordCount));
    if (med && tHome.wordCount < med / 2)
      actions.push({
        action: `Publish a dedicated page for "${run.keyword}" (about ${med} words, comparison or guide format) on ${run.target.domain}`,
        evidence: both,
        why: `Ranking pages median ${med} words vs ${tHome.wordCount} on the target homepage.`,
      });
    if (!titleHasKeyword(tHome.title, run.keyword))
      actions.push({
        action: `Put "${run.keyword}" (or close wording) in the title and H1 of the page meant to rank`,
        evidence: both,
        why: "Ranking pages carry the keyword terms in their title; the target homepage does not.",
      });
    const missing = schemaFrequency(comps).filter(
      (t) => t.count >= Math.max(2, Math.ceil(comps.length / 3)) && !run.target.schemaTypes.includes(t.type),
    );
    if (missing.length)
      actions.push({
        action: `Add JSON-LD types used by ranking pages that the target lacks: ${missing
          .slice(0, 5)
          .map((t) => t.type)
          .join(", ")}`,
        evidence: both,
        why: "Shared structured data among the winners; also enables rich results.",
      });
    if (!run.target.schemaTypes.some((t) => t.endsWith("Application")))
      actions.push({
        action:
          "Add MobileApplication or SoftwareApplication JSON-LD (name, operatingSystem, applicationCategory, offers; aggregateRating only if real)",
        evidence: tIds,
        why: "Lets search engines and AI answers identify the site as an app.",
      });
  }
  const badTarget = run.target.pages.flatMap((p) =>
    p.schema.nodes.filter((n) => !n.valid).map((n) => `${n.type}: ${n.errors[0]}`),
  );
  if (badTarget.length)
    actions.push({
      action: `Fix JSON-LD errors on the target: ${[...new Set(badTarget)].slice(0, 4).join("; ")}`,
      evidence: tIds,
      why: "Invalid structured data is ignored for rich results.",
    });
  if (run.aiReadiness) actions.push(...aiPlaybook(run.aiReadiness, run.target.domain, run.target.robotsEvidenceId));
  if (run.keywordGap.length)
    actions.push({
      action: `Cover these competitor phrases in H2s and copy where they fit the product: ${run.keywordGap
        .slice(0, 10)
        .map((k) => k.phrase)
        .join(", ")}`,
      evidence: both,
      why: "Used by two or more ranking pages, missing from the target crawl.",
    });
  if (!run.target.sitemap.urlCount)
    actions.push({
      action: "Publish /sitemap.xml and reference it in robots.txt",
      evidence: [run.target.robotsEvidenceId, run.target.sitemap.evidenceId],
      why: "No sitemap was found.",
    });
  if (!run.citations.length)
    actions.push({
      action: `Ask ChatGPT, Perplexity, Gemini and Grok "${run.keyword}" style prompts and log answers with \`seo-rea cite\``,
      evidence: [],
      why: "AI-answer citations have not been recorded yet.",
    });
  else if (!run.citations.some((c) => c.targetCited))
    actions.push({
      action:
        "Target the pages AI answers cite (see the AI-citation table) with inclusion pitches and a citable comparison page",
      evidence: run.citations.map((c) => c.evidenceId),
      why: "The target was not cited in any recorded AI answer.",
    });
  actions.push({
    action: "Open the ad-library links and note competitor ad hooks, offers and landing pages",
    evidence: run.ads.map((a) => a.evidenceId),
    why: "Ad libraries need a browser; counts alone do not show the creative.",
  });
  return actions;
}
