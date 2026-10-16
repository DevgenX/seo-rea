// Optional paid adapter. Credentials come from the environment only
// (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD). Every call is cached, checked
// against the budget before spending and logged to ledger.csv.

import type { BudgetGuard } from "../core/budget.js";
import { SeoReaError } from "../core/errors.js";
import { TTL, type Cache } from "../core/cache.js";
import type { SerpAd, SerpResult } from "../core/types.js";

const API = "https://api.dataforseo.com/v3";

/** Conservative per-call estimates used for the pre-call budget check. */
export const ESTIMATES: Record<string, number> = {
  "serp/google/organic/live/regular": 0.002,
  "dataforseo_labs/google/ranked_keywords/live": 0.02,
  "dataforseo_labs/google/competitors_domain/live": 0.011,
  "backlinks/summary/live": 0.02,
};

/**
 * Upper-bound price for one call. DataForSEO Labs bills a task fee plus a
 * fee per returned item; observed Oct 2026: ranked_keywords with 100 rows
 * $0.0240, competitors_domain with 10 rows $0.0132. The estimate uses
 * $0.012 + $0.00015/item so it stays above both. Backlinks summary: $0.02.
 */
export function estimateCost(endpoint: string, items = 0): number {
  if (endpoint.startsWith("dataforseo_labs/")) return Math.round((0.012 + 0.00015 * items) * 10000) / 10000;
  return ESTIMATES[endpoint] ?? 0.05;
}

export function credentialsFromEnv(env: NodeJS.ProcessEnv = process.env): { login: string; password: string } | null {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  return login && password ? { login, password } : null;
}

export interface PaidResponse<T> {
  data: T;
  costUsd: number;
  fromCache: boolean;
}

type DfsItem = {
  type?: string;
  url?: string;
  title?: string;
  description?: string;
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number } };
  ranked_serp_element?: { serp_item?: { rank_group?: number } };
};
export type DfsResponse = {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<Record<string, unknown> & { items?: DfsItem[] }> | null;
  }>;
};

const itemsOf = (d: DfsResponse): DfsItem[] => d.tasks?.[0]?.result?.[0]?.items ?? [];

export class DataForSEO {
  private readonly creds: { login: string; password: string } | null;

  constructor(
    private readonly guard: BudgetGuard,
    private readonly cache: Cache | undefined,
    env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.creds = credentialsFromEnv(env);
  }

  get enabled(): boolean {
    return this.guard.enabled && Boolean(this.creds);
  }

  /** True when this exact task is answered from cache (costs nothing). */
  async cached(endpoint: string, task: Record<string, unknown>): Promise<boolean> {
    const ttl = endpoint.startsWith("serp/") ? TTL.serp : TTL.api;
    return Boolean(await this.cache?.get<DfsResponse>(`dataforseo:${endpoint}`, JSON.stringify(task), ttl));
  }

  /** POST one task. Throws BudgetError before spending if not allowed. */
  async call(
    endpoint: string,
    task: Record<string, unknown>,
    estimateUsd: number = ESTIMATES[endpoint] ?? 0.05,
  ): Promise<PaidResponse<DfsResponse>> {
    const query = JSON.stringify(task);
    const ttl = endpoint.startsWith("serp/") ? TTL.serp : TTL.api;
    const hit = await this.cache?.get<DfsResponse>(`dataforseo:${endpoint}`, query, ttl);
    if (hit) return { data: hit, costUsd: 0, fromCache: true };
    await this.guard.check(`dataforseo:${endpoint}`, estimateUsd);
    if (!this.creds) throw new SeoReaError("DEPENDENCY_MISSING", "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set");
    const auth = Buffer.from(`${this.creds.login}:${this.creds.password}`).toString("base64");
    const res = await this.fetchImpl(`${API}/${endpoint}`, {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify([task]),
      signal: AbortSignal.timeout(60000),
    });
    const data = (await res.json()) as DfsResponse;
    const costUsd = Number(data?.cost) || 0;
    await this.guard.record(`dataforseo:${endpoint}`, query, costUsd);
    const task0 = data?.tasks?.[0];
    if (!res.ok || data?.status_code !== 20000 || (task0?.status_code !== undefined && task0.status_code !== 20000)) {
      throw new Error(`DataForSEO ${endpoint}: ${task0?.status_message ?? data?.status_message ?? res.status}`);
    }
    await this.cache?.set(`dataforseo:${endpoint}`, query, data);
    return { data, costUsd, fromCache: false };
  }

  async serp(
    keyword: string,
  ): Promise<PaidResponse<DfsResponse> & { organic: SerpResult[]; ads: SerpAd[]; features: string[] }> {
    const r = await this.call("serp/google/organic/live/regular", {
      keyword,
      location_code: 2840,
      language_code: "en",
      depth: 10,
    });
    const items = itemsOf(r.data);
    return {
      ...r,
      organic: items
        .filter((i) => i.type === "organic")
        .map((i, n) => ({ position: n + 1, url: i.url ?? "", title: i.title ?? "", snippet: i.description ?? "" })),
      ads: items
        .filter((i) => i.type === "paid")
        .map((i) => ({ url: i.url ?? "", title: i.title ?? "", snippet: i.description ?? "" })),
      features: [...new Set(items.map((i) => i.type ?? "").filter((t) => t && t !== "organic"))],
    };
  }

  async rankedKeywords(
    domain: string,
  ): Promise<
    PaidResponse<DfsResponse> & { keywords: Array<{ keyword: string; volume: number | null; position: number | null }> }
  > {
    const r = await this.call("dataforseo_labs/google/ranked_keywords/live", {
      target: domain,
      location_code: 2840,
      language_code: "en",
      limit: 100,
    });
    return {
      ...r,
      keywords: itemsOf(r.data).map((i) => ({
        keyword: i.keyword_data?.keyword ?? "",
        volume: i.keyword_data?.keyword_info?.search_volume ?? null,
        position: i.ranked_serp_element?.serp_item?.rank_group ?? null,
      })),
    };
  }
}
