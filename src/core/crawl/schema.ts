// Crawl report schema (report/crawl.json, kind "crawl"). zod is the source
// of truth; docs/crawl-schema.json is generated from it.

import { z } from "zod";
import { SeoReaError } from "../errors.js";
import { ISSUE_ID_RE } from "../issues.js";

export const CRAWL_SCHEMA_VERSION = "1";

export const CrawlPageSchema = z.object({
  url: z.string().describe("Normalised URL as queued"),
  finalUrl: z.string().describe("URL after redirects"),
  status: z.number().int().describe("HTTP status; 0 when the fetch failed"),
  depth: z
    .number()
    .int()
    .min(0)
    .describe("Clicks from the start page (sitemap-only URLs get the depth they were found at)"),
  source: z.enum(["start", "link", "sitemap"]),
  contentType: z.string(),
  error: z.string().optional(),
  title: z.string(),
  metaDescription: z.string(),
  metaRobots: z.string(),
  canonical: z.string(),
  h1: z.array(z.string()),
  h2Count: z.number().int(),
  wordCount: z.number().int(),
  lang: z.string(),
  hreflang: z.array(z.string()),
  schemaTypes: z.array(z.string()),
  internalLinks: z.array(z.string()).describe("Unique normalised internal link targets"),
  externalLinkCount: z.number().int(),
  externalDomains: z.array(z.string()).describe("Unique external domains linked from the page"),
  published: z.string().describe("ISO date from article:published_time or JSON-LD datePublished, else empty"),
  modified: z.string().describe("ISO date from article:modified_time or JSON-LD dateModified, else empty"),
  tech: z.array(z.string()).describe("Stack fingerprints seen in the HTML (generator meta, framework markers)"),
  contentHash: z.string().describe("sha1 of the normalised body text; empty when not HTML"),
  fetchedAt: z.string(),
});

export const CrawlIssueSchema = z.object({
  id: z.string().regex(ISSUE_ID_RE).describe("Stable issue id: rule code plus subject hash"),
  rule: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  url: z.string().describe("Page the issue is about (or the first page, for grouped issues)"),
  detail: z.string(),
  urls: z.array(z.string()).describe("Every page involved (duplicates list all copies)"),
});

export const CrawlRuleSummarySchema = z.object({
  rule: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  title: z.string(),
  count: z.number().int(),
  fix: z.string(),
});

export const CrawlReportSchema = z.object({
  schemaVersion: z.literal(CRAWL_SCHEMA_VERSION),
  tool: z.literal("seo-rea"),
  toolVersion: z.string(),
  kind: z.literal("crawl"),
  runId: z.string(),
  domain: z.string(),
  startUrl: z.string(),
  timestamps: z.object({ started: z.string(), finished: z.string() }),
  limits: z.object({ maxPages: z.number().int(), maxDepth: z.number().int(), delayMs: z.number() }),
  stats: z.object({
    pagesCrawled: z.number().int(),
    htmlPages: z.number().int(),
    indexable: z.number().int(),
    queuedLeft: z.number().int().describe("URLs still queued when the page limit stopped the crawl"),
    blockedByRobots: z.number().int(),
    sitemapUrls: z.number().int(),
    resumed: z.boolean(),
    complete: z.boolean().describe("True when the queue emptied before the page limit"),
  }),
  robots: z.object({ fetched: z.boolean(), sitemaps: z.array(z.string()) }),
  pages: z.array(CrawlPageSchema),
  graph: z.object({
    inlinks: z.array(z.object({ url: z.string(), count: z.number().int() })).describe("Top pages by internal inlinks"),
    pagerank: z.array(z.object({ url: z.string(), score: z.number() })).describe("Top pages by internal PageRank"),
    depthHistogram: z.array(z.object({ depth: z.number().int(), pages: z.number().int() })),
  }),
  summary: z.array(CrawlRuleSummarySchema),
  issues: z.array(CrawlIssueSchema),
});

export type CrawlPage = z.infer<typeof CrawlPageSchema>;
export type CrawlIssue = z.infer<typeof CrawlIssueSchema>;
export type CrawlRuleSummary = z.infer<typeof CrawlRuleSummarySchema>;
export type CrawlReport = z.infer<typeof CrawlReportSchema>;

export function validateCrawl(value: unknown): CrawlReport {
  const r = CrawlReportSchema.safeParse(value);
  if (!r.success) {
    const problems = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new SeoReaError(
      "SCHEMA_INVALID",
      `crawl does not match schema v${CRAWL_SCHEMA_VERSION}: ${problems.slice(0, 10).join("; ")}`,
    );
  }
  return r.data;
}

export function crawlJsonSchema(): Record<string, unknown> {
  return {
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/crawl-schema.json",
    title: `seo-rea crawl v${CRAWL_SCHEMA_VERSION}`,
    ...z.toJSONSchema(CrawlReportSchema),
  };
}
