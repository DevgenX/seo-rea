// Run data for `seo-rea strategy` (data/strategy-run.json). Collected by
// services/strategy.ts; everything in report/strategy.* is computed from it.

import type { PageSignals } from "../../adapters/signals.js";
import type { AdEntry, AiReadinessSummary, CitationEntry } from "../run.js";
import type { Cluster } from "./clusters.js";
import type { HeadTerm } from "./terms.js";

export interface CrawledPage {
  url: string;
  isHome: boolean;
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string;
  hreflang: string[];
  lang: string;
  h1: string[];
  h2: string[];
  wordCount: number;
  schemaTypes: string[];
  /** "Type: first error" for JSON-LD nodes that fail the required-property checks. */
  schemaErrors: string[];
  schemaBlocks: number;
  internalLinks: string[];
  externalLinkCount: number;
  signals: PageSignals;
  evidenceId: string;
}

export interface SitemapInfo {
  files: Array<{ url: string; kind: string; locs: number }>;
  /** Child sitemaps listed by sitemap indexes, fetched or not. */
  indexChildren: number;
  /** Child sitemap names grouped by stem (wp-sitemap-posts-articles-3.xml -> posts-articles). */
  childStems: Array<{ stem: string; files: number }>;
  urlCount: number;
  evidenceId: string;
}

export interface OffpageSummary {
  trancoRank: number | null;
  trancoDate: string;
  wikiLinkingArticles: number | null;
  wikiLinkSample: string[];
  wikiMentions: number | null;
  commonCrawlBlocks: number | null;
  commonCrawlId: string;
  problems: string[];
  evidenceIds: { tranco: string; wikiLinks: string; wikiMentions: string; commonCrawl: string };
}

export interface AppListing {
  id: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  genre: string;
  price: string;
  updatedAt: string;
  evidenceId: string;
}

export interface SiteProfile {
  domain: string;
  origin: string;
  brand: string;
  brandTokens: string[];
  robots: { found: boolean; blocksRoot: boolean; sitemapLines: number; evidenceId: string };
  sitemap: SitemapInfo;
  /** Internal URLs from homepage navigation and header. */
  navUrls: string[];
  /** URLs used for the cluster map (sitemaps + nav), before the sample cap. */
  knownUrls: number;
  pages: CrawledPage[];
  crawlEvidenceId: string;
  /** URLs skipped because robots.txt disallows them for seo-rea. */
  robotsSkipped: number;
  ai: AiReadinessSummary;
  offpage: OffpageSummary;
  ads: AdEntry[];
  citations: CitationEntry[];
  /** App Store listing linked from the site, if any. */
  app: AppListing | null;
  /** Off-site URLs the site owns (store listings, social profiles); a SERP hit on these counts as the site. */
  ownedUrls: string[];
  /** Subdomains linked from the homepage whose sitemaps were walked. */
  subdomains: string[];
  /** Stratified sample of known URLs (the mapped set, max ~200). */
  urls: string[];
  /** Clusters built from every known URL and the fetched pages. */
  clusters: Cluster[];
  /** Head terms derived from the site's own pages; the ones checked in SERPs. */
  terms: HeadTerm[];
  error: string;
}

export interface SerpCheck {
  term: string;
  kind: "head-term" | "brand";
  /** Domain whose site the term was derived from. */
  from: string;
  engine: string;
  problem: string;
  evidenceId: string;
  organic: Array<{ position: number; url: string; domain: string; title: string; snippet: string }>;
  ads: Array<{ url: string; domain: string; title: string }>;
}

export interface StrategyRun {
  tool: string;
  version: string;
  runId: string;
  createdAt: string;
  budgetUsd: number;
  spentUsd: number;
  subject: string;
  vs: string | null;
  sites: SiteProfile[];
  serps: SerpCheck[];
  serpNotes: string[];
  unknowns: string[];
}
