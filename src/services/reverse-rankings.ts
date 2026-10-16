// Opt-in paid rankings for `reverse`: plan the DataForSEO calls, show the
// estimate, refuse up front if it does not fit the run or monthly cap, then
// call, save raw responses as evidence and log the actual cost.

import { DataForSEO, estimateCost, type DfsResponse } from "../adapters/dataforseo.js";
import { BudgetError, type BudgetGuard } from "../core/budget.js";
import type { EvidenceStore } from "../core/evidence.js";
import { errorMessage } from "../core/util.js";
import {
  parseBacklinks,
  parseCompetitors,
  parseRankedKeywords,
  rollUp,
  type Rankings,
} from "../core/reverse/rankings.js";

export interface RankingsOptions {
  domain: string;
  dfs: DataForSEO;
  guard: BudgetGuard;
  store: EvidenceStore;
  log: (m: string) => void;
  keywordsLimit: number;
  competitorsLimit: number;
  backlinks: boolean;
}

const LOCATION = 2840;
const LANGUAGE = "en";

interface PlannedCall {
  key: "ranked" | "competitors" | "backlinks";
  endpoint: string;
  task: Record<string, unknown>;
  estimateUsd: number;
}

export function planCalls(
  o: Pick<RankingsOptions, "domain" | "keywordsLimit" | "competitorsLimit" | "backlinks">,
): PlannedCall[] {
  const calls: PlannedCall[] = [
    {
      key: "ranked",
      endpoint: "dataforseo_labs/google/ranked_keywords/live",
      task: {
        target: o.domain,
        location_code: LOCATION,
        language_code: LANGUAGE,
        limit: o.keywordsLimit,
        order_by: ["ranked_serp_element.serp_item.etv,desc"],
      },
      estimateUsd: estimateCost("dataforseo_labs/google/ranked_keywords/live", o.keywordsLimit),
    },
  ];
  if (o.competitorsLimit > 0)
    calls.push({
      key: "competitors",
      endpoint: "dataforseo_labs/google/competitors_domain/live",
      task: {
        target: o.domain,
        location_code: LOCATION,
        language_code: LANGUAGE,
        limit: o.competitorsLimit,
        exclude_top_domains: true,
      },
      estimateUsd: estimateCost("dataforseo_labs/google/competitors_domain/live", o.competitorsLimit),
    });
  if (o.backlinks)
    calls.push({
      key: "backlinks",
      endpoint: "backlinks/summary/live",
      task: { target: o.domain, include_subdomains: true },
      estimateUsd: estimateCost("backlinks/summary/live"),
    });
  return calls;
}

const usd = (n: number): string => `$${n.toFixed(4)}`;

/** Returns null (with a reason) when nothing could be fetched. */
export async function collectRankings(o: RankingsOptions): Promise<{ rankings: Rankings | null; reason: string }> {
  if (!o.dfs.enabled)
    return {
      rankings: null,
      reason: o.guard.enabled
        ? "DataForSEO credentials missing (set DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)"
        : "paid rankings off (pass --budget-usd to enable)",
    };
  const calls = planCalls(o);
  for (const c of calls) if (await o.dfs.cached(c.endpoint, c.task)) c.estimateUsd = 0;
  const estimate = Math.round(calls.reduce((s, c) => s + c.estimateUsd, 0) * 10000) / 10000;
  const spent = await o.guard.spent();
  const cap = o.guard.budget;
  o.log(
    `DataForSEO estimate: ${usd(estimate)} for ${calls.length} call(s) (${calls.map((c) => `${c.key} ~${usd(c.estimateUsd)}`).join(", ")}); run cap ${usd(cap.runCapUsd)}, month spent ${usd(spent.month)} of ${Number.isFinite(cap.monthlyCapUsd) ? usd(cap.monthlyCapUsd) : "no cap"}`,
  );
  if (spent.run + estimate > cap.runCapUsd || spent.month + estimate > cap.monthlyCapUsd)
    return { rankings: null, reason: `estimate ${usd(estimate)} does not fit the budget; no paid call made` };

  const notes: string[] = [];
  const raw: Partial<Record<PlannedCall["key"], DfsResponse>> = {};
  let actual = 0;
  let made = 0;
  let cached = 0;
  let billedEarlier = 0;
  for (const c of calls) {
    try {
      const r = await o.dfs.call(c.endpoint, c.task, c.estimateUsd);
      raw[c.key] = r.data;
      actual += r.costUsd;
      if (r.fromCache) {
        cached++;
        billedEarlier += Number(r.data?.cost) || 0;
      } else made++;
      o.log(`DataForSEO ${c.key}: ${r.fromCache ? "from cache, $0" : `actual ${usd(r.costUsd)}`}`);
    } catch (err) {
      if (err instanceof BudgetError) {
        notes.push(`${c.key}: refused by budget (${err.message})`);
        break;
      }
      notes.push(`${c.key}: ${errorMessage(err)}`);
      o.log(`DataForSEO ${c.key} failed: ${errorMessage(err)}`);
    }
  }
  if (!raw.ranked) return { rankings: null, reason: notes.join("; ") || "ranked keywords call failed" };
  const evidenceIds: string[] = [];
  for (const [key, data] of Object.entries(raw)) {
    const e = await o.store.add({
      source: `dataforseo-${key}-${o.domain}`,
      url: "https://api.dataforseo.com/v3",
      note: `DataForSEO ${key} (paid)`,
      content: data,
      costUsd: Number(data?.cost) || 0,
    });
    evidenceIds.push(e.id);
  }
  const ranked = parseRankedKeywords(raw.ranked);
  const rankings: Rankings = {
    source: "DataForSEO Labs (Google)",
    locationCode: LOCATION,
    languageCode: LANGUAGE,
    totals: { ...ranked.totals, sampled: ranked.keywords.length },
    keywords: ranked.keywords.slice(0, 50),
    ...rollUp(ranked.keywords),
    competitors: raw.competitors ? parseCompetitors(raw.competitors, o.domain).slice(0, 10) : [],
    backlinks: raw.backlinks ? parseBacklinks(raw.backlinks) : null,
    cost: { estimateUsd: estimate, actualUsd: Math.round(actual * 10000) / 10000, calls: made, fromCache: cached },
    evidenceIds,
    notes: [
      `Sections and pages are rolled up from the top ${ranked.keywords.length} keywords by estimated traffic, not every keyword.`,
      ...(cached
        ? [
            `${cached} response(s) served from cache at $0; originally billed $${billedEarlier.toFixed(4)} (see the ledger).`,
          ]
        : []),
      ...notes,
    ],
  };
  return { rankings, reason: "" };
}
