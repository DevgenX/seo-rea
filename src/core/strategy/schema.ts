// Versioned machine-readable Strategy Dossier written to report/strategy.json.
// The zod schema is the source of truth; docs/strategy-schema.json is
// generated from it (`npm run strategy-schema`).

import { z } from "zod";
import { TopActionSchema } from "../dossier.js";
import { TEMPLATE_TYPES } from "./clusters.js";

export const STRATEGY_SCHEMA_VERSION = "1";

const evidenceIds = z.array(z.string()).describe("Evidence IDs (E001...) in evidence/index.json");
const basis = z.enum(["observed", "inferred"]).describe("observed = read from a fetched source; inferred = derived");
const effort = z.enum(["S", "M", "L"]);
const impact = z.enum(["low", "medium", "high"]);
const num = z.number().nullable();

const InferredSchema = z.object({ value: z.string(), why: z.string(), basis, evidenceIds });

export const ClusterSchema = z.object({
  key: z.string().describe("Path prefix, e.g. /blog/credit-cards"),
  name: z.string(),
  terms: z.array(z.string()),
  urlCount: z.number().int().min(0),
  exampleUrls: z.array(z.string()),
  template: z.enum(TEMPLATE_TYPES),
  baseTemplate: z.enum(TEMPLATE_TYPES),
  fetchedPages: z.number().int().min(0),
  medianWords: num,
  linkDensity: num,
  inlinks: z.number().int().min(0),
  hubs: z.array(z.object({ url: z.string(), linksIntoCluster: z.number().int() })),
  programmatic: z
    .object({
      pattern: z.string(),
      share: z.number(),
      basis: z.enum(["slug-affix", "numeric-id", "heading-template"]),
      headingSimilarity: num,
    })
    .nullable(),
});

const RankCheckSchema = z.object({
  status: z.enum(["ranked", "not-in-results", "unknown"]),
  position: z.number().int().nullable(),
  url: z.string(),
  engine: z.string(),
  evidenceId: z.string(),
});

export const DriverSchema = z.object({
  rank: z.number().int().min(1),
  id: z.string(),
  title: z.string().min(1),
  detail: z.string(),
  strength: z.number().int().min(0).max(100),
  copyDifficulty: z.enum(["easy", "medium", "hard"]),
  copyNote: z.string(),
  basis,
  evidenceIds,
});

export const WeaknessSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  detail: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  opening: z.string().describe("What a challenger can do with this gap"),
  basis,
  evidenceIds,
});

export const PlaybookStepSchema = z.object({
  step: z.string().min(1),
  why: z.string(),
  from: z.string().describe("Driver, weakness or gap id this step comes from"),
  effort,
  impact,
  evidenceIds,
});

const PillarsSchema = z.object({
  onPage: z.object({
    pagesFetched: z.number().int(),
    medianTitleLength: num,
    h1Coverage: num,
    metaDescriptionCoverage: num,
    medianWords: num,
    medianH2: num,
    datedPages: z.number().int(),
    medianAgeDays: num,
    updatedWithinYear: num,
    evidenceIds,
  }),
  technical: z.object({
    schemaTypes: z.array(z.object({ type: z.string(), pages: z.number().int() })),
    pagesWithSchema: num,
    pagesWithSchemaErrors: z.number().int(),
    schemaErrorSamples: z.array(z.string()),
    canonicalCoverage: num,
    selfCanonical: num,
    noindexPages: z.number().int(),
    robotsFound: z.boolean(),
    sitemapFiles: z.number().int(),
    sitemapUrls: z.number().int(),
    hreflangPages: z.number().int(),
    langs: z.array(z.string()),
    psi: z.object({ performance: num, seo: num, lcp: z.string(), evidenceId: z.string() }).nullable(),
    psiProblem: z.string(),
    medianHtmlKb: num,
    evidenceIds,
  }),
  offPage: z.object({
    trancoRank: num,
    wikipediaLinkingArticles: num,
    wikipediaMentions: num,
    commonCrawlBlocks: num,
    brandSerpThirdParty: num,
    brandSerpDomains: z.array(z.string()),
    pressLinksOnSite: z.number().int(),
    unknowns: z.array(z.string()),
    evidenceIds,
  }),
  aeo: z.object({
    llmsTxt: z.enum(["valid", "invalid", "absent"]),
    llmsFullTxt: z.boolean(),
    blockedCrawlers: z.array(z.string()),
    blockedSearchCrawlers: z.array(z.string()),
    faqSchemaPages: z.number().int(),
    questionBlockPages: z.number().int(),
    answerFirstShare: num,
    organizationSchema: z.boolean(),
    sameAsCount: z.number().int(),
    citationsLogged: z.number().int(),
    citedIn: z.number().int(),
    evidenceIds,
  }),
  paid: z.object({
    serpAdsByDomain: z.number().int(),
    serpsWithAnyAds: z.number().int(),
    serpsChecked: z.number().int(),
    adLibraries: z.array(
      z.object({
        platform: z.string(),
        url: z.string(),
        status: z.string(),
        visibleCount: num,
        evidenceId: z.string(),
      }),
    ),
    evidenceIds,
  }),
  distribution: z.object({
    channels: z.array(z.object({ channel: z.string(), detail: z.string(), url: z.string() })),
    app: z
      .object({ name: z.string(), rating: num, ratingCount: num, genre: z.string(), evidenceId: z.string() })
      .nullable()
      .describe("App Store listing linked from the site (iTunes Lookup API, US store)"),
    affiliateDisclosure: z.boolean(),
    evidenceIds,
  }),
});

