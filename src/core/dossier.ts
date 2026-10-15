// Versioned machine-readable run summary written to report/dossier.json.
// The zod schema is the source of truth; docs/dossier-schema.json is generated
// from it (`npm run dossier-schema`).

import { SeoReaError } from "./errors.js";
import { ISSUE_ID_RE } from "./issues.js";
import { z } from "zod";

export const DOSSIER_SCHEMA_VERSION = "1";

const evidenceIds = z.array(z.string()).describe("Evidence IDs (E001...) in evidence/index.json");

export const TopActionSchema = z.object({
  id: z
    .string()
    .regex(ISSUE_ID_RE)
    .describe("Stable issue id (rule code plus optional subject hash); same problem, same id across runs"),
  rank: z.number().int().min(1),
  title: z.string().min(1),
  why: z.string(),
  evidenceIds,
  effort: z.enum(["S", "M", "L"]),
  impact: z.enum(["low", "medium", "high"]),
  owner: z.enum(["content", "dev", "seo"]).describe("Owner hint"),
});

const SchemaCheckSchema = z.object({
  type: z.string(),
  checkedAs: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

const HeadingsSchema = z.object({ h1: z.array(z.string()), h2: z.array(z.string()), h3: z.array(z.string()) });

export const DossierSchema = z.object({
  schemaVersion: z.literal(DOSSIER_SCHEMA_VERSION),
  tool: z.literal("seo-rea"),
  toolVersion: z.string(),
  kind: z.enum(["teardown", "audit"]),
  runId: z.string(),
  inputs: z.object({
    target: z.string().describe("Target domain"),
    url: z.string().describe("Page audited, or the target homepage for a teardown"),
    keyword: z.string().nullable(),
    budgetUsd: z.number().min(0),
  }),
  timestamps: z.object({ createdAt: z.string(), writtenAt: z.string() }),
  cost: z.object({ spentUsd: z.number().min(0), budgetUsd: z.number().min(0) }),
  serp: z.object({
    collected: z.boolean(),
    primary: z.string(),
    engines: z.array(
      z.object({
        engine: z.string(),
        label: z.string(),
        adapter: z.string(),
        status: z.enum(["used", "not-used"]),
        problem: z.string(),
        httpStatus: z.number(),
        organicCount: z.number().int(),
        adCount: z.number().int(),
        evidenceId: z.string(),
      }),
    ),
    results: z.array(
      z.object({
        position: z.number().int(),
        url: z.string(),
        domain: z.string(),
        title: z.string(),
        isTarget: z.boolean(),
      }),
    ),
    ads: z.array(z.object({ engine: z.string(), url: z.string(), title: z.string() })),
    evidenceId: z.string(),
  }),
  competitors: z.array(
    z.object({
      position: z.number().int(),
      url: z.string(),
      domain: z.string(),
      analysed: z.boolean(),
      error: z.string(),
      title: z.string(),
      wordCount: z.number().int().min(0),
      headings: HeadingsSchema,
      schema: z.object({
        types: z.array(z.string()),
        blocks: z.number().int(),
        parseErrors: z.array(z.string()),
        validationErrors: z.array(z.object({ type: z.string(), errors: z.array(z.string()) })),
      }),
      internalLinks: z.number().int().min(0),
      evidenceId: z.string(),
    }),
  ),
  target: z.object({
    domain: z.string(),
    fetched: z.boolean(),
    error: z.string(),
    pages: z.array(
      z.object({
        url: z.string(),
        title: z.string(),
        metaDescription: z.string(),
        wordCount: z.number().int().min(0),
        headings: HeadingsSchema,
        schemaTypes: z.array(z.string()),
        internalLinks: z.number().int().min(0),
      }),
    ),
    schemaValidation: z.object({
      types: z.array(z.string()),
      blocks: z.number().int(),
      parseErrors: z.array(z.string()),
      checks: z.array(SchemaCheckSchema.extend({ url: z.string() })),
      evidenceIds,
    }),
    aiReadiness: z.object({
      crawlers: z.array(
        z.object({
          token: z.string(),
          operator: z.string(),
          purpose: z.string(),
          access: z.enum(["allowed", "blocked", "partial"]),
          rule: z.string(),
        }),
      ),
      llmsTxt: z.object({
        present: z.boolean(),
        valid: z.boolean(),
        linkCount: z.number().int(),
        sections: z.array(z.string()),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
      }),
      llmsFullTxt: z.object({ present: z.boolean(), bytes: z.number().int() }),
      evidenceIds,
    }),
    performance: z.array(
      z.object({
        source: z.enum(["psi", "lighthouse"]),
        strategy: z.enum(["mobile", "desktop"]),
        ok: z.boolean(),
        skipped: z.string(),
        scores: z.record(z.string(), z.number().nullable()),
        lab: z.record(z.string(), z.string()),
        field: z.record(z.string(), z.string()),
        evidenceId: z.string(),
      }),
    ),
    robots: z.object({ found: z.boolean(), blocksRoot: z.boolean(), evidenceId: z.string() }),
    sitemap: z.object({ urlCount: z.number().int(), evidenceId: z.string() }),
    evidenceIds,
  }),
  keywordGap: z.array(
    z.object({
      phrase: z.string(),
      words: z.number().int(),
      competitors: z.number().int(),
      tfidf: z.number(),
      score: z.number(),
    }),
  ),
  ads: z.array(
    z.object({
      domain: z.string(),
      brand: z.string(),
      platform: z.string(),
      url: z.string(),
      status: z.enum(["manual-check", "captured", "error"]),
      visibleCount: z.number().nullable(),
      note: z.string(),
      evidenceIds,
    }),
  ),
  citations: z.array(
    z.object({
      engine: z.string(),
      prompt: z.string(),
      urls: z.array(z.string()),
      domains: z.array(z.string()),
      targetCited: z.boolean(),
      recordedAt: z.string(),
      evidenceId: z.string(),
    }),
  ),
  claims: z.array(
    z.object({
      id: z.string().regex(/^C\d{2,}$/),
      text: z.string(),
      evidenceIds,
      type: z.enum(["observed", "inferred"]),
      confidence: z.enum(["high", "medium", "low"]),
      boundary: z.string(),
      unknowns: z.string(),
    }),
  ),
  unknowns: z.array(z.string()),
  topActions: z.array(TopActionSchema).max(10),
  evidenceIndex: z.string().describe("Path of the evidence index, relative to the run folder"),
});

export type Dossier = z.infer<typeof DossierSchema>;
export type TopAction = z.infer<typeof TopActionSchema>;

/** Throws with every schema problem listed. */
export function validateDossier(value: unknown): Dossier {
  const r = DossierSchema.safeParse(value);
  if (!r.success) {
    const problems = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new SeoReaError(
      "SCHEMA_INVALID",
      `dossier does not match schema v${DOSSIER_SCHEMA_VERSION}: ${problems.slice(0, 10).join("; ")}`,
    );
  }
  return r.data;
}

/** JSON Schema (draft 2020-12) for docs/dossier-schema.json. */
export function dossierJsonSchema(): Record<string, unknown> {
  return {
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/dossier-schema.json",
    title: `seo-rea dossier v${DOSSIER_SCHEMA_VERSION}`,
    ...z.toJSONSchema(DossierSchema),
  };
}
