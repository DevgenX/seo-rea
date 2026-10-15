// Builds report/strategy.json content from the strategy run data. Pure.

import { issueId } from "../issues.js";
import type { TopAction } from "../dossier.js";
import { actionScore } from "../report/actions.js";
import { assignRoles, clusterGaps, coRankers, keywordOverlap, pillarRows } from "./compare.js";
import { driverCandidates, pathOf, rankDrivers, type DriverCandidate } from "./drivers.js";
import { buildKeywords, buildMap, buildPillars, buildSnapshot, rankFor } from "./pillars.js";
import { STRATEGY_SCHEMA_VERSION, type PlaybookStep, type SiteStrategy, type Strategy } from "./schema.js";
import type { SiteProfile, StrategyRun } from "./types.js";
import { findWeaknesses, type WeaknessFix } from "./weaknesses.js";

const SEV_IMPACT = { high: "high", medium: "medium", low: "low" } as const;
const ids = (list: Array<string | undefined>): string[] => [...new Set(list.filter((x): x is string => !!x))];

interface SiteWork {
  profile: SiteProfile;
  out: SiteStrategy;
  candidates: DriverCandidate[];
  fixes: WeaknessFix[];
}

function siteWork(s: SiteProfile, role: "subject" | "vs", run: StrategyRun, now: Date): SiteWork {
  const keywords = buildKeywords(s, run.serps);
  const pillars = buildPillars(s, run.serps, now);
  const fixes = findWeaknesses(s, pillars, keywords, run.serps);
  return {
    profile: s,
    candidates: driverCandidates({ site: s, pillars, keywords }),
    fixes,
    out: {
      domain: s.domain,
      role,
      error: s.error,
      snapshot: buildSnapshot(s),
      map: buildMap(s),
      keywords,
      pillars,
      drivers: [],
      weaknesses: fixes.map((f) => f.weakness),
    },
  };
}

const byScore = (a: PlaybookStep, b: PlaybookStep): number => actionScore(b) - actionScore(a);

function sortSteps(steps: PlaybookStep[], max: number): PlaybookStep[] {
  const seen = new Set<string>();
  return steps
    .filter((s) => (seen.has(s.step) ? false : (seen.add(s.step), true)))
    .map((s, i) => ({ s, i }))
    .toSorted((a, b) => byScore(a.s, b.s) || a.i - b.i)
    .slice(0, max)
    .map(({ s }) => s);
}

/** Steps a challenger can copy from the leader, plus openings from its weaknesses. */
function playbookFor(
  leader: SiteWork,
  leaderDrivers: DriverCandidate[],
  challenger: SiteWork | null,
  run: StrategyRun,
): PlaybookStep[] {
  const L = leader.profile;
  const steps: PlaybookStep[] = leaderDrivers.map((d) => ({
    step: d.copyStep.step,
    why: `${L.domain} driver #${leaderDrivers.indexOf(d) + 1} (strength ${d.strength}, ${d.copyDifficulty} to copy): ${d.title}`,
    from: d.id,
    effort: d.copyStep.effort,
    impact: d.copyStep.impact,
    evidenceIds: d.evidenceIds,
  }));
  for (const f of leader.fixes.filter((x) => x.weakness.severity !== "low"))
    steps.push({
      step: f.weakness.opening,
      why: `${L.domain} weakness: ${f.weakness.title}`,
      from: f.weakness.id,
      effort: f.fix.effort,
      impact: SEV_IMPACT[f.weakness.severity],
      evidenceIds: f.weakness.evidenceIds,
    });
  if (challenger) {
    const C = challenger.profile;
    for (const g of clusterGaps(L, C).slice(0, 4))
      steps.push({
        step: `Start a ${g.template} cluster on ${g.terms.slice(0, 2).join(" / ") || g.cluster}: ${L.domain} has ${g.urlCount} URLs at ${g.cluster} (e.g. ${pathOf(g.example)}); ${C.domain} has none.`,
        why: "cluster gap",
        from: `gap:${g.cluster}`,
        effort: g.urlCount >= 20 ? "L" : "M",
        impact: g.urlCount >= 10 ? "high" : "medium",
        evidenceIds: g.evidenceIds,
      });
    const kw = keywordOverlap(L, C, run.serps);
    for (const t of kw.leaderOnly.slice(0, 3)) {
      const r = rankFor(t, L.domain, run.serps, L.ownedUrls);
      steps.push({
        step: `Target "${t}": ${L.domain} ranks #${r.position} with ${pathOf(r.url)}; ${C.domain} is not in the top 10.`,
        why: "keyword gap on a checked SERP",
        from: `kw:${t}`,
        effort: "M",
        impact: "high",
        evidenceIds: ids([r.evidenceId]),
      });
    }
    for (const f of challenger.fixes.filter((x) => x.weakness.severity === "high"))
      steps.push({
        step: f.fix.step,
        why: `${C.domain}: ${f.weakness.title}`,
        from: `own:${f.weakness.id}`,
        effort: f.fix.effort,
        impact: f.fix.impact,
        evidenceIds: f.weakness.evidenceIds,
      });
  }
  return sortSteps(steps, 14);
}