export const SiteStrategySchema = z.object({
  domain: z.string(),
  role: z.enum(["subject", "vs"]),
  error: z.string(),
  snapshot: z.object({
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    whatItIs: InferredSchema,
    businessModel: z.array(InferredSchema),
    audiences: z.array(InferredSchema),
    evidenceIds,
  }),
  map: z.object({
    sitemapFiles: z.number().int(),
    indexChildren: z.number().int(),
    childStems: z.array(z.object({ stem: z.string(), files: z.number().int() })),
    knownUrls: z.number().int(),
    mappedUrls: z.number().int(),
    pagesFetched: z.number().int(),
    robotsSkipped: z.number().int(),
    clusters: z.array(ClusterSchema),
    evidenceIds,
  }),
  keywords: z.object({
    terms: z.array(
      z.object({
        term: z.string(),
        docs: z.number().int(),
        sources: z.array(z.string()),
        pages: z.array(z.string()),
        check: RankCheckSchema,
      }),
    ),
    checked: z.number().int(),
    rankedTop10: z.number().int(),
    unknown: z.number().int(),
    evidenceIds,
  }),
  pillars: PillarsSchema,
  drivers: z.array(DriverSchema),
  weaknesses: z.array(WeaknessSchema),
});

export const StrategySchema = z.object({
  schemaVersion: z.literal(STRATEGY_SCHEMA_VERSION),
  tool: z.literal("seo-rea"),
  toolVersion: z.string(),
  kind: z.literal("strategy"),
  runId: z.string(),
  inputs: z.object({ domain: z.string(), vs: z.string().nullable(), budgetUsd: z.number().min(0) }),
  timestamps: z.object({ createdAt: z.string(), writtenAt: z.string() }),
  cost: z.object({ spentUsd: z.number().min(0), budgetUsd: z.number().min(0) }),
  roles: z.object({
    leader: z.string(),
    challenger: z.string().nullable(),
    basis: z.string(),
    evidenceIds,
  }),
  actionsFor: z.string().describe("Domain the top actions and plan are written for"),
  topActions: z.array(TopActionSchema).max(10),
  sites: z.array(SiteStrategySchema).min(1).max(2),
  serp: z.object({
    checks: z.array(
      z.object({
        term: z.string(),
        kind: z.enum(["head-term", "brand"]),
        from: z.string(),
        engine: z.string(),
        status: z.enum(["used", "blocked"]),
        problem: z.string(),
        evidenceId: z.string(),
        results: z.array(z.object({ position: z.number().int(), domain: z.string(), url: z.string() })),
        adDomains: z.array(z.string()),
      }),
    ),
    notes: z.array(z.string()),
  }),
  competitors: z.array(
    z.object({
      domain: z.string(),
      serps: z.number().int().min(0),
      terms: z.array(z.string()),
      bestPosition: z.number().int(),
      medianPosition: z.number(),
      isVs: z.boolean(),
      evidenceIds,
    }),
  ),
  playbook: z.array(PlaybookStepSchema),
  plan: z.object({
    for: z.string(),
    days30: z.array(PlaybookStepSchema),
    days60: z.array(PlaybookStepSchema),
    days90: z.array(PlaybookStepSchema),
  }),
  comparison: z
    .object({
      leader: z.string(),
      challenger: z.string(),
      rows: z.array(
        z.object({
          pillar: z.string(),
          metric: z.string(),
          leader: z.string(),
          challenger: z.string(),
          edge: z.enum(["leader", "challenger", "even", "unknown"]),
        }),
      ),
      clusterGaps: z.array(
        z.object({
          cluster: z.string(),
          urlCount: z.number().int(),
          template: z.string(),
          example: z.string(),
          terms: z.array(z.string()),
          evidenceIds,
        }),
      ),
      keywords: z.object({
        both: z.array(z.string()),
        leaderOnly: z.array(z.string()),
        challengerOnly: z.array(z.string()),
        neither: z.array(z.string()),
        unknown: z.array(z.string()),
        termGaps: z
          .array(z.string())
          .describe("Leader head terms that appear nowhere in the challenger's titles or URLs"),
      }),
      firstMoves: z.array(PlaybookStepSchema),
    })
    .nullable(),
  unknowns: z.array(z.string()),
  evidenceIndex: z.string(),
});

export type Strategy = z.infer<typeof StrategySchema>;
export type SiteStrategy = z.infer<typeof SiteStrategySchema>;
export type Pillars = z.infer<typeof PillarsSchema>;
export type Driver = z.infer<typeof DriverSchema>;
export type Weakness = z.infer<typeof WeaknessSchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type Inferred = z.infer<typeof InferredSchema>;

/** Throws with every schema problem listed. */
export function validateStrategy(value: unknown): Strategy {
  const r = StrategySchema.safeParse(value);
  if (!r.success) {
    const problems = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`strategy does not match schema v${STRATEGY_SCHEMA_VERSION}: ${problems.slice(0, 10).join("; ")}`);
  }
  return r.data;
}

/** JSON Schema (draft 2020-12) for docs/strategy-schema.json. */
export function strategyJsonSchema(): Record<string, unknown> {
  return {
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/strategy-schema.json",
    title: `seo-rea strategy dossier v${STRATEGY_SCHEMA_VERSION}`,
    ...z.toJSONSchema(StrategySchema),
  };
}
