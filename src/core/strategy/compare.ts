// Leader/challenger roles, co-ranking competitors and the --vs side-by-side
// comparison. Pure.

import { isDomainOrSub, median } from "../util.js";
import { tokenize } from "../../adapters/keywords.js";
import { isOwnedUrl, rankFor } from "./pillars.js";
import type { Pillars, SiteStrategy, Strategy } from "./schema.js";
import { isSupportUrl } from "./terms.js";
import type { SerpCheck, SiteProfile } from "./types.js";

const usable = (serps: SerpCheck[]): SerpCheck[] => serps.filter((c) => c.kind === "head-term" && !c.problem);

/** Sum of (11 - position) over head-term SERPs where the domain is in the top 10. */
export function visibility(domain: string, serps: SerpCheck[], owned: string[] = []): number {
  let v = 0;
  for (const c of usable(serps)) {
    const hit = c.organic.find((r) => isDomainOrSub(r.domain, domain) || isOwnedUrl(r.url, owned));
    if (hit && hit.position <= 10) v += 11 - hit.position;
  }
  return v;
}

const tr = (s: SiteProfile): number => s.offpage.trancoRank ?? Infinity;
const fmtT = (s: SiteProfile): string => (s.offpage.trancoRank === null ? "unranked" : `#${s.offpage.trancoRank}`);

export function assignRoles(
  sites: SiteProfile[],
  serps: SerpCheck[],
): { leader: SiteProfile; challenger: SiteProfile | null; basis: string; evidenceIds: string[] } {
  const [a, b] = sites as [SiteProfile, SiteProfile | undefined];
  const ev = usable(serps).map((c) => c.evidenceId);
  if (!b)
    return {
      leader: a,
      challenger: null,
      basis: `Single-domain run: ${a.domain} is analysed as the leader.`,
      evidenceIds: [],
    };
  const va = visibility(a.domain, serps, a.ownedUrls);
  const vb = visibility(b.domain, serps, b.ownedUrls);
  const leaderFirst = va !== vb ? va > vb : tr(a) !== tr(b) ? tr(a) < tr(b) : a.knownUrls >= b.knownUrls;
  const [L, C] = leaderFirst ? [a, b] : [b, a];
  const [vl, vc] = leaderFirst ? [va, vb] : [vb, va];
  const why =
    va !== vb
      ? `SERP visibility ${vl} vs ${vc} (sum of 11-position over ${usable(serps).length} usable head-term SERPs)`
      : tr(a) !== tr(b)
        ? `equal SERP visibility (${va}); Tranco ${fmtT(L)} vs ${fmtT(C)}`
        : `equal SERP visibility and Tranco; known URLs ${L.knownUrls} vs ${C.knownUrls}`;
  const [leader, challenger] = leaderFirst ? [a, b] : [b, a];
  return {
    leader,
    challenger,
    basis: `${leader.domain} leads ${challenger.domain}: ${why}.`,
    evidenceIds: [...ev, a.offpage.evidenceIds.tranco, b.offpage.evidenceIds.tranco].filter(Boolean),
  };
}

export function coRankers(sites: SiteProfile[], serps: SerpCheck[], vs: string | null): Strategy["competitors"] {
  const subject = sites[0]?.domain ?? "";
  const owned = sites[0]?.ownedUrls ?? [];
  const agg = new Map<string, { terms: Set<string>; pos: number[]; ev: Set<string> }>();
  for (const c of usable(serps))
    for (const r of c.organic.slice(0, 10)) {
      if (isDomainOrSub(r.domain, subject) || isOwnedUrl(r.url, owned) || !r.domain) continue;
      const a = agg.get(r.domain) ?? { terms: new Set<string>(), pos: [], ev: new Set<string>() };
      if (!a.terms.has(c.term)) a.pos.push(r.position);
      a.terms.add(c.term);
      a.ev.add(c.evidenceId);
      agg.set(r.domain, a);
    }
  const rows = [...agg.entries()].map(([domain, a]) => ({
    domain,
    serps: a.terms.size,
    terms: [...a.terms].slice(0, 6),
    bestPosition: Math.min(...a.pos),
    medianPosition: median(a.pos) ?? 0,
    isVs: vs !== null && isDomainOrSub(domain, vs),
    evidenceIds: [...a.ev].slice(0, 6),
  }));
  const list = rows
    .toSorted((x, y) => y.serps - x.serps || x.medianPosition - y.medianPosition || x.domain.localeCompare(y.domain))
    .slice(0, 15);
  if (vs && !list.some((r) => r.isVs)) {
    const r = rows.find((x) => x.isVs);
    if (r) list.push(r);
  }
  return list;
}