const OWNER_DEV = /json-ld|robots|pagespeed|llms|canonical|template|hub|schema|sitemap|extension|html|crawler/i;
const OWNER_CONTENT = /page|write|publish|guide|review|faq|cluster|words|answer|refresh|study|vs /i;
const ownerOf = (s: string): TopAction["owner"] =>
  OWNER_DEV.test(s) ? "dev" : OWNER_CONTENT.test(s) ? "content" : "seo";

function topActionsFrom(steps: Array<PlaybookStep & { owner?: TopAction["owner"] }>): TopAction[] {
  const seen = new Map<string, number>();
  return sortSteps(steps, 10).map((s, i) => {
    const key = s.from || s.step;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return {
      id: issueId("STRATEGY-STEP", n ? `${key}#${n}` : key),
      rank: i + 1,
      title: s.step,
      why: s.why,
      evidenceIds: s.evidenceIds,
      effort: s.effort,
      impact: s.impact,
      owner: (s as { owner?: TopAction["owner"] }).owner ?? ownerOf(s.step),
    };
  });
}

const fixSteps = (w: SiteWork): Array<PlaybookStep & { owner: TopAction["owner"] }> =>
  w.fixes.map((f) => ({
    step: f.fix.step,
    why: `${f.weakness.title}. ${f.weakness.detail}`.trim(),
    from: f.weakness.id,
    effort: f.fix.effort,
    impact: f.fix.impact,
    evidenceIds: f.weakness.evidenceIds,
    owner: f.fix.owner,
  }));

/** One action per unranked head term, naming the page that holds #1. */
function termSteps(w: SiteWork, run: StrategyRun): Array<PlaybookStep & { owner: TopAction["owner"] }> {
  return w.out.keywords.terms
    .filter((t) => t.check.status === "not-in-results")
    .slice(0, 5)
    .map((t) => {
      const c = run.serps.find((x) => x.term === t.term && x.kind === "head-term");
      const top = c?.organic[0];
      const own = t.pages[0] ? ` (closest page now: ${pathOf(t.pages[0])})` : "";
      // A cluster named after the term already exists: make its root the target instead of a new page.
      const slug = t.term.replace(/\s+/g, "-");
      const hub = w.out.map.clusters.find((cl) => cl.key === `/${slug}` && cl.urlCount >= 10);
      return {
        step: hub
          ? `Make ${hub.key} the target page for "${t.term}": exact phrase in its title and H1, linked from the ${hub.urlCount} ${hub.key} URLs`
          : `Build a page that targets "${t.term}"${own}`,
        why: `${w.profile.domain} is not in the ${c?.organic.length ?? 10} results ${c?.engine ?? ""} returned; #1 is ${top ? `${top.domain}${pathOf(top.url)}` : "unknown"}. The phrase appears in ${t.docs} of the site's titles/H1s/slugs.`,
        from: `kw:${t.term}`,
        effort: "M" as const,
        impact: "high" as const,
        evidenceIds: ids([
          t.check.evidenceId,
          ...t.pages.map((u) => w.profile.pages.find((p) => p.url === u)?.evidenceId),
        ]),
        owner: "content" as const,
      };
    });
}

