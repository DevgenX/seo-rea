// Reverse-engineering report schema (report/reverse.json, kind "reverse").

import { z } from "zod";
import { SeoReaError } from "../errors.js";

export const REVERSE_SCHEMA_VERSION = "1";

const evidenceIds = z.array(z.string().regex(/^E\d{3,}$/)).describe("Evidence ids in evidence/index.json");
const urls = z.array(z.string()).describe("Example pages");
const level = z.enum(["high", "medium", "low"]);

export const TemplateType = z.enum([
  "home",
  "article",
  "comparison",
  "tool",
  "product",
  "entity",
  "category",
  "help",
  "legal",
  "other",
]);

const FindingSchema = z.object({
  claim: z.string(),
  basis: z.enum(["observed", "inferred"]),
  confidence: level,
  evidenceIds,
  examples: urls,
});

export const ReverseReportSchema = z.object({
  schemaVersion: z.literal(REVERSE_SCHEMA_VERSION),
  tool: z.literal("seo-rea"),
  toolVersion: z.string(),
  kind: z.literal("reverse"),
  runId: z.string(),
  domain: z.string(),
  timestamps: z.object({ createdAt: z.string(), writtenAt: z.string() }),
  cost: z.object({ usd: z.number().min(0), paidCalls: z.number().int().min(0) }),
  coverage: z.object({
    pagesCrawled: z.number().int(),
    indexablePages: z.number().int(),
    crawlComplete: z.boolean(),
    crawlReport: z.string().describe("Path of the crawl.json this analysis used, relative to the run folder"),
  }),
  summary: z.array(FindingSchema).describe("The strategy in a few evidence-backed sentences"),
  keywords: z.array(
    z.object({ term: z.string(), pages: z.number().int(), inTitles: z.number().int(), examples: urls }),
  ),
  clusters: z.array(
    z.object({
      key: z.string(),
      pages: z.number().int(),
      share: z.number(),
      template: TemplateType,
      avgWords: z.number().int(),
      schemaTypes: z.array(z.string()),
      topTerms: z.array(z.string()),
      hub: z.string().nullable(),
      examples: urls,
    }),
  ),
  templates: z.array(
    z.object({ type: TemplateType, pages: z.number().int(), avgWords: z.number().int(), examples: urls }),
  ),
  programmatic: z.array(
    z.object({ pattern: z.string(), pages: z.number().int(), titlePattern: z.string(), examples: urls }),
  ),
  linking: z.object({
    avgInternalLinks: z.number(),
    globalLinks: z.array(z.string()).describe("Internal links present on at least 80% of pages (nav, footer)"),
    hubs: z.array(z.object({ url: z.string(), pagerank: z.number(), inlinks: z.number().int() })),
    orphanPages: z.number().int(),
    deepPages: z.number().int(),
    depthHistogram: z.array(z.object({ depth: z.number().int(), pages: z.number().int() })),
  }),
  offpage: z.object({
    trancoRank: z.number().int().nullable(),
    wikipediaLinkingPages: z.number().int().nullable(),
    wikipediaMentions: z.number().int().nullable(),
    commonCrawlPages: z.number().int().nullable(),
    outboundDomains: z.array(z.object({ domain: z.string(), pages: z.number().int() })),
    evidenceIds,
  }),
  schema: z.array(z.object({ type: z.string(), pages: z.number().int(), share: z.number() })),
  aeo: z.object({
    llmsTxt: z.object({ present: z.boolean(), valid: z.boolean(), links: z.number().int() }),
    llmsFullTxt: z.boolean(),
    aiCrawlers: z.array(
      z.object({ token: z.string(), operator: z.string(), access: z.enum(["allowed", "blocked", "partial"]) }),
    ),
    faqPages: z.number().int(),
    howToPages: z.number().int(),
    questionTitles: z.number().int().describe("Pages whose title or H1 is a question"),
    rawHtmlReadableShare: z.number().describe("Share of indexable pages with 200+ words in raw HTML"),
    evidenceIds,
  }),
  cadence: z.object({
    datedPages: z.number().int(),
    first: z.string(),
    last: z.string(),
    last90Days: z.number().int(),
    last365Days: z.number().int(),
    perMonth: z.array(z.object({ month: z.string(), pages: z.number().int() })),
    medianGapDays: z.number().nullable(),
    updatedLast90Days: z.number().int(),
  }),
  tech: z.array(z.object({ name: z.string(), pages: z.number().int() })),
  playbook: z.array(
    z.object({
      step: z.string(),
      why: z.string(),
      effort: z.enum(["S", "M", "L"]),
      impact: level,
      evidenceIds,
    }),
  ),
  unknowns: z.array(z.string()),
  evidenceIndex: z.string(),
});

export type ReverseReport = z.infer<typeof ReverseReportSchema>;
export type ReverseFinding = z.infer<typeof FindingSchema>;
export type Template = z.infer<typeof TemplateType>;

export function validateReverse(value: unknown): ReverseReport {
  const r = ReverseReportSchema.safeParse(value);
  if (!r.success) {
    const problems = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new SeoReaError(
      "SCHEMA_INVALID",
      `reverse report does not match schema v${REVERSE_SCHEMA_VERSION}: ${problems.slice(0, 10).join("; ")}`,
    );
  }
  return r.data;
}

export function reverseJsonSchema(): Record<string, unknown> {
  return {
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/reverse-schema.json",
    title: `seo-rea reverse v${REVERSE_SCHEMA_VERSION}`,
    ...z.toJSONSchema(ReverseReportSchema),
  };
}
