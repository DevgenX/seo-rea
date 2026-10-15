// Renders report/strategy.md from strategy.json. Only renders what is in the data.

import { cell, ids } from "../util.js";
import type { Pillars, PlaybookStep, SiteStrategy, Strategy } from "../strategy/schema.js";
import { renderTopActions } from "./actions.js";

const e = (list: string[]): string => ids(list) || "-";
const pct = (x: number | null): string => (x === null ? "unknown" : `${Math.round(x * 100)}%`);
const v = (x: number | null | undefined, unit = ""): string =>
  x === null || x === undefined ? "unknown" : `${x.toLocaleString("en-US")}${unit}`;
/** Path for the site's own host; host + path for subdomains and other sites. */
const path = (u: string, domain = ""): string => {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\./, "");
    return `${domain && host === domain ? "" : host}${x.pathname || "/"}`;
  } catch {
    return u;
  }
};

function order(d: Strategy): SiteStrategy[] {
  return d.sites.toSorted((a, b) => (a.domain === d.roles.leader ? -1 : b.domain === d.roles.leader ? 1 : 0));
}

const roleOf = (d: Strategy, s: SiteStrategy): string =>
  d.roles.challenger ? (s.domain === d.roles.leader ? "leader" : "challenger") : "subject";

function snapshot(d: Strategy, s: SiteStrategy): string[] {
  const n = s.snapshot;
  const L = [`### ${s.domain} (${roleOf(d, s)})`, ""];
  if (s.error) L.push(`Fetch problem: ${s.error}`, "");
  L.push(
    `- **What it is** (observed, ${n.whatItIs.why}): ${cell(n.whatItIs.value)} [${e(n.whatItIs.evidenceIds)}]`,
    `- **Homepage title / H1**: ${cell(n.title) || "(none)"} / ${cell(n.h1) || "(none)"} [${e(n.evidenceIds)}]`,
  );
  for (const m of n.businessModel)
    L.push(`- **Business model** (${m.basis}): ${m.value}; ${m.why} [${e(m.evidenceIds)}]`);
  if (!n.businessModel.length)
    L.push("- **Business model**: no signal found (no store links, paid-tier paths or disclosures)");
  for (const a of n.audiences) L.push(`- **Audience** (${a.basis}): ${cell(a.value)}; ${a.why} [${e(a.evidenceIds)}]`);
  return [...L, ""];
}

