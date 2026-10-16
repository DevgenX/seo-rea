// Markdown for report/reverse.md.

import type { ReverseReport } from "../reverse/schema.js";
import { cell, ids } from "../util.js";

const ev = (list: string[]): string => (list.length ? ` [${ids(list)}]` : "");
const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function renderReverse(r: ReverseReport): string {
  const c = r.coverage;
  const L: string[] = [
    `# Reverse engineering: ${r.domain}`,
    "",
    `Run ${r.runId} - seo-rea ${r.toolVersion} - ${c.pagesCrawled} pages crawled (${c.indexablePages} indexable${c.crawlComplete ? ", complete" : ", partial"}) - cost ${r.cost.usd.toFixed(2)} USD`,
    "",
    "## 1. The strategy in brief",
    "",
    ...r.summary.map((s) => `- _(${s.basis}, ${s.confidence})_ ${s.claim}${ev(s.evidenceIds)}`),
    "",
    "## 2. Target topics",
    "",
    "| Term | Pages | In titles | Example |",
    "|---|---|---|---|",
    ...r.keywords.map((k) => `| ${cell(k.term)} | ${k.pages} | ${k.inTitles} | ${cell(k.examples[0] ?? "")} |`),
    "",
    "## 3. Content architecture",
    "",
    "| Cluster | Pages | Share | Main template | Avg words | Schema | Top terms | Hub |",
    "|---|---|---|---|---|---|---|---|",
    ...r.clusters.map(
      (x) =>
        `| ${cell(x.key)} | ${x.pages} | ${pct(x.share)} | ${x.template} | ${x.avgWords} | ${cell(x.schemaTypes.join(", ")) || "-"} | ${cell(x.topTerms.join(", ")) || "-"} | ${cell(x.hub ?? "-")} |`,
    ),
    "",
    "| Template | Pages | Avg words | Example |",
    "|---|---|---|---|",
    ...r.templates.map((t) => `| ${t.type} | ${t.pages} | ${t.avgWords} | ${cell(t.examples[0] ?? "")} |`),
    "",
  ];
  if (r.programmatic.length) {
    L.push("Programmatic patterns:", "", "| Pattern | Pages | Titles | Example |", "|---|---|---|---|");
    for (const p of r.programmatic)
      L.push(`| ${cell(p.pattern)} | ${p.pages} | ${cell(p.titlePattern)} | ${cell(p.examples[0] ?? "")} |`);
    L.push("");
  }
  const k = r.linking;
  L.push(
    "## 4. Internal linking",
    "",
    `Average ${k.avgInternalLinks} internal links per page; ${k.globalLinks.length} sitewide links; ${k.orphanPages} orphan and ${k.deepPages} deep (4+ clicks) pages.`,
    "",
    "| Hub | Internal PageRank | Inlinks |",
    "|---|---|---|",
    ...k.hubs.map((h) => `| ${cell(h.url)} | ${h.pagerank} | ${h.inlinks} |`),
    "",
    "## 5. Authority and link signals (free)",
    "",
    `Tranco rank: ${r.offpage.trancoRank ?? "not listed / unknown"}; Wikipedia articles linking: ${r.offpage.wikipediaLinkingPages ?? "unknown"}; Wikipedia mentions: ${r.offpage.wikipediaMentions ?? "unknown"}; Common Crawl index pages: ${r.offpage.commonCrawlPages ?? "unknown"}.${ev(r.offpage.evidenceIds)}`,
    "",
    "Most-linked outbound domains: " +
      (r.offpage.outboundDomains.map((d) => `${d.domain} (${d.pages})`).join(", ") || "none"),
    "",
    "## 6. Structured data",
    "",
    "| Type | Pages | Share |",
    "|---|---|---|",
    ...r.schema.map((s) => `| ${s.type} | ${s.pages} | ${pct(s.share)} |`),
    "",
    "## 7. AEO tactics",
    "",
    `- llms.txt: ${r.aeo.llmsTxt.present ? (r.aeo.llmsTxt.valid ? `valid, ${r.aeo.llmsTxt.links} links` : "present, invalid") : "absent"}; llms-full.txt: ${r.aeo.llmsFullTxt ? "present" : "absent"}${ev(r.aeo.evidenceIds)}`,
    `- AI crawlers: ${r.aeo.aiCrawlers.map((x) => `${x.token} ${x.access}`).join(", ") || "not checked"}`,
    `- FAQPage on ${r.aeo.faqPages} page(s), HowTo on ${r.aeo.howToPages}; ${r.aeo.questionTitles} question-style titles`,
    `- ${pct(r.aeo.rawHtmlReadableShare)} of indexable pages have 200+ words without JavaScript`,
    "",
    "## 8. Publishing cadence",
    "",
    r.cadence.datedPages
      ? `${r.cadence.datedPages} dated pages from ${r.cadence.first.slice(0, 10)} to ${r.cadence.last.slice(0, 10)}; ${r.cadence.last90Days} in the last 90 days, ${r.cadence.last365Days} in the last year; median gap ${r.cadence.medianGapDays ?? "n/a"} days; ${r.cadence.updatedLast90Days} updated in the last 90 days.`
      : "No publish dates in page metadata.",
    "",
  );
  if (r.cadence.perMonth.length) {
    L.push("| Month | Pages |", "|---|---|", ...r.cadence.perMonth.map((m) => `| ${m.month} | ${m.pages} |`), "");
  }
  L.push(
    "## 9. Tech stack",
    "",
    r.tech.map((t) => `${t.name} (${t.pages})`).join(", ") || "No fingerprints found.",
    "",
    "## 10. Playbook: what to copy",
    "",
    "| Step | Why | Effort | Impact | Evidence |",
    "|---|---|---|---|---|",
    ...r.playbook.map(
      (p) => `| ${cell(p.step)} | ${cell(p.why)} | ${p.effort} | ${p.impact} | ${ids(p.evidenceIds)} |`,
    ),
    "",
    ...renderRankings(r),
    "## Unknowns",
    "",
    ...r.unknowns.map((u) => `- ${u}`),
    "",
    `Evidence: [${r.evidenceIndex}](../${r.evidenceIndex}). Crawl: [${r.coverage.crawlReport}](../${r.coverage.crawlReport}).`,
    "",
  );
  return L.join("\n");
}

