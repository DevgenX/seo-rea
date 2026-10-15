// Shape of data/run.json for teardown and audit runs.

import type { AdPlatform } from "../adapters/adlib.js";
import type { CrawlerCheck, LlmsTxtReport } from "../adapters/ai-readiness.js";
import type { Citation } from "../adapters/cite.js";
import type { GapPhrase } from "../adapters/keywords.js";
import type { Inlink } from "../adapters/links.js";
import type { PageSummary } from "../adapters/page.js";
import type { PerfResult } from "../adapters/performance.js";
import type { SerpAd, SerpAttempt, SerpResult } from "./types.js";

export interface CompetitorCard {
  position: number;
  url: string;
  domain: string;
  evidenceId: string;
  robots?: { status: number; sitemaps: string[] };
  page?: PageSummary;
  error?: string;
}

export interface SiteSummary {
  domain: string;
  origin: string;
  robotsEvidenceId: string;
  robotsFound: boolean;
  robotsBlocksRoot: boolean;
  sitemap: { urlCount: number; sources: Array<{ url: string; kind: string; locs: number }>; evidenceId: string };
}

export interface AiReadinessSummary {
  crawlers: CrawlerCheck[];
  llmsTxt: Omit<LlmsTxtReport, "links"> & { linkCount: number };
  llmsFullTxt: Omit<LlmsTxtReport, "links"> & { linkCount: number };
  llmsEvidenceIds: string[];
  crawlerEvidenceId: string;
  perf: Array<Omit<PerfResult, "raw"> & { evidenceId: string }>;
}

export interface TargetSummary extends SiteSummary {
  pages: PageSummary[];
  schemaTypes: string[];
  inlinks: Inlink[];
  topKeywords: Array<{ phrase: string; score: number }>;
  homeEvidenceId: string;
  crawlEvidenceId: string;
  error?: string;
}

export interface AdEntry {
  domain: string;
  brand: string;
  platform: AdPlatform;
  url: string;
  status: "manual-check" | "captured" | "error";
  visibleCount: number | null;
  note: string;
  evidenceId: string;
  screenshotEvidenceId?: string;
}

export interface CitationEntry extends Citation {
  targetCited: boolean;
  evidenceId: string;
}

export interface TeardownRun {
  tool: string;
  version: string;
  runId: string;
  keyword: string;
  createdAt: string;
  budgetUsd: number;
  spentUsd: number;
  userAgent: string;
  browserUserAgent: string;
  serp: {
    attempts: SerpAttempt[];
    notes: string[];
    organic: Array<SerpResult & { domain: string }>;
    ads: Array<SerpAd & { engine: string }>;
    primary: string;
    primaryLabel: string;
    parsedEvidenceId: string;
    features?: string[];
  };
  competitors: CompetitorCard[];
  target: TargetSummary;
  aiReadiness: AiReadinessSummary | null;
  keywordGap: Array<Omit<GapPhrase, "urls">>;
  paidKeywords: Array<{
    domain: string;
    keywords: Array<{ keyword: string; volume: number | null; position: number | null }>;
    evidenceId: string;
  }>;
  ads: AdEntry[];
  citations: CitationEntry[];
  unknowns: string[];
  finished: boolean;
}

export interface AuditRun {
  tool: string;
  version: string;
  runId: string;
  createdAt: string;
  url: string;
  site: SiteSummary;
  page: PageSummary | null;
  pageEvidenceId: string;
  pageError: string;
  aiReadiness: AiReadinessSummary;
  unknowns: string[];
}