function clusterMap(s: SiteStrategy): string[] {
  const m = s.map;
  const L = [
    `### ${s.domain}`,
    "",
    `${v(m.knownUrls)} known URLs from ${m.sitemapFiles} sitemap file(s)${m.indexChildren ? ` (sitemap indexes list ${m.indexChildren} child sitemaps)` : ""} plus homepage navigation; ${m.mappedUrls} mapped in detail, ${m.pagesFetched} pages fetched${m.robotsSkipped ? `, ${m.robotsSkipped} skipped by robots.txt` : ""}. [${e(m.evidenceIds)}]`,
    "",
  ];
  if (m.childStems.length)
    L.push(`Sitemap index by type: ${m.childStems.map((x) => `${x.stem} (${x.files})`).join(", ")}.`, "");
  if (!m.clusters.length) return [...L, "No URLs found to cluster.", ""];
  L.push(
    "| Cluster | URLs | Template | Fetched | Median words | Links/page | Inlinks | Hub pages | Themes | Example |",
    "|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const c of m.clusters.slice(0, 20))
    L.push(
      `| ${cell(c.key)} | ${c.urlCount} | ${c.template}${c.template === "programmatic" ? ` (${c.baseTemplate})` : ""} | ${c.fetchedPages} | ${v(c.medianWords)} | ${v(c.linkDensity)} | ${c.inlinks} | ${cell(c.hubs.map((h) => `${path(h.url, s.domain)} (${h.linksIntoCluster})`).join(", ")) || "-"} | ${cell(c.terms.slice(0, 3).join(", ")) || "-"} | ${cell(path(c.exampleUrls[0] ?? "", s.domain))} |`,
    );
  if (m.clusters.length > 20) L.push("", `${m.clusters.length - 20} smaller clusters in strategy.json.`);
  const prog = m.clusters.filter((c) => c.programmatic);
  L.push("");
  if (prog.length)
    for (const c of prog) {
      const g = c.programmatic as NonNullable<typeof c.programmatic>;
      L.push(
        `- **Programmatic** (inferred): ${c.key} - ${c.urlCount} URLs, ${Math.round(g.share * 100)}% match \`${g.pattern}\` (${g.basis}${g.headingSimilarity !== null ? `, H2 overlap ${g.headingSimilarity}` : ""}). [${e(m.evidenceIds)}]`,
      );
    }
  else L.push("- No programmatic pattern (15+ URLs on one slug pattern, id scheme or identical headings) found.");
  return [...L, ""];
}

function keywords(d: Strategy, s: SiteStrategy): string[] {
  const k = s.keywords;
  const L = [
    `### ${s.domain}`,
    "",
    `Head terms derived from ${s.domain}'s own titles, H1s, slugs and cluster themes (inferred target set). ${k.rankedTop10}/${k.checked} checked terms rank top 10; ${k.unknown} unknown (SERP blocked).`,
    "",
  ];
  if (!k.terms.length) return [...L, "No head terms could be derived (too few titles or URLs).", ""];
  L.push("| Term | Docs | Rank | Engine | Top 3 on that SERP | Evidence |", "|---|---|---|---|---|---|");
  for (const t of k.terms) {
    const c = d.serp.checks.find((x) => x.term === t.term && x.kind === "head-term");
    const top =
      c && c.status === "used"
        ? c.results
            .slice(0, 3)
            .map((r) => `${r.position}. ${r.domain}`)
            .join(", ")
        : "-";
    const rank =
      t.check.status === "ranked"
        ? `#${t.check.position} ${path(t.check.url, s.domain)}`
        : t.check.status === "unknown"
          ? `unknown${c?.problem ? ` (${cell(c.problem).slice(0, 60)})` : ""}`
          : `not in top ${c?.results.length ?? 10}`;
    L.push(
      `| ${cell(t.term)} | ${t.docs} | ${cell(rank)} | ${t.check.engine || "-"} | ${cell(top)} | ${t.check.evidenceId || "-"} |`,
    );
  }
  return [...L, ""];
}

function pillars(s: SiteStrategy): string[] {
  const p: Pillars = s.pillars;
  const o = p.onPage;
  const t = p.technical;
  const off = p.offPage;
  const a = p.aeo;
  const pd = p.paid;
  const di = p.distribution;
  const L = [`### ${s.domain}`, ""];
  L.push(
    `- **On-page** (observed, ${o.pagesFetched} pages): median title ${v(o.medianTitleLength)} chars; H1 on ${pct(o.h1Coverage)}; meta description on ${pct(o.metaDescriptionCoverage)}; median ${v(o.medianWords)} words and ${v(o.medianH2)} H2s; ${o.datedPages} dated pages, median age ${v(o.medianAgeDays)} days, ${pct(o.updatedWithinYear)} updated within 12 months. [${e(o.evidenceIds.slice(0, 5))}]`,
    `- **Technical** (observed): JSON-LD on ${pct(t.pagesWithSchema)} of pages (${
      t.schemaTypes
        .slice(0, 6)
        .map((x) => `${x.type} ${x.pages}`)
        .join(", ") || "none"
    }); ${t.pagesWithSchemaErrors} page(s) with schema errors${t.schemaErrorSamples.length ? ` (${cell(t.schemaErrorSamples.slice(0, 2).join("; "))})` : ""}; canonical on ${pct(t.canonicalCoverage)} (self ${pct(t.selfCanonical)}); ${t.noindexPages} noindex; robots.txt ${t.robotsFound ? "found" : "missing"}; ${t.sitemapFiles} sitemap file(s), ${v(t.sitemapUrls)} URLs; hreflang on ${t.hreflangPages} page(s), langs ${t.langs.join(", ") || "unset"}; PageSpeed ${t.psi ? `performance ${v(t.psi.performance)}, SEO ${v(t.psi.seo)}, LCP ${t.psi.lcp || "n/a"}` : `not available (${cell(t.psiProblem)})`}; median HTML ${v(t.medianHtmlKb)} KB. [${e(t.evidenceIds.slice(0, 6))}]`,
    `- **Off-page** (observed, free sources): Tranco ${off.trancoRank === null ? "not in top 1M or unavailable" : `#${v(off.trancoRank)}`}; Wikipedia articles linking ${v(off.wikipediaLinkingArticles)}; Wikipedia text mentions ${v(off.wikipediaMentions)}; Common Crawl index blocks ${v(off.commonCrawlBlocks)}; brand SERP third-party domains ${v(off.brandSerpThirdParty)}${off.brandSerpDomains.length ? ` (${off.brandSerpDomains.slice(0, 6).join(", ")})` : ""}; press links on site ${off.pressLinksOnSite}. Unknown: ${off.unknowns.join("; ")}. [${e(off.evidenceIds)}]`,
    `- **AEO** (observed): llms.txt ${a.llmsTxt}; llms-full.txt ${a.llmsFullTxt ? "present" : "absent"}; AI crawlers blocked ${a.blockedCrawlers.join(", ") || "none"} (search bots: ${a.blockedSearchCrawlers.join(", ") || "none"}); FAQPage schema on ${a.faqSchemaPages}, Q&A blocks on ${a.questionBlockPages} page(s); answer-first intros ${pct(a.answerFirstShare)} (inferred); Organization schema ${a.organizationSchema ? `yes, ${a.sameAsCount} sameAs` : "no"}; citations logged ${a.citationsLogged}${a.citationsLogged ? `, cited in ${a.citedIn}` : " (use `seo-rea cite`)"}. [${e(a.evidenceIds)}]`,
    `- **Paid** (observed): ${pd.serpAdsByDomain} own ad(s) across ${pd.serpsChecked} usable SERPs; ${pd.serpsWithAnyAds} SERP(s) showed any ads. Ad libraries: ${pd.adLibraries.map((x) => `${x.platform} ${x.status === "captured" ? `${v(x.visibleCount)} visible` : "manual check"} (${x.evidenceId})`).join("; ") || "none"}.`,
    `- **Distribution** (observed): ${di.channels.map((c) => c.channel).join(", ") || "no owned channels linked"}${di.affiliateDisclosure ? "; affiliate/advertiser disclosure present" : ""}. [${e(di.evidenceIds)}]`,
  );
  return [...L, ""];
}

function drivers(s: SiteStrategy): string[] {
  const L = [`### ${s.domain}`, ""];
  const k = s.keywords;
  if (k.checked >= 3 && k.rankedTop10 === 0)
    L.push(
      `${s.domain} ranks top 10 for 0/${k.checked} of its own checked head terms, so these are assets it has, not proven reasons it ranks.`,
      "",
    );
  if (!s.drivers.length) return [...L, "No driver cleared the evidence threshold (strength 30).", ""];
  if (s.drivers.length < 5) L.push(`Only ${s.drivers.length} driver(s) cleared the evidence threshold.`, "");
  L.push("| # | Driver | Strength | Copy | Basis | Evidence |", "|---|---|---|---|---|---|");
  for (const d of s.drivers)
    L.push(
      `| ${d.rank} | ${cell(d.title)} | ${d.strength} | ${d.copyDifficulty} | ${d.basis} | ${e(d.evidenceIds.slice(0, 4))} |`,
    );
  L.push("");
  for (const d of s.drivers)
    L.push(`${d.rank}. **${cell(d.title)}** - ${cell(d.detail)} How hard to copy: ${d.copyDifficulty}; ${d.copyNote}`);
  return [...L, ""];
}

function steps(list: PlaybookStep[], empty: string): string[] {
  if (!list.length) return [empty, ""];
  const L = ["| Step | Effort | Impact | From | Evidence |", "|---|---|---|---|---|"];
  for (const s of list)
    L.push(`| ${cell(s.step)} | ${s.effort} | ${s.impact} | ${cell(s.why)} | ${e(s.evidenceIds.slice(0, 4))} |`);
  return [...L, ""];
}

function weaknesses(s: SiteStrategy): string[] {
  const L = [`### ${s.domain}`, ""];
  if (!s.weaknesses.length) return [...L, "No weakness triggered by the measured signals.", ""];
  L.push("| Severity | Weakness | Detail | Opening | Evidence |", "|---|---|---|---|---|");
  for (const w of s.weaknesses)
    L.push(
      `| ${w.severity} | ${cell(w.title)} | ${cell(w.detail)} | ${cell(w.opening)} | ${e(w.evidenceIds.slice(0, 4))} |`,
    );
  return [...L, ""];
}

function comparison(d: Strategy): string[] {
  const c = d.comparison;
  if (!c)
    return [
      "Single-domain run. Re-run with `--vs <domain>` for a side-by-side table, cluster gaps and keyword gaps.",
      "",
    ];
  const L = [
    `Leader: **${c.leader}**; challenger: **${c.challenger}**. ${d.roles.basis} [${e(d.roles.evidenceIds.slice(0, 6))}]`,
    "",
    `| Pillar | Metric | ${c.leader} | ${c.challenger} | Edge |`,
    "|---|---|---|---|---|",
    ...c.rows.map((r) => `| ${r.pillar} | ${r.metric} | ${r.leader} | ${r.challenger} | ${r.edge} |`),
    "",
    `**Cluster gaps** (topics ${c.leader} covers that ${c.challenger} has no URL, title or heading for; inferred):`,
    "",
  ];
  if (c.clusterGaps.length) {
    L.push("| Cluster | URLs | Template | Themes | Example | Evidence |", "|---|---|---|---|---|---|");
    for (const g of c.clusterGaps)
      L.push(
        `| ${cell(g.cluster)} | ${g.urlCount} | ${g.template} | ${cell(g.terms.join(", ")) || "-"} | ${cell(path(g.example))} | ${e(g.evidenceIds)} |`,
      );
  } else L.push("None found: every leader cluster has a matching term or path on the challenger.");
  const k = c.keywords;
  L.push(
    "",
    "**Keyword overlap** (checked SERPs, top 10):",
    "",
    `- Both rank: ${k.both.map((t) => `"${t}"`).join(", ") || "none"}`,
    `- Only ${c.leader}: ${k.leaderOnly.map((t) => `"${t}"`).join(", ") || "none"}`,
    `- Only ${c.challenger}: ${k.challengerOnly.map((t) => `"${t}"`).join(", ") || "none"}`,
    `- Neither: ${k.neither.map((t) => `"${t}"`).join(", ") || "none"}`,
    `- Unknown (SERP blocked): ${k.unknown.map((t) => `"${t}"`).join(", ") || "none"}`,
    `- Leader terms absent from ${c.challenger}'s titles and URLs: ${k.termGaps.map((t) => `"${t}"`).join(", ") || "none"}`,
    "",
    `**First moves for ${c.challenger}:**`,
    "",
    ...steps(c.firstMoves, "No moves derived."),
  );
  return L;
}

export function renderStrategy(d: Strategy): string {
  const sites = order(d);
  const title = d.inputs.vs ? `${d.inputs.domain} vs ${d.inputs.vs}` : d.inputs.domain;
  const L: string[] = [
    `# Strategy dossier: ${title}`,
    "",
    `seo-rea ${d.toolVersion}; run ${d.runId}; ${d.timestamps.createdAt}; spent ${d.cost.spentUsd.toFixed(4)} USD of ${d.cost.budgetUsd}. Every claim cites evidence IDs from [evidence/index.md](../evidence/index.md); (observed) means read from a fetched source, (inferred) means derived from those facts.`,
    "",
    `**Roles:** ${d.roles.basis}`,
    "",
    ...renderTopActions(d.topActions).map((l) =>
      l === "## Top 10 actions"
        ? `## Top 10 actions for ${d.actionsFor}`
        : l.startsWith("Ranked by impact")
          ? "Ranked by impact, then effort. Full data: [strategy.json](strategy.json)."
          : l,
    ),
    "## 1. Snapshot",
    "",
    ...sites.flatMap((s) => snapshot(d, s)),
    "## 2. Site and cluster map",
    "",
    ...sites.flatMap(clusterMap),
    "## 3. Keywords and rankings",
    "",
    ...(d.serp.notes.length ? [...d.serp.notes.map((n) => `- ${n}`), ""] : []),
    ...sites.flatMap((s) => keywords(d, s)),
    "## 4. Competitors (co-ranking domains)",
    "",
  ];
  if (d.competitors.length) {
    L.push("| Domain | SERPs shared | Terms | Best | Median | Evidence |", "|---|---|---|---|---|---|");
    for (const c of d.competitors)
      L.push(
        `| ${c.domain}${c.isVs ? " (--vs)" : ""} | ${c.serps} | ${cell(
          c.terms
            .slice(0, 3)
            .map((t) => `"${t}"`)
            .join(", "),
        )} | ${c.bestPosition} | ${c.medianPosition} | ${e(c.evidenceIds.slice(0, 4))} |`,
      );
    L.push("");
  } else L.push("No usable head-term SERP, so no co-ranking domains (see section 3).", "");
  L.push("## 5. Pillars", "", ...sites.flatMap(pillars));
  L.push("## 6. Ranked drivers (why it leads)", "", ...sites.flatMap(drivers));
  L.push(
    "## 7. Copyable playbook",
    "",
    `Steps ${d.roles.challenger ?? "a challenger"} can copy from ${d.roles.leader}, ranked by impact then effort.`,
    "",
    ...steps(d.playbook, "No copyable steps derived."),
  );
  L.push("## 8. Weaknesses and openings", "", ...sites.flatMap(weaknesses));
  L.push(
    `## 9. 30/60/90-day plan for ${d.plan.for}`,
    "",
    "**Days 1-30 (small effort)**",
    "",
    ...steps(d.plan.days30, "Nothing small-effort derived."),
    "**Days 31-60 (medium effort)**",
    "",
    ...steps(d.plan.days60, "Nothing medium-effort derived."),
    "**Days 61-90 (large effort)**",
    "",
    ...steps(d.plan.days90, "Nothing large-effort derived."),
  );
  L.push("## 10. Side-by-side (--vs)", "", ...comparison(d));
  L.push("## Unknowns", "", ...(d.unknowns.length ? d.unknowns.map((u) => `- ${u}`) : ["- none"]), "");
  L.push(
    "Full data: [strategy.json](strategy.json). Run data: [../data/strategy-run.json](../data/strategy-run.json).",
    "",
  );
  return L.join("\n");
}
