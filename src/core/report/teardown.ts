// Renders teardown.md, ledger.md and questions.md from a teardown run.

import type { TeardownRun } from "../run.js";
import type { Claim } from "../types.js";
import { cell, ids, isDomainOrSub, median } from "../util.js";
import { analysed, buildClaims, buildPlaybook, schemaFrequency, titleHasKeyword, type PlaybookItem } from "./claims.js";
import { aiReadinessSection, renderLedgerTable, schemaTable, type SchemaRow } from "./sections.js";

export function renderLedger(run: TeardownRun, claims: Claim[]): string {
  return [
    `# Finding ledger: "${run.keyword}" vs ${run.target.domain}`,
    "",
    `Run ${run.runId}. Evidence IDs refer to [../evidence/index.md](../evidence/index.md).`,
    "",
    ...renderLedgerTable(claims),
    "",
  ].join("\n");
}

export function questionList(run: TeardownRun): string[] {
  return [
    `Who ranks for "${run.keyword}" and why do they win?`,
    `Does ${run.target.domain} rank for "${run.keyword}"?`,
    "What on-page, schema and structure patterns do the winners share?",
    `Is ${run.target.domain} ready for AI search (AI crawlers, llms.txt, valid schema, speed)?`,
    `Which competitor keywords is ${run.target.domain} missing?`,
    "What ads do the target and competitors run?",
    "Which pages get cited by AI answers?",
  ];
}

export function questionStatus(run: TeardownRun): string[] {
  const comps = analysed(run).length;
  const capturedAds = run.ads.filter((a) => a.status === "captured").length;
  return [
    run.serp.organic.length && comps ? "partial (backlinks not collected)" : "unresolved",
    run.serp.organic.length ? "answered within the search boundary" : "unresolved",
    comps ? "answered" : "unresolved",
    run.aiReadiness
      ? run.aiReadiness.perf.some((p) => p.ok)
        ? "answered"
        : "partial (no page-speed data)"
      : "unresolved",
    run.keywordGap.length ? "partial (no volume data on the free tier)" : "unresolved",
    capturedAds
      ? "partial (visible counts only; creatives need a manual check)"
      : "unresolved (ad libraries need a manual check)",
    run.citations.length ? "partial (recorded prompts only)" : "unresolved (no answers recorded yet)",
  ];
}

export function renderQuestions(run: TeardownRun): string {
  const status = run.finished ? questionStatus(run) : [];
  return [
    `# Questions: "${run.keyword}" vs ${run.target.domain}`,
    "",
    ...questionList(run).map((q, i) => `${i + 1}. ${q}${status[i] ? ` - **${status[i]}**` : ""}`),
    "",
  ].join("\n");
}

