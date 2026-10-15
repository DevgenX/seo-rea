// Collects one site's strategy profile: sitemaps, navigation, a stratified
// page sample, AI readiness, PageSpeed, free off-page signals and ad-library
// lookups. Every fetch is written to the evidence store.

import type { EvidenceStore } from "../core/evidence.js";
import { ROBOTS_TOKEN } from "../core/http.js";
import type { AdEntry } from "../core/run.js";
import { buildClusters, clusterKey, locOf, stratifiedSample } from "../core/strategy/clusters.js";
import { brandTokensFor, deriveHeadTerms } from "../core/strategy/terms.js";
import type { AppListing, CrawledPage, OffpageSummary, SiteProfile } from "../core/strategy/types.js";
import { domainOf, isDomainOrSub } from "../core/util.js";
import { adLibraryUrlAdapter, brandFromDomain, createAdLibraryCaptureAdapter } from "../adapters/adlib.js";
import { appStoreAdapter, appStoreId, offpageAdapter } from "../adapters/offpage.js";
import { pageAdapter } from "../adapters/page.js";
import { extractSignals } from "../adapters/signals.js";
import { isAllowed, parseRobots } from "../adapters/site.js";
import { sitemapWalkAdapter } from "../adapters/sitemap-walk.js";
import { collectAiReadiness } from "./collect.js";
import { loadCitations } from "./reports.js";
import type { Runtime } from "./runtime.js";

export interface SiteCollectOptions {
  /** Pages to fetch per site (homepage included). */
  crawl: number;
  /** URLs to map in detail (the stratified sample). */
  mapCap: number;
  terms: number;
  psi: boolean;
  lighthouse: boolean;
  adlibCapture: boolean;
}

/** Subdomains that carry pages worth mapping; link., go., pass., click. hosts are redirects and tracking. */
const CONTENT_SUB = /^(help|support|docs|blog|learn|community|forum|kb|academy|guides?|news|resources)\./;

const SKIP_EXT = /\.(pdf|png|jpe?g|gif|svg|webp|zip|xml|json|txt|mp4|mp3|css|js|ico)$/i;

function sameSiteUrl(u: string, domain: string): string {
  try {
    const x = new URL(u);
    const host = domainOf(u);
    if (!/^https?:$/.test(x.protocol) || !isDomainOrSub(host, domain) || SKIP_EXT.test(x.pathname)) return "";
    if (host !== domain && !CONTENT_SUB.test(host)) return "";
    x.hash = "";
    x.search = "";
    return x.toString();
  } catch {
    return "";
  }
}

function crawledPage(
  page: NonNullable<Awaited<ReturnType<typeof pageAdapter.run>>["page"]>,
  html: string,
  isHome: boolean,
  evidenceId: string,
): CrawledPage {
  return {
    url: page.url,
    isHome,
    title: page.title,
    metaDescription: page.metaDescription,
    metaRobots: page.metaRobots,
    canonical: page.canonical,
    hreflang: page.hreflang,
    lang: page.lang,
    h1: page.headings.h1.slice(0, 5),
    h2: page.headings.h2.slice(0, 40),
    wordCount: page.wordCount,
    schemaTypes: page.schemaTypes,
    schemaErrors: page.schema.nodes.filter((n) => !n.valid).map((n) => `${n.type}: ${n.errors[0] ?? "invalid"}`),
    schemaBlocks: page.schema.blocks,
    internalLinks: [...new Set(page.internalLinks.map((l) => l.href))].slice(0, 600),
    externalLinkCount: page.externalLinks.length,
    signals: extractSignals(html, page.url),
    evidenceId,
  };
}

/**
 * Crawl frontier: nav links first (what the site promotes), then always the
 * URL whose cluster has the fewest fetched pages, so links discovered on
 * fetched pages (templates missing from sitemaps) get sampled too.
 */
export class Frontier {
  private readonly queue: string[] = [];
  private readonly seen = new Set<string>();
  private readonly fetchedPerCluster = new Map<string, number>();
  private readonly fetched = new Set<string>();
  constructor(
    private readonly root: string,
    nav: string[],
  ) {
    this.priority = nav.slice(0, 8);
    for (const u of this.priority) this.seen.add(locOf(u));
  }
  private priority: string[];

  add(urls: string[]): void {
    for (const u of urls) {
      const k = locOf(u);
      if (this.seen.has(k)) continue;
      this.seen.add(k);
      this.queue.push(u);
    }
  }