type Row = NonNullable<Strategy["comparison"]>["rows"][number];

function row(
  pillar: string,
  metric: string,
  l: number | null,
  c: number | null,
  better: "high" | "low",
  show: (n: number) => string = (n) => n.toLocaleString("en-US"),
): Row {
  const edge: Row["edge"] =
    l === null || c === null ? "unknown" : l === c ? "even" : l > c === (better === "high") ? "leader" : "challenger";
  return {
    pillar,
    metric,
    leader: l === null ? "unknown" : show(l),
    challenger: c === null ? "unknown" : show(c),
    edge,
  };
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

const appRatings = (p: Pillars): number | null => p.distribution.app?.ratingCount ?? null;

const big = (s: SiteStrategy): number =>
  s.map.clusters.filter((c) => c.urlCount >= 10 && c.key !== "/(top-level)").length;
const prog = (s: SiteStrategy): number => s.map.clusters.filter((c) => c.programmatic).length;
const yes = (b: boolean): number => (b ? 1 : 0);
const yn = (n: number): string => (n ? "yes" : "no");

export function pillarRows(L: SiteStrategy, C: SiteStrategy): Row[] {
  const lp: Pillars = L.pillars;
  const cp: Pillars = C.pillars;
  return [
    row("Map", "Known URLs (sitemaps + nav)", L.map.knownUrls, C.map.knownUrls, "high"),
    row("Map", "Clusters with 10+ URLs", big(L), big(C), "high"),
    row("Map", "Programmatic clusters", prog(L), prog(C), "high"),
    row("Keywords", "Own head terms in top 10", L.keywords.rankedTop10, C.keywords.rankedTop10, "high"),
    row("On-page", "Median words per sampled page", lp.onPage.medianWords, cp.onPage.medianWords, "high"),
    row(
      "On-page",
      "Pages with meta description",
      lp.onPage.metaDescriptionCoverage,
      cp.onPage.metaDescriptionCoverage,
      "high",
      pct,
    ),
    row(
      "On-page",
      "Dated pages updated within 12 months",
      lp.onPage.updatedWithinYear,
      cp.onPage.updatedWithinYear,
      "high",
      pct,
    ),
    row("Technical", "Pages with JSON-LD", lp.technical.pagesWithSchema, cp.technical.pagesWithSchema, "high", pct),
    row(
      "Technical",
      "Pages with JSON-LD errors",
      lp.technical.pagesWithSchemaErrors,
      cp.technical.pagesWithSchemaErrors,
      "low",
    ),
    row("Technical", "Self-canonical pages", lp.technical.selfCanonical, cp.technical.selfCanonical, "high", pct),
    row(
      "Technical",
      "Mobile PageSpeed performance",
      lp.technical.psi?.performance ?? null,
      cp.technical.psi?.performance ?? null,
      "high",
    ),
    row("Technical", "Median HTML KB", lp.technical.medianHtmlKb, cp.technical.medianHtmlKb, "low"),
    row(
      "Off-page",
      "Tranco rank (lower is better)",
      lp.offPage.trancoRank,
      cp.offPage.trancoRank,
      "low",
      (n) => `#${n.toLocaleString("en-US")}`,
    ),
    row(
      "Off-page",
      "Wikipedia articles linking",
      lp.offPage.wikipediaLinkingArticles,
      cp.offPage.wikipediaLinkingArticles,
      "high",
    ),
    row(
      "Off-page",
      "Wikipedia text mentions of brand",
      lp.offPage.wikipediaMentions,
      cp.offPage.wikipediaMentions,
      "high",
    ),
    row(
      "Off-page",
      "Third-party domains on brand SERP",
      lp.offPage.brandSerpThirdParty,
      cp.offPage.brandSerpThirdParty,
      "high",
    ),
    row("AEO", "Valid llms.txt", yes(lp.aeo.llmsTxt === "valid"), yes(cp.aeo.llmsTxt === "valid"), "high", yn),
    row(
      "AEO",
      "AI search crawlers blocked",
      lp.aeo.blockedSearchCrawlers.length,
      cp.aeo.blockedSearchCrawlers.length,
      "low",
    ),
    row("AEO", "Pages with Q&A blocks", lp.aeo.questionBlockPages, cp.aeo.questionBlockPages, "high"),
    row("AEO", "Answer-first inner pages", lp.aeo.answerFirstShare, cp.aeo.answerFirstShare, "high", pct),
    row("AEO", "Organization sameAs links", lp.aeo.sameAsCount, cp.aeo.sameAsCount, "high"),
    row("Paid", "Own ads on checked SERPs", lp.paid.serpAdsByDomain, cp.paid.serpAdsByDomain, "high"),
    row(
      "Distribution",
      "Owned channels found",
      lp.distribution.channels.length,
      cp.distribution.channels.length,
      "high",
    ),
    row("Distribution", "App Store ratings", appRatings(lp), appRatings(cp), "high"),
  ];
}

const GENERIC = new Set([
  "blog",
  "article",
  "articles",
  "learn",
  "guide",
  "guides",
  "news",
  "en",
  "us",
  "ca",
  "page",
  "pages",
  "posts",
]);

function corpus(s: SiteProfile): { text: string; pathTokens: Set<string> } {
  const text = [
    ...s.urls.map((u) => u.replace(/[-_/.]+/g, " ")),
    ...s.pages.flatMap((p) => [p.title, ...p.h1, ...p.h2.slice(0, 10)]),
    ...s.clusters.flatMap((c) => [c.key.replace(/[-_/]+/g, " "), ...c.terms]),
  ]
    .join(" \n ")
    .toLowerCase();
  const paths = [...s.urls, ...s.pages.map((p) => p.url)].map((u) => {
    try {
      return new URL(u).pathname.replace(/[-_/.]+/g, " ");
    } catch {
      return "";
    }
  });
  return { text, pathTokens: new Set(tokenize(paths.join(" "))) };
}

const stem = (t: string): string => t.replace(/s$/, "");

/**
 * Leader clusters the challenger does not cover: no challenger URL path holds
 * the cluster's key words, and none of its multi-word themes appear anywhere
 * in the challenger's titles, headings or URLs.
 */
export function clusterGaps(
  leader: SiteProfile,
  challenger: SiteProfile,
): NonNullable<Strategy["comparison"]>["clusterGaps"] {
  const cc = corpus(challenger);
  const pathStems = new Set([...cc.pathTokens].map(stem));
  const out: NonNullable<Strategy["comparison"]>["clusterGaps"] = [];
  // Help centres document the product; a rival does not need the same support articles to compete.
  for (const c of leader.clusters.filter(
    (x) => x.key !== "/(top-level)" && x.key !== "/" && x.urlCount >= 3 && !isSupportUrl(x.exampleUrls[0] ?? ""),
  )) {
    const keyTokens = tokenize(c.key.replace(/^\/\/[^/]+/, "").replace(/[-_/]+/g, " ")).filter(
      (t) => t.length > 2 && !GENERIC.has(t),
    );
    const termHit = c.terms
      .filter((t) => t.includes(" "))
      .slice(0, 3)
      .some((t) => cc.text.includes(t));
    const keyHit = keyTokens.length > 0 && keyTokens.every((t) => pathStems.has(stem(t)));
    if (termHit || keyHit) continue;
    out.push({
      cluster: c.key,
      urlCount: c.urlCount,
      template: c.template,
      example: c.exampleUrls[0] ?? "",
      terms: c.terms.slice(0, 4),
      evidenceIds: [leader.sitemap.evidenceId, leader.crawlEvidenceId].filter(Boolean),
    });
  }
  return out.slice(0, 12);
}

export function keywordOverlap(
  leader: SiteProfile,
  challenger: SiteProfile,
  serps: SerpCheck[],
): NonNullable<Strategy["comparison"]>["keywords"] {
  const terms = [...new Set(serps.filter((c) => c.kind === "head-term").map((c) => c.term))];
  const k: NonNullable<Strategy["comparison"]>["keywords"] = {
    both: [],
    leaderOnly: [],
    challengerOnly: [],
    neither: [],
    unknown: [],
    termGaps: [],
  };
  const top10 = (t: string, s: SiteProfile): boolean | null => {
    const r = rankFor(t, s.domain, serps, s.ownedUrls);
    if (r.status === "unknown") return null;
    return r.position !== null && r.position <= 10;
  };
  for (const t of terms) {
    const l = top10(t, leader);
    const c = top10(t, challenger);
    if (l === null || c === null) k.unknown.push(t);
    else if (l && c) k.both.push(t);
    else if (l) k.leaderOnly.push(t);
    else if (c) k.challengerOnly.push(t);
    else k.neither.push(t);
  }
  const cc = corpus(challenger);
  k.termGaps = leader.terms.map((t) => t.term).filter((t) => !cc.text.includes(t));
  return k;
}
