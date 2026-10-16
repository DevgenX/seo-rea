// Paid ranking data for `reverse`: parse DataForSEO Labs / Backlinks
// responses and roll them up per section and per URL. Pure.

import { z } from "zod";

export const RankingsSchema = z.object({
  source: z.string(),
  locationCode: z.number().int(),
  languageCode: z.string(),
  totals: z.object({
    rankedKeywords: z.number().int().nullable().describe("All keywords the domain ranks for (DataForSEO count)"),
    estTrafficMonthly: z.number().nullable().describe("Estimated monthly organic visits (DataForSEO etv)"),
    top3: z.number().int().nullable(),
    top10: z.number().int().nullable(),
    sampled: z.number().int().describe("Keywords returned and analysed below (top by traffic)"),
  }),
  keywords: z.array(
    z.object({
      keyword: z.string(),
      position: z.number().int().nullable(),
      url: z.string(),
      volume: z.number().int().nullable(),
      etv: z.number(),
      cpc: z.number().nullable(),
      intent: z.string().nullable(),
    }),
  ),
  sections: z.array(
    z.object({
      key: z.string(),
      keywords: z.number().int(),
      top10: z.number().int(),
      etv: z.number(),
      share: z.number().describe("Share of sampled traffic"),
      topKeyword: z.string(),
      topUrl: z.string(),
    }),
  ),
  pages: z.array(
    z.object({
      url: z.string(),
      keywords: z.number().int(),
      etv: z.number(),
      bestKeyword: z.string(),
      bestPosition: z.number().int().nullable(),
    }),
  ),
  intents: z.array(z.object({ intent: z.string(), keywords: z.number().int(), etv: z.number() })),
  competitors: z.array(
    z.object({
      domain: z.string(),
      sharedKeywords: z.number().int(),
      avgPosition: z.number().nullable(),
      rankedKeywords: z.number().int().nullable(),
      estTrafficMonthly: z.number().nullable(),
    }),
  ),
  backlinks: z
    .object({
      rank: z.number().nullable(),
      backlinks: z.number().int().nullable(),
      referringDomains: z.number().int().nullable(),
      referringMainDomains: z.number().int().nullable(),
      brokenBacklinks: z.number().int().nullable(),
      nofollowReferringDomains: z.number().int().nullable(),
    })
    .nullable(),
  cost: z.object({
    estimateUsd: z.number().min(0),
    actualUsd: z.number().min(0),
    calls: z.number().int().min(0),
    fromCache: z.number().int().min(0),
  }),
  evidenceIds: z.array(z.string()),
  notes: z.array(z.string()),
});

export type Rankings = z.infer<typeof RankingsSchema>;

type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const round = (n: number, d = 1): number => Math.round(n * 10 ** d) / 10 ** d;

/** First result object of a DataForSEO response. */
export function resultOf(data: unknown): Rec {
  const tasks = obj(data).tasks;
  const task = Array.isArray(tasks) ? obj(tasks[0]) : {};
  return Array.isArray(task.result) ? obj(task.result[0]) : {};
}

export function parseRankedKeywords(data: unknown): {
  totals: Omit<Rankings["totals"], "sampled">;
  keywords: Rankings["keywords"];
} {
  const r = resultOf(data);
  const org = obj(obj(r.metrics).organic);
  const p1 = int(org.pos_1);
  const p23 = int(org.pos_2_3);
  const p410 = int(org.pos_4_10);
  const top3 = p1 !== null && p23 !== null ? p1 + p23 : null;
  const items = Array.isArray(r.items) ? (r.items as unknown[]) : [];
  const keywords = items.map((it) => {
    const kd = obj(obj(it).keyword_data);
    const info = obj(kd.keyword_info);
    const serp = obj(obj(obj(it).ranked_serp_element).serp_item);
    return {
      keyword: str(kd.keyword),
      position: int(serp.rank_group),
      url: str(serp.url),
      volume: int(info.search_volume),
      etv: round(num(serp.etv) ?? 0, 2),
      cpc: num(info.cpc),
      intent: str(obj(kd.search_intent_info).main_intent) || null,
    };
  });
  return {
    totals: {
      rankedKeywords: int(org.count) ?? int(r.total_count),
      estTrafficMonthly: num(org.etv) === null ? null : round(num(org.etv) as number),
      top3,
      top10: top3 !== null && p410 !== null ? top3 + p410 : null,
    },
    keywords: keywords.filter((k) => k.keyword),
  };
}

export function parseCompetitors(data: unknown, target: string): Rankings["competitors"] {
  const items = resultOf(data).items;
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const o = obj(it);
      const full = obj(obj(o.full_domain_metrics).organic);
      return {
        domain: str(o.domain),
        sharedKeywords: int(o.intersections) ?? 0,
        avgPosition: num(o.avg_position) === null ? null : round(num(o.avg_position) as number),
        rankedKeywords: int(full.count),
        estTrafficMonthly: num(full.etv) === null ? null : round(num(full.etv) as number),
      };
    })
    .filter((c) => c.domain && c.domain !== target && !c.domain.endsWith(`.${target}`));
}

export function parseBacklinks(data: unknown): Rankings["backlinks"] {
  const r = resultOf(data);
  if (!Object.keys(r).length) return null;
  return {
    rank: num(r.rank),
    backlinks: int(r.backlinks),
    referringDomains: int(r.referring_domains),
    referringMainDomains: int(r.referring_main_domains),
    brokenBacklinks: int(r.broken_backlinks),
    nofollowReferringDomains: int(r.referring_domains_nofollow),
  };
}

const sectionOf = (u: string): string => {
  try {
    const first = new URL(u).pathname.split("/").filter(Boolean)[0];
    return first ? `/${first}` : "/";
  } catch {
    return "/";
  }
};

