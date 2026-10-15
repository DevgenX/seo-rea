// Public library API.

export { VERSION } from "./version.js";
export type * from "./core/types.js";
export type * from "./core/run.js";
export { EvidenceStore, formatEvidenceId } from "./core/evidence.js";
export {
  DOSSIER_SCHEMA_VERSION,
  DossierSchema,
  validateDossier,
  dossierJsonSchema,
  type Dossier,
  type TopAction,
} from "./core/dossier.js";
export { buildTeardownDossier, buildAuditDossier } from "./core/dossier-build.js";
export { deriveTopActions, renderTopActions } from "./core/report/actions.js";
export { Cache, TTL, cacheKey } from "./core/cache.js";
export { BudgetError, BudgetGuard, readLedger, appendLedger } from "./core/budget.js";
export { RateLimiter, createFetcher, USER_AGENT } from "./core/http.js";
export { renderTeardown, renderLedger, renderQuestions } from "./core/report/teardown.js";
export { renderAudit } from "./core/report/audit.js";
export { buildClaims, buildPlaybook } from "./core/report/claims.js";
export { parsePage, summarizePage } from "./adapters/page.js";
export { extractSchema, validateNode, SCHEMA_RULES } from "./adapters/schema.js";
export { parseRobots, isAllowed, parseSitemap } from "./adapters/site.js";
export { AI_CRAWLERS, checkAiCrawlers, validateLlmsTxt } from "./adapters/ai-readiness.js";
export { keywordGap, ngrams, topKeywords } from "./adapters/keywords.js";
export { adLibraryLookups, advertiserFromUrl } from "./adapters/adlib.js";
export { parseGoogle, parseBing, parseDuckDuckGo, judgeSerp } from "./adapters/serp-parse.js";
export { runTeardown, type TeardownOptions } from "./services/teardown.js";
export { runAudit, type AuditOptions } from "./services/audit.js";
export { runStrategy, type StrategyOptions } from "./services/strategy.js";
export { buildStrategy } from "./core/strategy/build.js";
export { buildClusters, classifyTemplate, detectProgrammatic, clusterKey } from "./core/strategy/clusters.js";
export { deriveHeadTerms } from "./core/strategy/terms.js";
export { renderStrategy } from "./core/report/strategy.js";
export {
  STRATEGY_SCHEMA_VERSION,
  StrategySchema,
  validateStrategy,
  strategyJsonSchema,
  type Strategy,
} from "./core/strategy/schema.js";
export type * from "./core/strategy/types.js";
export { recordCitation } from "./services/cite.js";
export { runBatch, parseSites, renderSummary, type BatchSummary, type BatchSite } from "./services/batch.js";
export { runDoctor } from "./services/doctor.js";
export { createServer, startStdioServer } from "./mcp/server.js";
