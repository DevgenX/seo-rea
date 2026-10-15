// Snapshot, site map, keyword checks and the six pillars for one site,
// computed from collected run data. Pure.

import { isDomainOrSub, median } from "../util.js";
import { isSupportUrl } from "./terms.js";
import { SEARCH_CRAWLERS } from "../report/claims.js";
import type { Inferred, Pillars, SiteStrategy } from "./schema.js";
import type { CrawledPage, SerpCheck, SiteProfile } from "./types.js";

const ids = (list: Array<string | undefined>): string[] => [...new Set(list.filter((x): x is string => !!x))];
const share = (n: number, d: number): number | null => (d ? Math.round((n / d) * 100) / 100 : null);
const pathOf = (u: string): string => {
  try {
    return new URL(u).pathname.replace(/\/$/, "") || "/";
  } catch {
    return u;
  }
};

export const home = (s: SiteProfile): CrawledPage | undefined => s.pages.find((p) => p.isHome) ?? s.pages[0];
const pageIds = (s: SiteProfile, pages = s.pages): string[] =>
  ids([...pages.map((p) => p.evidenceId), s.crawlEvidenceId]);

export function buildSnapshot(s: SiteProfile): SiteStrategy["snapshot"] {
  const h = home(s);
  const hid = ids([h?.evidenceId]);
  const all = s.pages;
  const dist = all.map((p) => p.signals.distribution);
  const urlText = [...s.urls, ...s.navUrls].map(pathOf).join(" ");
  const model: Inferred[] = [];
  const appStore = dist.some((d) => d.appStore.length);
  const play = dist.some((d) => d.playStore.length);
  if (appStore || play)
    model.push({
      value: `Mobile app (${[appStore ? "App Store" : "", play ? "Google Play" : ""].filter(Boolean).join(" + ")} links on site)`,
      why: "store links found in page HTML",
      basis: "observed",
      evidenceIds: pageIds(
        s,
        all.filter((p) => p.signals.distribution.appStore.length || p.signals.distribution.playStore.length),
      ).slice(0, 3),
    });
  const paidPaths = urlText.match(/\/(pricing|pro|premium|plans?|upgrade|subscribe)\b/g) ?? [];
  if (paidPaths.length)
    model.push({
      value: "Paid tier or subscription",
      why: `URL paths ${[...new Set(paidPaths)].slice(0, 3).join(", ")} in sitemap/nav`,
      basis: "inferred",
      evidenceIds: ids([s.sitemap.evidenceId, h?.evidenceId]),
    });
  const aff = all.filter((p) => p.signals.distribution.affiliateDisclosure);
  if (aff.length)
    model.push({
      value: "Affiliate or partner revenue (advertiser/affiliate disclosure on pages)",
      why: `${aff.length}/${all.length} fetched pages carry disclosure wording`,
      basis: "inferred",
      evidenceIds: pageIds(s, aff).slice(0, 3),
    });
  if (dist.some((d) => d.extension.length) || /\/extension\b/.test(urlText))
    model.push({
      value: "Browser extension",
      why: "extension store link or /extension page",
      basis: "observed",
      evidenceIds: ids([s.sitemap.evidenceId, h?.evidenceId]),
    });
  const content = s.clusters
    .filter(
      (c) =>
        ["blog", "guide", "review", "comparison"].includes(c.baseTemplate) && !isSupportUrl(c.exampleUrls[0] ?? ""),
    )
    .reduce((n, c) => n + c.urlCount, 0);
  if (content && content >= s.knownUrls * 0.4)
    model.push({
      value: "Content publisher (editorial pages are the bulk of the site)",
      why: `${content}/${s.knownUrls} known URLs sit in blog/guide/review/comparison clusters`,
      basis: "inferred",
      evidenceIds: ids([s.sitemap.evidenceId, s.crawlEvidenceId]),
    });
  const audiences: Inferred[] = [];
  const big = s.clusters
    .filter(
      (c) =>
        c.key !== "/(top-level)" &&
        c.key !== "/" &&
        c.urlCount >= 10 &&
        c.terms.length &&
        !isSupportUrl(c.exampleUrls[0] ?? ""),
    )
    .slice(0, 4);
  if (big.length)
    audiences.push({
      value: `People researching ${[...new Set(big.map((c) => c.terms[0] ?? c.name))].join(", ")}`,
      why: `largest clusters: ${big.map((c) => `${c.key} (${c.urlCount})`).join(", ")}`,
      basis: "inferred",
      evidenceIds: ids([s.sitemap.evidenceId, s.crawlEvidenceId]),
    });
  const nav = (h?.signals.navLinks ?? [])
    .map((l) => l.anchor)
    .filter((a) => a && a.length < 30 && !/log ?in|sign ?(in|up)|home|menu|search|account/i.test(a));
  if (nav.length)
    audiences.push({
      value: `Navigation leads with: ${[...new Set(nav)].slice(0, 6).join(", ")}`,
      why: "homepage <nav>/<header> anchors in page order",
      basis: "observed",
      evidenceIds: hid,
    });
  return {
    title: h?.title ?? "",
    description: h?.metaDescription ?? "",
    h1: h?.h1[0] ?? "",
    whatItIs: {
      value: h
        ? h.metaDescription || h.h1[0] || h.title || "(homepage has no title, H1 or description)"
        : `not fetched: ${s.error}`,
      why: h ? (h.metaDescription ? "homepage meta description" : "homepage H1/title") : "homepage fetch failed",
      basis: "observed",
      evidenceIds: hid,
    },
    businessModel: model,
    audiences,
    evidenceIds: hid,
  };
}