  markFetched(url: string): void {
    const k = clusterKey(url, this.root);
    this.fetchedPerCluster.set(k, (this.fetchedPerCluster.get(k) ?? 0) + 1);
    this.seen.add(locOf(url));
    this.fetched.add(locOf(url));
  }

  /** Least-fetched cluster first; among those, the one with the most queued URLs (likely a template). */
  next(): string | undefined {
    // Nav often links the homepage, which is fetched before the frontier starts.
    for (let p = this.priority.shift(); p; p = this.priority.shift()) if (!this.fetched.has(locOf(p))) return p;
    const queued = new Map<string, number>();
    for (const u of this.queue) {
      const k = clusterKey(u, this.root);
      queued.set(k, (queued.get(k) ?? 0) + 1);
    }
    let best = -1;
    let bestKey: [number, number] = [Infinity, 0];
    for (let i = 0; i < this.queue.length; i++) {
      const k = clusterKey(this.queue[i] as string, this.root);
      const score: [number, number] = [this.fetchedPerCluster.get(k) ?? 0, queued.get(k) ?? 0];
      if (score[0] < bestKey[0] || (score[0] === bestKey[0] && score[1] > bestKey[1])) {
        best = i;
        bestKey = score;
      }
    }
    return best < 0 ? undefined : this.queue.splice(best, 1)[0];
  }
}