function renderRankings(r: ReverseReport): string[] {
  const k = r.rankings;
  if (!k) return [];
  const t = k.totals;
  const L = [
    "## 11. What it actually ranks for (DataForSEO, paid)",
    "",
    `${t.rankedKeywords ?? "?"} ranked keywords (Google, location ${k.locationCode}, ${k.languageCode}); ${t.top10 ?? "?"} in the top 10, ${t.top3 ?? "?"} in the top 3; est. ${t.estTrafficMonthly ?? "?"} visits/month. Cost: estimated $${k.cost.estimateUsd.toFixed(4)}, actual $${k.cost.actualUsd.toFixed(4)} (${k.cost.calls} paid call(s), ${k.cost.fromCache} from cache).${ev(k.evidenceIds)}`,
    "",
    "| Keyword | Pos | Volume | Est. visits | Intent | URL |",
    "|---|---|---|---|---|---|",
    ...k.keywords
      .slice(0, 25)
      .map(
        (x) =>
          `| ${cell(x.keyword)} | ${x.position ?? "-"} | ${x.volume ?? "-"} | ${x.etv} | ${x.intent ?? "-"} | ${cell(x.url)} |`,
      ),
    "",
    "| Section | Keywords | Top 10 | Est. visits | Share | Best keyword |",
    "|---|---|---|---|---|---|",
    ...k.sections.map(
      (x) => `| ${cell(x.key)} | ${x.keywords} | ${x.top10} | ${x.etv} | ${pct(x.share)} | ${cell(x.topKeyword)} |`,
    ),
    "",
    "| Page | Keywords | Est. visits | Best keyword | Pos |",
    "|---|---|---|---|---|",
    ...k.pages.map(
      (x) => `| ${cell(x.url)} | ${x.keywords} | ${x.etv} | ${cell(x.bestKeyword)} | ${x.bestPosition ?? "-"} |`,
    ),
    "",
  ];
  if (k.intents.length) L.push(`Intent mix: ${k.intents.map((i) => `${i.intent} ${i.keywords}`).join(", ")}.`, "");
  if (k.competitors.length) {
    L.push("| Competitor | Shared keywords | Avg pos | Ranked keywords | Est. visits |", "|---|---|---|---|---|");
    for (const c of k.competitors)
      L.push(
        `| ${c.domain} | ${c.sharedKeywords} | ${c.avgPosition ?? "-"} | ${c.rankedKeywords ?? "-"} | ${c.estTrafficMonthly ?? "-"} |`,
      );
    L.push("");
  }
  if (k.backlinks) {
    const b = k.backlinks;
    L.push(
      `Backlinks: ${b.backlinks ?? "?"} from ${b.referringDomains ?? "?"} referring domains (${b.referringMainDomains ?? "?"} main, ${b.nofollowReferringDomains ?? "?"} nofollow); rank ${b.rank ?? "?"}; ${b.brokenBacklinks ?? "?"} broken.`,
      "",
    );
  }
  if (k.notes.length) L.push(...k.notes.map((n) => `- ${n}`), "");
  return L;
}