export function buildMap(s: SiteProfile): SiteStrategy["map"] {
  return {
    sitemapFiles: s.sitemap.files.length,
    indexChildren: s.sitemap.indexChildren,
    childStems: s.sitemap.childStems.slice(0, 15),
    knownUrls: s.knownUrls,
    mappedUrls: s.urls.length,
    pagesFetched: s.pages.length,
    robotsSkipped: s.robotsSkipped,
    clusters: s.clusters.slice(0, 40),
    evidenceIds: ids([s.sitemap.evidenceId, s.crawlEvidenceId, s.robots.evidenceId]),
  };
}

export type RankCheck = SiteStrategy["keywords"]["terms"][number]["check"];

const lower = (u: string): string =>
  u
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");

/** True when `url` is one of the site's own off-site listings (same App Store id, Play id, or profile URL). */
export function isOwnedUrl(url: string, owned: string[]): boolean {
  const app = /apps\.apple\.com\/.*\/id(\d+)/.exec(url)?.[1];
  const play = /play\.google\.com\/store\/apps\/details\?id=([\w.]+)/.exec(url)?.[1];
  const u = lower(url);
  return owned.some((o) => {
    if (app) return o.includes(`/id${app}`);
    if (play) return o.includes(`id=${play}`);
    const x = lower(o);
    return x.length > 8 && (u === x || u.startsWith(`${x}/`));
  });
}

/** Where `domain` (or one of its owned listings) ranks for `term` in the collected SERPs. */
export function rankFor(term: string, domain: string, serps: SerpCheck[], owned: string[] = []): RankCheck {
  const c = serps.find((x) => x.term === term && x.kind === "head-term");
  if (!c) return { status: "unknown", position: null, url: "", engine: "", evidenceId: "" };
  if (c.problem) return { status: "unknown", position: null, url: "", engine: c.engine, evidenceId: c.evidenceId };
  const hit = c.organic.find((r) => isDomainOrSub(r.domain, domain) || isOwnedUrl(r.url, owned));
  return hit
    ? { status: "ranked", position: hit.position, url: hit.url, engine: c.engine, evidenceId: c.evidenceId }
    : { status: "not-in-results", position: null, url: "", engine: c.engine, evidenceId: c.evidenceId };
}

export function buildKeywords(s: SiteProfile, serps: SerpCheck[]): SiteStrategy["keywords"] {
  const terms = s.terms.map((t) => ({ ...t, check: rankFor(t.term, s.domain, serps, s.ownedUrls) }));
  return {
    terms,
    checked: terms.filter((t) => t.check.status !== "unknown").length,
    rankedTop10: terms.filter((t) => t.check.position !== null && t.check.position <= 10).length,
    unknown: terms.filter((t) => t.check.status === "unknown").length,
    evidenceIds: ids([...terms.map((t) => t.check.evidenceId), s.crawlEvidenceId]),
  };
}

const ageDays = (iso: string, now: Date): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now.getTime() - t) / 86400000));
};

