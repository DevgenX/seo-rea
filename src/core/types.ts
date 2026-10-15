// Shared types for the evidence store, finding ledger, budget and adapters.

/** How an evidence item was obtained. */
export type EvidenceKind =
  | "observed" // fetched or parsed by the tool
  | "manual" // supplied by the operator (URL list, saved SERP)
  | "manual-check" // a URL a human must open
  | "api" // paid or keyed API response
  | "citation" // AI-answer citation logged with `cite`
  | "derived"; // computed from other evidence

export interface Evidence {
  id: string;
  source: string;
  kind: EvidenceKind;
  url: string;
  note: string;
  file: string;
  costUsd: number;
  fetchedAt: string;
  fromCache: boolean;
}

export interface EvidenceInput {
  source: string;
  kind?: EvidenceKind;
  url?: string;
  note?: string;
  ext?: string;
  content: unknown;
  costUsd?: number;
  fetchedAt?: string;
  fromCache?: boolean;
}

export type ClaimType = "observed" | "inferred";
export type Confidence = "high" | "medium" | "low";

export interface Claim {
  claim: string;
  evidence: string[];
  type: ClaimType;
  confidence: Confidence;
  boundary: string;
  unknowns: string;
}

/** The finding ledger: every claim with evidence, boundary and unknowns. */
export interface Ledger {
  runId: string;
  claims: Claim[];
}

export interface Budget {
  /** Cap for this run in USD. 0 means paid calls are refused. */
  runCapUsd: number;
  /** Optional monthly cap summed from ledger.csv. */
  monthlyCapUsd: number;
}

export interface BudgetRow {
  date: string;
  runId: string;
  source: string;
  query: string;
  usd: number;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  fetchedAt: string;
  fromCache: boolean;
  error?: string;
}

export interface FetchOptions {
  source?: string;
  ttlMs?: number;
  cacheIf?: (r: FetchResult) => boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export type Fetcher = (url: string, opts?: FetchOptions) => Promise<FetchResult>;

export type Logger = (message: string) => void;

export interface Availability {
  available: boolean;
  reason: string;
}

/** Context handed to every adapter call. */
export interface AdapterContext {
  fetch: Fetcher;
  log: Logger;
  env: NodeJS.ProcessEnv;
  now: () => Date;
}

/**
 * A pluggable data source. Free adapters are tried before paid ones; paid
 * adapters must go through the budget guard before spending.
 */
export interface SourceAdapter<I, O> {
  readonly id: string;
  readonly label: string;
  readonly category:
    | "serp"
    | "page"
    | "schema"
    | "site"
    | "ai-readiness"
    | "performance"
    | "ads"
    | "keywords"
    | "citations"
    | "paid";
  readonly paid: boolean;
  available(ctx: AdapterContext): Promise<Availability>;
  run(input: I, ctx: AdapterContext): Promise<O>;
}

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
}

export interface SerpAd {
  url: string;
  title: string;
  snippet: string;
}

export interface ParsedSerp {
  organic: SerpResult[];
  ads: SerpAd[];
}

export type EngineName = "google" | "bing" | "duckduckgo";

/** One attempt to collect a SERP, recorded in the report whatever happened. */
export interface SerpAttempt {
  adapter: string;
  engine: string;
  label: string;
  status: number;
  fromCache: boolean;
  problem: string;
  relevance: number;
  organicCount: number;
  adCount: number;
  evidenceId: string;
  consent?: string;
}

export interface SerpOutcome {
  attempt: SerpAttempt;
  parsed: ParsedSerp;
  html?: string;
}