export async function collectSiteProfile(
  domain: string,
  rt: Runtime,
  ev: EvidenceStore,
  o: SiteCollectOptions,
): Promise<{ profile: SiteProfile; unknowns: string[] }> {
  const { ctx } = rt;
  const origin = `https://${domain}`;
  const unknowns: string[] = [];
  ctx.log(`strategy: ${domain}`);
  const walk = await sitemapWalkAdapter.run({ origin }, ctx);
  const rf = walk.robotsFetch;
  const robotsFound = rf.ok && !/<html/i.test(rf.body);
  const robotsEv = await ev.add({
    source: `robots-${domain}`,
    url: `${origin}/robots.txt`,
    ext: "txt",
    content: robotsFound ? rf.body : `not found: ${rf.error || `HTTP ${rf.status}`}`,
    fetchedAt: rf.fetchedAt,
    fromCache: rf.fromCache,
    note: robotsFound
      ? `${walk.robots.groups.length} group(s), ${walk.robots.sitemaps.length} sitemap line(s)`
      : "no robots.txt",
  });

  const homeUrl = `${origin}/`;
  const home = await pageAdapter.run(homeUrl, ctx);
  const pages: CrawledPage[] = [];
  let navUrls: string[] = [];
  let homeLinks: string[] = [];
  let error = "";
  if (home.page) {
    const e = await ev.add({
      source: `page-${domain}-home`,
      url: home.finalUrl,
      ext: "html",
      content: home.html,
      fetchedAt: home.fetchedAt,
      fromCache: home.fromCache,
      note: `homepage; ${home.page.wordCount} words`,
    });
    const cp = crawledPage(home.page, home.html, true, e.id);
    pages.push(cp);
    navUrls = [...new Set(cp.signals.navLinks.map((l) => sameSiteUrl(l.href, domain)).filter(Boolean))];
    homeLinks = cp.internalLinks.map((u) => sameSiteUrl(u, domain)).filter(Boolean);
  } else {
    error = home.error;
    await ev.add({
      source: `page-${domain}-home`,
      url: homeUrl,
      ext: "txt",
      content: `fetch failed: ${home.error}`,
      fetchedAt: home.fetchedAt,
      note: home.error,
    });
  }

  // Subdomains linked from the homepage (help., blog., community.) often carry
  // the content; walk up to two of their sitemaps.
  const subdomains = [
    ...new Set(
      [...navUrls, ...homeLinks]
        .map((u) => new URL(u).hostname.replace(/^www\./, ""))
        .filter((h) => h !== domain && h.endsWith(`.${domain}`) && CONTENT_SUB.test(h)),
    ),
  ].slice(0, 2);
  const subUrls: string[] = [];
  const subFiles: SiteProfile["sitemap"]["files"] = [];
  for (const sub of subdomains) {
    const w = await sitemapWalkAdapter.run({ origin: `https://${sub}`, maxFiles: 3 }, ctx);
    subUrls.push(...w.urls);
    subFiles.push(...w.files);
  }
  const sitemapUrls = [...walk.urls, ...subUrls].map((u) => sameSiteUrl(u, domain)).filter(Boolean);
  const known = new Set([...sitemapUrls, ...navUrls, ...homeLinks]);
  const sample = stratifiedSample([...known], o.mapCap, domain);
  const frontier = new Frontier(domain, navUrls);
  if (home.page) frontier.markFetched(home.page.url);
  frontier.add(sample);
  let robotsSkipped = 0;
  const subRobots = new Map<string, Awaited<ReturnType<typeof sitemapWalkAdapter.run>>["robots"]>();
  for (let u = frontier.next(); u && pages.length < o.crawl; u = frontier.next()) {
    const host = new URL(u).hostname.replace(/^www\./, "");
    let robots = walk.robots;
    if (host !== domain) {
      if (!subRobots.has(host)) {
        const rr = await ctx.fetch(`https://${host}/robots.txt`, { source: "robots", ttlMs: 30 * 86400000 });
        subRobots.set(host, parseRobots(rr.ok && !/<html/i.test(rr.body) ? rr.body : ""));
      }
      robots = subRobots.get(host) ?? robots;
    }
    if (!isAllowed(robots, ROBOTS_TOKEN, u)) {
      robotsSkipped++;
      continue;
    }
    ctx.log(`page: ${u}`);
    const r = await pageAdapter.run(u, ctx);
    frontier.markFetched(u);
    if (!r.page) continue;
    const e = await ev.add({
      source: `page-${domain}`,
      url: r.finalUrl,
      ext: "html",
      content: r.html,
      fetchedAt: r.fetchedAt,
      fromCache: r.fromCache,
      note: `${r.page.wordCount} words; schema ${r.page.schemaTypes.join(", ") || "none"}`,
    });
    const cp = crawledPage(r.page, r.html, false, e.id);
    pages.push(cp);
    const found = cp.internalLinks.map((x) => sameSiteUrl(x, domain)).filter(Boolean);
    for (const f of found) known.add(f);
    frontier.add(found);
  }
  const knownList = [...known];

  const brand = brandFromDomain(domain);
  const brandTokens = brandTokensFor(domain, brand, pages[0]?.signals.orgName ?? "");
  const clusters = buildClusters(knownList, pages, brandTokens, domain);
  const terms = deriveHeadTerms(pages, knownList, clusters, brandTokens, o.terms);
  const smEv = await ev.add({
    source: `sitemap-${domain}`,
    url: walk.files[0]?.url ?? `${origin}/sitemap.xml`,
    note: `${sitemapUrls.length} URLs from ${walk.files.length + subFiles.length} file(s); ${walk.indexChildren} child sitemaps listed`,
    content: {
      files: [...walk.files, ...subFiles],
      subdomains,
      linkDiscovered: knownList.length - new Set([...sitemapUrls, ...navUrls, ...homeLinks]).size,
      indexChildren: walk.indexChildren,
      childStems: walk.childStems,
      urlCount: sitemapUrls.length,
      clusterCounts: clusters.map((c) => ({ key: c.key, urls: c.urlCount })),
      sample: stratifiedSample(knownList, o.mapCap, domain),
    },
  });
  const crawlEv = await ev.add({
    source: `strategy-crawl-${domain}`,
    kind: "derived",
    url: origin,
    note: `${pages.length} pages parsed; ${clusters.length} clusters; ${terms.length} head terms`,
    content: {
      pages: pages.map(({ internalLinks, ...p }) => ({ ...p, internalLinkCount: internalLinks.length })),
      clusters,
      terms,
    },
  });

  const ai = await collectAiReadiness(
    { origin, robotsFetch: rf, robots: walk.robots, sitemapSources: walk.files, sitemapUrls },
    home.page?.url ?? homeUrl,
    ctx,
    ev,
    { psi: o.psi, lighthouse: o.lighthouse },
  );
  unknowns.push(...ai.unknowns.map((u) => `${domain}: ${u}`));

  const off = await offpageAdapter.run({ domain, brand: pages[0]?.signals.orgName || brand }, ctx);
  const offIds: OffpageSummary["evidenceIds"] = { tranco: "", wikiLinks: "", wikiMentions: "", commonCrawl: "" };
  const problems: string[] = [];
  for (const [key, look, label] of [
    ["tranco", off.tranco, "Tranco rank"],
    ["wikiLinks", off.wikiLinks, "Wikipedia external links"],
    ["wikiMentions", off.wikiMentions, "Wikipedia brand mentions"],
    ["commonCrawl", off.commonCrawl, "Common Crawl footprint"],
  ] as const) {
    const e = await ev.add({
      source: `${look.source}-${domain}`,
      kind: "observed",
      url: look.url,
      fetchedAt: look.fetchedAt,
      fromCache: look.fromCache,
      note: look.ok ? `${label}: ${JSON.stringify(look.value).slice(0, 120)}` : `${label} unavailable: ${look.problem}`,
      content: { ok: look.ok, problem: look.problem, value: look.value, body: look.body.slice(0, 20000) },
    });
    offIds[key] = e.id;
    if (!look.ok) problems.push(`${label} unavailable (${look.problem})`);
  }

  const ready = o.adlibCapture ? await rt.browserReady() : { ok: false, reason: "not requested (use --adlib-capture)" };
  const adapter = ready.ok ? createAdLibraryCaptureAdapter(rt.session, rt.limiter) : adLibraryUrlAdapter;
  const ads: AdEntry[] = [];
  for (const a of await adapter.run({ advertisers: [{ domain, brand }] }, ctx)) {
    const { screenshot, ...data } = a;
    const shot = screenshot
      ? await ev.add({ source: `adlib-${a.platform}-${brand}-screenshot`, url: a.url, ext: "png", content: screenshot })
      : null;
    const e = await ev.add({
      source: `adlib-${a.platform}-${brand}`,
      kind: a.status === "captured" ? "observed" : "manual-check",
      url: a.url,
      note: a.note,
      content: { ...data, screenshotEvidenceId: shot?.id ?? null },
    });
    ads.push({
      domain,
      brand,
      platform: a.platform,
      url: a.url,
      status: a.status,
      visibleCount: a.visibleCount,
      note: a.note,
      evidenceId: e.id,
      ...(shot ? { screenshotEvidenceId: shot.id } : {}),
    });
  }

  const dist = pages.map((p) => p.signals.distribution);
  const ownedUrls = [
    ...new Set(
      dist.flatMap((d) => [
        ...d.appStore,
        ...d.playStore,
        ...d.extension,
        ...d.social.map((x) => x.url),
        ...d.community,
      ]),
    ),
  ];
  let app: AppListing | null = null;
  const appId = dist
    .flatMap((d) => d.appStore)
    .map(appStoreId)
    .find(Boolean);
  if (appId) {
    const look = await appStoreAdapter.run({ id: appId }, ctx);
    const e = await ev.add({
      source: `itunes-${domain}`,
      url: look.url,
      fetchedAt: look.fetchedAt,
      fromCache: look.fromCache,
      note: look.value
        ? `${look.value.name}: ${look.value.rating ?? "?"} stars from ${look.value.ratingCount ?? "?"} ratings`
        : `lookup failed: ${look.problem}`,
      content: { ok: look.ok, problem: look.problem, value: look.value },
    });
    if (look.value) app = { ...look.value, evidenceId: e.id };
    else unknowns.push(`${domain}: App Store lookup failed (${look.problem})`);
  }

  return {
    unknowns,
    profile: {
      domain,
      origin,
      brand,
      brandTokens,
      robots: {
        found: robotsFound,
        blocksRoot: robotsFound && !isAllowed(walk.robots, "*", homeUrl),
        sitemapLines: walk.robots.sitemaps.length,
        evidenceId: robotsEv.id,
      },
      sitemap: {
        files: [...walk.files, ...subFiles],
        indexChildren: walk.indexChildren,
        childStems: walk.childStems,
        urlCount: sitemapUrls.length,
        evidenceId: smEv.id,
      },
      navUrls,
      knownUrls: knownList.length,
      pages,
      crawlEvidenceId: crawlEv.id,
      robotsSkipped,
      ai: ai.summary,
      offpage: {
        trancoRank: off.tranco.value?.rank ?? null,
        trancoDate: off.tranco.value?.date ?? "",
        wikiLinkingArticles: off.wikiLinks.value?.linkingArticles ?? null,
        wikiLinkSample: off.wikiLinks.value?.sampleTitles ?? [],
        wikiMentions: off.wikiMentions.value?.hits ?? null,
        commonCrawlBlocks: off.commonCrawl.value?.blocks ?? null,
        commonCrawlId: off.commonCrawl.value?.crawl ?? "",
        problems,
        evidenceIds: offIds,
      },
      ads,
      citations: await loadCitations(ev, domain),
      app,
      ownedUrls,
      subdomains,
      urls: stratifiedSample(knownList, o.mapCap, domain),
      clusters,
      terms,
      error,
    },
  };
}