export function buildPillars(s: SiteProfile, serps: SerpCheck[], now: Date): Pillars {
  const P = s.pages;
  const n = P.length;
  const pid = pageIds(s);
  const dates = P.map((p) => p.signals.modified || p.signals.published).filter(Boolean);
  const ages = dates.map((d) => ageDays(d, now)).filter((a): a is number => a !== null);
  const typeCount = new Map<string, number>();
  for (const p of P) for (const t of new Set(p.schemaTypes)) typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
  const perf = s.ai.perf.find((p) => p.ok);
  const brandSerps = serps.filter((c) => c.kind === "brand" && c.from === s.domain && !c.problem);
  const own = (d: string): boolean => isDomainOrSub(d, s.domain);
  const social = new Set(P.flatMap((p) => p.signals.distribution.social.map((x) => x.url)).map((u) => u.toLowerCase()));
  // Third-party pages that mention the brand. Namesake domains (brand word in
  // the domain name) and the brand's own store/social profiles do not count.
  const b = s.brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  const brandRe = new RegExp(`${b.split("").join("[\\s.-]?")}|${s.domain.replace(/\./g, "\\.")}`, "i");
  const platform =
    /(^|\.)(apps\.apple\.com|play\.google\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com|pinterest\.com|threads\.net|chromewebstore\.google\.com)$/;
  const namesake = (d: string): boolean =>
    (d.split(".").slice(0, -1).join(".") || d).replace(/[^a-z0-9]/g, "").includes(b);
  const ownProfile = (r: { domain: string; url: string }): boolean =>
    social.has(r.url.toLowerCase()) ||
    (platform.test(r.domain) &&
      r.url
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .includes(b));
  const third = brandSerps.flatMap((c) =>
    c.organic.filter(
      (r) =>
        !own(r.domain) && !namesake(r.domain) && !ownProfile(r) && brandRe.test(`${r.title} ${r.snippet} ${r.url}`),
    ),
  );
  const press = new Set(P.flatMap((p) => p.signals.pressLinks));
  const off = s.offpage;
  const offUnknowns = [...off.problems];
  if (!brandSerps.length) offUnknowns.push("Brand SERP not collected (blocked or skipped)");
  offUnknowns.push("Backlink counts and referring domains need a paid index; not measured at $0");
  const crawlers = s.ai.crawlers;
  const blocked = crawlers.filter((c) => c.access === "blocked").map((c) => c.token);
  const nonHome = P.filter((p) => !p.isHome);
  const headSerps = serps.filter((c) => c.kind === "head-term" && !c.problem);
  const dist = P.map((p) => p.signals.distribution);
  const first = <T>(f: (d: (typeof dist)[number]) => T[]): T | undefined => dist.flatMap(f)[0];
  const channels: Pillars["distribution"]["channels"] = [];
  const ch = (channel: string, detail: string, url = ""): void => {
    channels.push({ channel, detail, url });
  };
  const app = first((d) => d.appStore);
  if (app)
    ch(
      "iOS App Store",
      s.app
        ? `${s.app.rating?.toFixed(1) ?? "?"} stars, ${s.app.ratingCount ?? "?"} ratings (${s.app.evidenceId})`
        : "store link on site",
      app,
    );
  const play = first((d) => d.playStore);
  if (play) ch("Google Play", "store link on site", play);
  const ext = first((d) => d.extension);
  if (ext) ch("Browser extension", "extension store link", ext);
  const platforms = new Map<string, string>();
  for (const d of dist) for (const x of d.social) if (!platforms.has(x.platform)) platforms.set(x.platform, x.url);
  for (const [name, url] of platforms) ch(`Social: ${name}`, "profile link on site", url);
  const comm = first((d) => d.community);
  if (comm) ch("Community", "forum/Discord/Reddit link", comm);
  if (dist.some((d) => d.newsletter)) ch("Newsletter", "email signup form with newsletter/subscribe wording");
  if (dist.some((d) => d.podcast)) ch("Podcast", "podcast link on site");
  const distPages = P.filter((p) => {
    const d = p.signals.distribution;
    return d.appStore.length || d.playStore.length || d.extension.length || d.social.length || d.newsletter;
  });
  return {
    onPage: {
      pagesFetched: n,
      medianTitleLength: median(P.map((p) => p.title.length).filter((x) => x > 0)),
      h1Coverage: share(P.filter((p) => p.h1.length).length, n),
      metaDescriptionCoverage: share(P.filter((p) => p.metaDescription).length, n),
      medianWords: median(P.map((p) => p.wordCount)),
      medianH2: median(P.map((p) => p.h2.length)),
      datedPages: dates.length,
      medianAgeDays: median(ages),
      updatedWithinYear: share(ages.filter((a) => a <= 365).length, ages.length),
      evidenceIds: pid,
    },
    technical: {
      schemaTypes: [...typeCount.entries()]
        .toSorted((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
        .slice(0, 12)
        .map(([type, pages]) => ({ type, pages })),
      pagesWithSchema: share(P.filter((p) => p.schemaBlocks > 0).length, n),
      pagesWithSchemaErrors: P.filter((p) => p.schemaErrors.length).length,
      schemaErrorSamples: [...new Set(P.flatMap((p) => p.schemaErrors))].slice(0, 5),
      canonicalCoverage: share(P.filter((p) => p.canonical).length, n),
      selfCanonical: share(P.filter((p) => p.canonical && pathOf(p.canonical) === pathOf(p.url)).length, n),
      noindexPages: P.filter((p) => /noindex/i.test(p.metaRobots)).length,
      robotsFound: s.robots.found,
      sitemapFiles: s.sitemap.files.length,
      sitemapUrls: s.sitemap.urlCount,
      hreflangPages: P.filter((p) => p.hreflang.length).length,
      langs: [...new Set(P.map((p) => p.lang.toLowerCase()).filter(Boolean))].slice(0, 8),
      psi: perf
        ? {
            performance: perf.scores.performance ?? null,
            seo: perf.scores.seo ?? null,
            lcp: perf.lab["largest-contentful-paint"] ?? "",
            evidenceId: perf.evidenceId,
          }
        : null,
      psiProblem: perf ? "" : (s.ai.perf[0]?.skipped ?? "not run"),
      medianHtmlKb: median(P.map((p) => Math.round(p.signals.htmlBytes / 1024))),
      evidenceIds: ids([...pid, s.robots.evidenceId, s.sitemap.evidenceId, perf?.evidenceId]),
    },
    offPage: {
      trancoRank: off.trancoRank,
      wikipediaLinkingArticles: off.wikiLinkingArticles,
      wikipediaMentions: off.wikiMentions,
      commonCrawlBlocks: off.commonCrawlBlocks,
      brandSerpThirdParty: brandSerps.length ? new Set(third.map((r) => r.domain)).size : null,
      brandSerpDomains: [...new Set(third.map((r) => r.domain))].slice(0, 10),
      pressLinksOnSite: press.size,
      unknowns: offUnknowns,
      evidenceIds: ids([...Object.values(off.evidenceIds), ...brandSerps.map((c) => c.evidenceId)]),
    },
    aeo: {
      llmsTxt: s.ai.llmsTxt.present ? (s.ai.llmsTxt.valid ? "valid" : "invalid") : "absent",
      llmsFullTxt: s.ai.llmsFullTxt.present,
      blockedCrawlers: blocked,
      blockedSearchCrawlers: blocked.filter((t) => SEARCH_CRAWLERS.has(t)),
      faqSchemaPages: P.filter((p) => p.schemaTypes.includes("FAQPage")).length,
      questionBlockPages: P.filter((p) => p.signals.questionBlocks >= 2).length,
      answerFirstShare: share(nonHome.filter((p) => p.signals.answerFirst).length, nonHome.length),
      organizationSchema: P.some((p) => p.signals.orgName || p.schemaTypes.some((t) => t.endsWith("Organization"))),
      sameAsCount: Math.max(0, ...P.map((p) => p.signals.sameAs.length)),
      citationsLogged: s.citations.length,
      citedIn: s.citations.filter((c) => c.targetCited).length,
      evidenceIds: ids([s.ai.crawlerEvidenceId, ...s.ai.llmsEvidenceIds, ...pid.slice(0, 3)]),
    },
    paid: {
      serpAdsByDomain: headSerps.flatMap((c) => c.ads).filter((a) => own(a.domain)).length,
      serpsWithAnyAds: headSerps.filter((c) => c.ads.length).length,
      serpsChecked: headSerps.length,
      adLibraries: s.ads.map((a) => ({
        platform: a.platform,
        url: a.url,
        status: a.status,
        visibleCount: a.visibleCount,
        evidenceId: a.evidenceId,
      })),
      evidenceIds: ids([
        ...headSerps.filter((c) => c.ads.length).map((c) => c.evidenceId),
        ...s.ads.map((a) => a.evidenceId),
      ]),
    },
    distribution: {
      channels,
      app: s.app
        ? {
            name: s.app.name,
            rating: s.app.rating,
            ratingCount: s.app.ratingCount,
            genre: s.app.genre,
            evidenceId: s.app.evidenceId,
          }
        : null,
      affiliateDisclosure: dist.some((d) => d.affiliateDisclosure),
      evidenceIds: pageIds(s, distPages).slice(0, 6),
    },
  };
}