function summary(run: TeardownRun, claims: Claim[]): string[] {
  const out: string[] = [];
  const comps = analysed(run);
  const tHome = run.target.pages[0];
  const find = (pred: (c: Claim) => boolean): Claim | undefined => claims.find(pred);
  const intent = find((c) => c.claim.startsWith("Search intent"));
  if (intent)
    out.push(
      `*(inferred)* ${intent.claim}. Results for this query reward roundup and comparison content, not product homepages. [${ids(intent.evidence)}]`,
    );
  if (comps.length) {
    const cids = ids(comps.map((c) => c.evidenceId));
    out.push(
      `Depth: ranking pages run a median ${median(comps.map((c) => c.page.wordCount))} words vs ${tHome?.wordCount ?? "n/a"} on the ${run.target.domain} homepage. [${cids}]`,
    );
    out.push(
      `Relevance: ${comps.filter((c) => titleHasKeyword(c.page.title, run.keyword)).length}/${comps.length} ranking pages put every keyword term in the title. [${cids}]`,
    );
    const types = schemaFrequency(comps).slice(0, 3);
    if (types.length)
      out.push(
        `Structured data: most common types are ${types.map((t) => `${t.type} (${t.count}/${comps.length})`).join(", ")}. [${cids}]`,
      );
  }
  const ranked = find((c) => c.claim.includes(run.target.domain) && /ranks #|does not appear/.test(c.claim));
  if (ranked) out.push(`${ranked.claim} (${ranked.boundary}). [${ids(ranked.evidence)}]`);
  const ai = run.aiReadiness;
  if (ai) {
    const blocked = ai.crawlers.filter((c) => c.access === "blocked").length;
    out.push(
      `AI readiness: ${blocked ? `${blocked} AI crawler(s) blocked` : "no AI crawler blocked"}; llms.txt ${ai.llmsTxt.present ? (ai.llmsTxt.valid ? "valid" : "invalid") : "absent"}. [${ids([ai.crawlerEvidenceId, ...ai.llmsEvidenceIds])}]`,
    );
  }
  return out.length ? out.slice(0, 6).map((s) => `- ${s}`) : ["- Not enough data collected to explain rankings."];
}

function serpMap(run: TeardownRun): string[] {
  const L = ["| Path | Engine | Status | Consent | Organic | Ads | Evidence |", "|---|---|---|---|---|---|---|"];
  for (const e of run.serp.attempts) {
    const status = e.problem
      ? `not used: ${cell(e.problem)}`
      : `used (HTTP ${e.status}${e.fromCache ? ", cache" : ""}, relevance ${Math.round(e.relevance * 100)}%)`;
    L.push(
      `| ${e.adapter} | ${e.label} | ${status} | ${cell(e.consent ?? "-")} | ${e.organicCount} | ${e.adCount} | ${e.evidenceId} |`,
    );
  }
  if (!run.serp.attempts.length) L.push("| - | - | no SERP attempts | - | 0 | 0 | - |");
  L.push("");
  for (const n of run.serp.notes) L.push(`- ${n}`);
  if (run.browserUserAgent)
    L.push(`- Headless Chromium user agent: \`${run.browserUserAgent}\`; at least 3 s between requests to one host.`);
  L.push("", `Primary ranking list from **${run.serp.primaryLabel || "none"}** [${run.serp.parsedEvidenceId}]:`, "");
  if (run.serp.organic.length) {
    L.push("| # | Domain | Title | URL |", "|---|---|---|---|");
    for (const r of run.serp.organic) {
      const title = r.title || run.competitors.find((c) => c.url === r.url)?.page?.title || "";
      L.push(
        `| ${r.position} | ${r.domain}${isDomainOrSub(r.domain, run.target.domain) ? " **(target)**" : ""} | ${cell(title)} | ${r.url} |`,
      );
    }
  } else L.push("No organic results collected.");
  if (run.serp.ads.length) {
    L.push("", "Search ads observed:", "");
    for (const a of run.serp.ads) L.push(`- ${a.engine}: ${cell(a.title)} - ${a.url}`);
  }
  if (run.serp.features?.length) L.push("", `SERP features (paid API): ${run.serp.features.join(", ")}`);
  L.push("", "AI Overviews and AI answers are not scraped; log them with `seo-rea cite` (section 7).", "");
  return L;
}

function competitorCards(run: TeardownRun): string[] {
  const L: string[] = [];
  for (const c of run.competitors) {
    L.push(`### #${c.position} ${c.domain}`, "", `URL: ${c.url} | Evidence: ${c.evidenceId}`, "");
    if (!c.page) {
      L.push(`Not analysed: ${c.error}`, "");
      continue;
    }
    const p = c.page;
    const bad = p.schema.nodes.filter((n) => !n.valid).length;
    L.push(
      `- Title: ${cell(p.title) || "(none)"} (${p.title.length} chars)`,
      `- Meta description: ${cell(p.metaDescription) || "(none)"}`,
      `- H1: ${cell(p.headings.h1.join(" / ")) || "(none)"}`,
      `- Structure: ${p.headings.h2.length} H2, ${p.headings.h3.length} H3, ${p.wordCount} words`,
      `- Top H2s: ${cell(p.headings.h2.slice(0, 6).join(" / ")) || "(none)"}`,
      `- Schema (JSON-LD): ${p.schemaTypes.join(", ") || "none"}${p.schema.blocks ? ` - ${p.schema.nodes.length} checked, ${bad} with errors${p.schema.parseErrors.length ? `, ${p.schema.parseErrors.length} unparseable` : ""}` : ""}`,
      `- Canonical: ${p.canonical || "(none)"}${p.canonical && p.canonical.replace(/\/$/, "") !== c.url.replace(/\/$/, "") ? " (differs from URL)" : ""}`,
      `- Internal links: ${p.internalLinkCount}; external links: ${p.externalLinkCount}`,
      `- Top internal anchors: ${
        cell(
          p.topAnchors
            .slice(0, 6)
            .map((a) => `"${a.anchor}" x${a.count}`)
            .join(", "),
        ) || "(none)"
      }`,
      `- robots.txt: ${c.robots ? `HTTP ${c.robots.status}, ${c.robots.sitemaps.length} sitemap(s) declared` : "not fetched"}`,
      "- Backlinks: not collected (see unknowns)",
      "",
    );
  }
  const t = run.target;
  const tHome = t.pages[0];
  L.push(`### Target: ${t.domain}`, "");
  if (tHome) {
    L.push(
      `- Homepage title: ${cell(tHome.title) || "(none)"}`,
      `- Meta description: ${cell(tHome.metaDescription) || "(none)"}`,
      `- H1: ${cell(tHome.headings.h1.join(" / ")) || "(none)"}; ${tHome.headings.h2.length} H2; ${tHome.wordCount} words`,
      `- Schema (all crawled pages): ${t.schemaTypes.join(", ") || "none"}`,
      `- Pages crawled: ${t.pages.length}; sitemap URLs: ${t.sitemap.urlCount}`,
      `- Most-linked internal pages: ${
        cell(
          t.inlinks
            .slice(0, 5)
            .map((l) => `${l.path} (${l.count})`)
            .join(", "),
        ) || "(none)"
      }`,
      `- Top phrases: ${
        t.topKeywords
          .slice(0, 10)
          .map((k) => k.phrase)
          .join(", ") || "(none)"
      }`,
      `- Evidence: ${ids([t.homeEvidenceId, t.crawlEvidenceId, t.robotsEvidenceId, t.sitemap.evidenceId])}`,
      "",
    );
  } else L.push(`Target homepage could not be fetched: ${t.error ?? "unknown error"}`, "");
  return L;
}

export function teardownSchemaRows(run: TeardownRun): SchemaRow[] {
  const rows: SchemaRow[] = analysed(run).map((c) => ({
    label: `#${c.position} ${c.domain}`,
    url: c.url,
    evidenceId: c.evidenceId,
    blocks: c.page.schema.blocks,
    parseErrors: c.page.schema.parseErrors,
    nodes: c.page.schema.nodes,
  }));
  for (const p of run.target.pages) {
    let path = p.url;
    try {
      path = new URL(p.url).pathname;
    } catch {
      // keep full URL
    }
    rows.push({
      label: `target ${path}`,
      url: p.url,
      evidenceId: run.target.crawlEvidenceId,
      blocks: p.schema.blocks,
      parseErrors: p.schema.parseErrors,
      nodes: p.schema.nodes,
    });
  }
  return rows;
}

function adsSection(run: TeardownRun): string[] {
  const L = [
    `SERP ads observed: ${run.serp.ads.length}. Ad libraries:`,
    "",
    "| Advertiser | Platform | Status | Visible count | Note | Lookup | Evidence |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const a of run.ads) {
    L.push(
      `| ${a.domain || a.brand} | ${a.platform} | ${a.status} | ${a.visibleCount ?? "-"} | ${cell(a.note)} | ${a.url} | ${ids([a.evidenceId, a.screenshotEvidenceId])} |`,
    );
  }
  L.push(
    "",
    "Record what you find (count, run dates, hooks, offers, landing pages) as notes next to the evidence ID.",
    "",
  );
  return L;
}

export function renderTeardown(
  run: TeardownRun,
  claims: Claim[] = buildClaims(run),
  playbook: PlaybookItem[] = buildPlaybook(run),
): string {
  const L: string[] = [];
  L.push(`# SEO teardown: "${run.keyword}" vs ${run.target.domain}`, "");
  L.push(
    `Run ${run.runId} on ${run.createdAt} with seo-rea ${run.version}. Paid budget ${run.budgetUsd} USD, spent ${run.spentUsd.toFixed(4)} USD. Evidence: [evidence/index.md](../evidence/index.md). Ledger: [ledger.md](ledger.md).`,
    "",
  );
  L.push("Observed facts cite Evidence IDs. Lines marked *(inferred)* are interpretations.", "");
  L.push("## 1. Summary: why the winners win", "", ...summary(run, claims), "");
  L.push("## 2. SERP map (what each engine did)", "", ...serpMap(run));
  L.push("## 3. Competitor cards", "", ...competitorCards(run));
  L.push(
    "## 4. Schema validation",
    "",
    "Required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo and LocalBusiness (and their common subtypes). Other types are listed but not checked.",
    "",
  );
  L.push(...schemaTable(teardownSchemaRows(run)), "");
  L.push(
    "## 5. AI-search readiness (target)",
    "",
    ...aiReadinessSection(run.aiReadiness, run.target.domain, run.target.robotsEvidenceId),
  );
  L.push("## 6. Keyword gap (top 30)", "");
  L.push(
    `Phrases used by ranking pages and absent from ${run.target.pages.length} crawled ${run.target.domain} pages. Ranked by competitors using them, then TF-IDF weighted by phrase length (title/meta/headings count 3x). No search volume on the free tier.`,
    "",
  );
  if (run.paidKeywords.length)
    L.push(
      `Paid ranked-keyword data: ${run.paidKeywords.map((p) => `${p.domain} (${p.keywords.length} keywords, ${p.evidenceId})`).join(", ")}`,
      "",
    );
  if (run.keywordGap.length) {
    L.push("| # | Phrase | Competitors using | TF-IDF | Weighted count |", "|---|---|---|---|---|");
    run.keywordGap
      .slice(0, 30)
      .forEach((k, i) => L.push(`| ${i + 1} | ${k.phrase} | ${k.competitors} | ${k.tfidf} | ${k.score} |`));
  } else L.push("No gap computed (needs fetched competitor and target pages).");
  L.push("", "## 7. AI-citation table", "");
  if (run.citations.length) {
    L.push("| Engine | Prompt | Cited domains | Target cited | Evidence |", "|---|---|---|---|---|");
    for (const c of run.citations)
      L.push(
        `| ${c.engine} | ${cell(c.prompt)} | ${c.domains.join(", ") || "(none)"} | ${c.targetCited ? "yes" : "no"} | ${c.evidenceId} |`,
      );
  } else {
    L.push(
      "No AI answers recorded yet. Ask each engine and log the cited URLs, for example:",
      "",
      "```sh",
      `seo-rea cite --out <this dir> --engine chatgpt --prompt "what is the best ${run.keyword}" --urls "https://a.com/x,https://b.com/y"`,
      "```",
    );
  }
  L.push("", "## 8. Ads", "", ...adsSection(run));
  L.push("## 9. Playbook", "");
  playbook.forEach((p, i) =>
    L.push(`${i + 1}. ${p.action}. ${p.why}${p.evidence.filter(Boolean).length ? ` [${ids(p.evidence)}]` : ""}`),
  );
  L.push("", "Drafts only: this tool never sends outreach, buys ads or publishes changes.", "");
  L.push("## 10. Unknowns and cost", "");
  for (const u of new Set([...claims.map((c) => c.unknowns).filter(Boolean), ...run.unknowns])) L.push(`- ${u}`);
  L.push("", `Paid API spend this run: ${run.spentUsd.toFixed(4)} USD (budget ${run.budgetUsd} USD).`, "");
  return L.join("\n");
}