export function buildStrategy(run: StrategyRun, writtenAt: Date): Strategy {
  const now = new Date(run.createdAt);
  const works = run.sites.map((s, i) => siteWork(s, i === 0 ? "subject" : "vs", run, now));
  const roles = assignRoles(run.sites, run.serps);
  const leaderW = works.find((w) => w.profile === roles.leader) as SiteWork;
  const challW = roles.challenger ? (works.find((w) => w.profile === roles.challenger) ?? null) : null;

  const ranked = new Map<SiteWork, DriverCandidate[]>();
  for (const w of works) {
    const rival = works.find((x) => x !== w);
    const r = rankDrivers(w.candidates, rival?.candidates ?? [], rival?.profile.domain ?? "");
    w.out.drivers = r.drivers;
    ranked.set(w, r.candidates);
  }
  const playbook = playbookFor(leaderW, ranked.get(leaderW) ?? [], challW, run);
  const planFor = challW?.profile.domain ?? `a challenger to ${leaderW.profile.domain}`;
  const take = (e: PlaybookStep["effort"]): PlaybookStep[] => playbook.filter((s) => s.effort === e).slice(0, 5);
  const actionsFor = challW ? challW.profile.domain : leaderW.profile.domain;
  const topActions = challW
    ? topActionsFrom([...playbook, ...fixSteps(challW)])
    : topActionsFrom([...termSteps(leaderW, run), ...fixSteps(leaderW).filter((f) => f.from !== "unranked-terms")]);

  let comparison: Strategy["comparison"] = null;
  if (challW) {
    const L = leaderW.profile;
    const C = challW.profile;
    comparison = {
      leader: L.domain,
      challenger: C.domain,
      rows: pillarRows(leaderW.out, challW.out),
      clusterGaps: clusterGaps(L, C),
      keywords: keywordOverlap(L, C, run.serps),
      firstMoves: playbook
        .filter((s) => s.from.startsWith("gap:") || s.from.startsWith("kw:") || s.from.startsWith("own:"))
        .slice(0, 3)
        .concat(
          playbook
            .filter((s) => !s.from.startsWith("gap:") && !s.from.startsWith("kw:") && !s.from.startsWith("own:"))
            .slice(0, 2),
        ),
    };
  }

  const serpChecks: Strategy["serp"]["checks"] = run.serps.map((c) => ({
    term: c.term,
    kind: c.kind,
    from: c.from,
    engine: c.engine,
    status: c.problem ? "blocked" : "used",
    problem: c.problem,
    evidenceId: c.evidenceId,
    results: c.organic.slice(0, 10).map((r) => ({ position: r.position, domain: r.domain, url: r.url })),
    adDomains: [...new Set(c.ads.map((a) => a.domain))],
  }));
  const blocked = run.serps.filter((c) => c.problem);
  const unknowns = [...run.unknowns];
  if (blocked.length)
    unknowns.push(
      `${blocked.length}/${run.serps.length} SERP checks were blocked or degraded; rankings for ${blocked
        .slice(0, 5)
        .map((c) => `"${c.term}"`)
        .join(", ")} are unknown`,
    );
  for (const w of works) for (const u of w.out.pillars.offPage.unknowns) unknowns.push(`${w.profile.domain}: ${u}`);

  return {
    schemaVersion: STRATEGY_SCHEMA_VERSION,
    tool: "seo-rea",
    toolVersion: run.version,
    kind: "strategy",
    runId: run.runId,
    inputs: { domain: run.subject, vs: run.vs, budgetUsd: run.budgetUsd },
    timestamps: { createdAt: run.createdAt, writtenAt: writtenAt.toISOString() },
    cost: { spentUsd: run.spentUsd, budgetUsd: run.budgetUsd },
    roles: {
      leader: roles.leader.domain,
      challenger: roles.challenger?.domain ?? null,
      basis: roles.basis,
      evidenceIds: ids(roles.evidenceIds),
    },
    actionsFor,
    topActions,
    sites: works.map((w) => w.out),
    serp: { checks: serpChecks, notes: run.serpNotes },
    competitors: coRankers(run.sites, run.serps, run.vs),
    playbook,
    plan: { for: planFor, days30: take("S"), days60: take("M"), days90: take("L") },
    comparison,
    unknowns: [...new Set(unknowns)],
    evidenceIndex: "evidence/index.json",
  };
}