/** Roll the sampled keywords up by first path segment, URL and intent. */
export function rollUp(keywords: Rankings["keywords"]): Pick<Rankings, "sections" | "pages" | "intents"> {
  const total = keywords.reduce((s, k) => s + k.etv, 0) || 1;
  const bySection = new Map<string, Rankings["keywords"]>();
  const byUrl = new Map<string, Rankings["keywords"]>();
  const byIntent = new Map<string, Rankings["keywords"]>();
  for (const k of keywords) {
    for (const [m, key] of [
      [bySection, sectionOf(k.url)],
      [byUrl, k.url],
      [byIntent, k.intent ?? "unknown"],
    ] as const)
      m.set(key, [...(m.get(key) ?? []), k]);
  }
  const best = (l: Rankings["keywords"]): Rankings["keywords"][number] =>
    l.toSorted((a, b) => b.etv - a.etv || (a.position ?? 999) - (b.position ?? 999))[0] as Rankings["keywords"][number];
  const etv = (l: Rankings["keywords"]): number => round(l.reduce((s, k) => s + k.etv, 0));
  return {
    sections: [...bySection.entries()]
      .map(([key, l]) => ({
        key,
        keywords: l.length,
        top10: l.filter((k) => k.position !== null && k.position <= 10).length,
        etv: etv(l),
        share: round(etv(l) / total, 2),
        topKeyword: best(l).keyword,
        topUrl: best(l).url,
      }))
      .toSorted((a, b) => b.etv - a.etv || b.keywords - a.keywords),
    pages: [...byUrl.entries()]
      .map(([url, l]) => ({
        url,
        keywords: l.length,
        etv: etv(l),
        bestKeyword: best(l).keyword,
        bestPosition: best(l).position,
      }))
      .toSorted((a, b) => b.etv - a.etv || b.keywords - a.keywords)
      .slice(0, 15),
    intents: [...byIntent.entries()]
      .map(([intent, l]) => ({ intent, keywords: l.length, etv: etv(l) }))
      .toSorted((a, b) => b.etv - a.etv),
  };
}

type Finding = {
  claim: string;
  basis: "observed";
  confidence: "high" | "medium";
  evidenceIds: string[];
  examples: string[];
};
type Step = {
  step: string;
  why: string;
  effort: "S" | "M" | "L";
  impact: "high" | "medium" | "low";
  evidenceIds: string[];
};

/** Evidence-backed summary lines and playbook steps from the ranking data. */
export function rankingFindings(r: Rankings): { summary: Finding[]; playbook: Step[] } {
  const ids = r.evidenceIds;
  const summary: Finding[] = [];
  const playbook: Step[] = [];
  const t = r.totals;
  if (t.rankedKeywords !== null)
    summary.push({
      claim: `Ranks for ${t.rankedKeywords} Google keywords (US), ${t.top10 ?? "?"} in the top 10 and ${t.top3 ?? "?"} in the top 3, for an estimated ${t.estTrafficMonthly ?? "?"} organic visits a month.`,
      basis: "observed",
      confidence: "high",
      evidenceIds: ids,
      examples: [],
    });
  const top = r.sections[0];
  if (top)
    summary.push({
      claim: `Traffic comes mostly from ${top.key} (${Math.round(top.share * 100)}% of sampled traffic, ${top.keywords} keywords; best: "${top.topKeyword}").${r.sections[1] ? ` Next: ${r.sections[1].key} (${Math.round(r.sections[1].share * 100)}%).` : ""}`,
      basis: "observed",
      confidence: "high",
      evidenceIds: ids,
      examples: [top.topUrl],
    });
  if (r.keywords.length)
    summary.push({
      claim: `Biggest keywords by traffic: ${r.keywords
        .slice(0, 5)
        .map((k) => `"${k.keyword}" (#${k.position ?? "?"}, ${k.volume ?? "?"}/mo)`)
        .join(", ")}.`,
      basis: "observed",
      confidence: "high",
      evidenceIds: ids,
      examples: r.keywords.slice(0, 3).map((k) => k.url),
    });
  if (r.competitors.length)
    summary.push({
      claim: `Closest organic competitors by shared keywords: ${r.competitors
        .slice(0, 5)
        .map((c) => `${c.domain} (${c.sharedKeywords})`)
        .join(", ")}.`,
      basis: "observed",
      confidence: "medium",
      evidenceIds: ids,
      examples: [],
    });
  if (r.backlinks)
    summary.push({
      claim: `Backlinks: ${r.backlinks.backlinks ?? "?"} from ${r.backlinks.referringDomains ?? "?"} referring domains (DataForSEO rank ${r.backlinks.rank ?? "?"}).`,
      basis: "observed",
      confidence: "high",
      evidenceIds: ids,
      examples: [],
    });
  const strikingDistance = r.keywords.filter(
    (k) => k.position !== null && k.position >= 4 && k.position <= 20 && (k.volume ?? 0) >= 100,
  );
  if (strikingDistance.length)
    playbook.push({
      step: `Target their page-two keywords: ${strikingDistance
        .slice(0, 3)
        .map((k) => `"${k.keyword}"`)
        .join(", ")}`,
      why: `${strikingDistance.length} keywords with 100+ searches where they sit at #4-20, so the top spots are not locked.`,
      effort: "M",
      impact: "high",
      evidenceIds: ids,
    });
  if (top && top.share >= 0.3)
    playbook.push({
      step: `Compete for the ${top.key} traffic with better pages`,
      why: `${Math.round(top.share * 100)}% of their sampled traffic lands there.`,
      effort: "L",
      impact: "high",
      evidenceIds: ids,
    });
  return { summary, playbook };
}
