// Builds dossier.json content from teardown and audit run data.

import type { PageSummary } from "../adapters/page.js";
import { DOSSIER_SCHEMA_VERSION, type Dossier } from "./dossier.js";
import { deriveTopActions, type DossierFindings } from "./report/actions.js";
import type { AiReadinessSummary, AuditRun, SiteSummary, TeardownRun } from "./run.js";
import type { Claim } from "./types.js";
import { isDomainOrSub } from "./util.js";

const HEADING_CAP = 20;
const headings = (p: PageSummary): Dossier["competitors"][number]["headings"] => ({
  h1: p.headings.h1.slice(0, HEADING_CAP),
  h2: p.headings.h2.slice(0, HEADING_CAP),
  h3: p.headings.h3.slice(0, HEADING_CAP),
});

const nonEmpty = (list: Array<string | undefined>): string[] => [...new Set(list.filter((x): x is string => !!x))];

function claimRows(claims: Claim[]): Dossier["claims"] {
  return claims.map((c, i) => ({
    id: `C${String(i + 1).padStart(2, "0")}`,
    text: c.claim,
    evidenceIds: nonEmpty(c.evidence),
    type: c.type,
    confidence: c.confidence,
    boundary: c.boundary,
    unknowns: c.unknowns,
  }));
}

function aiSection(ai: AiReadinessSummary | null): {
  aiReadiness: Dossier["target"]["aiReadiness"];
  performance: Dossier["target"]["performance"];
} {
  if (!ai)
    return {
      aiReadiness: {
        crawlers: [],
        llmsTxt: { present: false, valid: false, linkCount: 0, sections: [], errors: ["not checked"], warnings: [] },
        llmsFullTxt: { present: false, bytes: 0 },
        evidenceIds: [],
      },
      performance: [],
    };
  return {
    aiReadiness: {
      crawlers: ai.crawlers.map((c) => ({
        token: c.token,
        operator: c.operator,
        purpose: c.purpose,
        access: c.access,
        rule: c.rule,
      })),
      llmsTxt: {
        present: ai.llmsTxt.present,
        valid: ai.llmsTxt.valid,
        linkCount: ai.llmsTxt.linkCount,
        sections: ai.llmsTxt.sections,
        errors: ai.llmsTxt.errors,
        warnings: ai.llmsTxt.warnings,
      },
      llmsFullTxt: { present: ai.llmsFullTxt.present, bytes: ai.llmsFullTxt.bytes },
      evidenceIds: nonEmpty([ai.crawlerEvidenceId, ...ai.llmsEvidenceIds]),
    },
    performance: ai.perf.map((p) => ({
      source: p.source,
      strategy: p.strategy,
      ok: p.ok,
      skipped: p.skipped,
      scores: p.scores,
      lab: p.lab,
      field: p.field,
      evidenceId: p.evidenceId,
    })),
  };
}

function targetSection(
  site: SiteSummary,
  pages: PageSummary[],
  error: string,
  pageIds: string[],
  ai: AiReadinessSummary | null,
): Dossier["target"] {
  return {
    domain: site.domain,
    fetched: pages.length > 0,
    error,
    pages: pages.map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription,
      wordCount: p.wordCount,
      headings: headings(p),
      schemaTypes: p.schemaTypes,
      internalLinks: p.internalLinkCount,
    })),
    schemaValidation: {
      types: [...new Set(pages.flatMap((p) => p.schemaTypes))].toSorted(),
      blocks: pages.reduce((n, p) => n + p.schema.blocks, 0),
      parseErrors: pages.flatMap((p) => p.schema.parseErrors),
      checks: pages.flatMap((p) => p.schema.nodes.map((n) => ({ url: p.url, ...n }))),
      evidenceIds: nonEmpty(pageIds),
    },
    ...aiSection(ai),
    robots: { found: site.robotsFound, blocksRoot: site.robotsBlocksRoot, evidenceId: site.robotsEvidenceId },
    sitemap: { urlCount: site.sitemap.urlCount, evidenceId: site.sitemap.evidenceId },
    evidenceIds: nonEmpty([...pageIds, site.robotsEvidenceId, site.sitemap.evidenceId]),
  };
}

function finish(findings: DossierFindings): Dossier {
  return { ...findings, topActions: deriveTopActions(findings) };
}

const EMPTY_SERP: Dossier["serp"] = {
  collected: false,
  primary: "",
  engines: [],
  results: [],
  ads: [],
  evidenceId: "",
};

export function buildTeardownDossier(run: TeardownRun, claims: Claim[], writtenAt: Date): Dossier {
  const t = run.target;
  const unknowns = [...new Set([...claims.map((c) => c.unknowns).filter(Boolean), ...run.unknowns])];
  return finish({
    schemaVersion: DOSSIER_SCHEMA_VERSION,
    tool: "seo-rea",
    toolVersion: run.version,
    kind: "teardown",
    runId: run.runId,
    inputs: { target: t.domain, url: `${t.origin}/`, keyword: run.keyword, budgetUsd: run.budgetUsd },
    timestamps: { createdAt: run.createdAt, writtenAt: writtenAt.toISOString() },
    cost: { spentUsd: run.spentUsd, budgetUsd: run.budgetUsd },
    serp: {
      collected: run.serp.organic.length > 0,
      primary: run.serp.primaryLabel,
      engines: run.serp.attempts.map((a) => ({
        engine: a.engine,
        label: a.label,
        adapter: a.adapter,
        status: a.problem ? ("not-used" as const) : ("used" as const),
        problem: a.problem,
        httpStatus: a.status,
        organicCount: a.organicCount,
        adCount: a.adCount,
        evidenceId: a.evidenceId,
      })),
      results: run.serp.organic.map((r) => ({
        position: r.position,
        url: r.url,
        domain: r.domain,
        title: r.title || run.competitors.find((c) => c.url === r.url)?.page?.title || "",
        isTarget: isDomainOrSub(r.domain, t.domain),
      })),
      ads: run.serp.ads.map((a) => ({ engine: a.engine, url: a.url, title: a.title })),
      evidenceId: run.serp.parsedEvidenceId,
    },
    competitors: run.competitors.map((c) => {
      const p = c.page;
      return {
        position: c.position,
        url: c.url,
        domain: c.domain,
        analysed: Boolean(p),
        error: c.error ?? "",
        title: p?.title ?? "",
        wordCount: p?.wordCount ?? 0,
        headings: p ? headings(p) : { h1: [], h2: [], h3: [] },
        schema: {
          types: p?.schemaTypes ?? [],
          blocks: p?.schema.blocks ?? 0,
          parseErrors: p?.schema.parseErrors ?? [],
          validationErrors: (p?.schema.nodes ?? [])
            .filter((n) => !n.valid)
            .map((n) => ({ type: n.type, errors: n.errors })),
        },
        internalLinks: p?.internalLinkCount ?? 0,
        evidenceId: c.evidenceId,
      };
    }),
    target: targetSection(t, t.pages, t.error ?? "", [t.homeEvidenceId, t.crawlEvidenceId], run.aiReadiness),
    keywordGap: run.keywordGap.map((k) => ({
      phrase: k.phrase,
      words: k.words,
      competitors: k.competitors,
      tfidf: k.tfidf,
      score: k.score,
    })),
    ads: run.ads.map((a) => ({
      domain: a.domain,
      brand: a.brand,
      platform: a.platform,
      url: a.url,
      status: a.status,
      visibleCount: a.visibleCount,
      note: a.note,
      evidenceIds: nonEmpty([a.evidenceId, a.screenshotEvidenceId]),
    })),
    citations: run.citations.map((c) => ({
      engine: c.engine,
      prompt: c.prompt,
      urls: c.urls,
      domains: c.domains,
      targetCited: c.targetCited,
      recordedAt: c.recordedAt,
      evidenceId: c.evidenceId,
    })),
    claims: claimRows(claims),
    unknowns,
    evidenceIndex: "evidence/index.json",
  });
}

export function buildAuditDossier(run: AuditRun, claims: Claim[], writtenAt: Date): Dossier {
  const unknowns = [...new Set([...claims.map((c) => c.unknowns).filter(Boolean), ...run.unknowns])];
  return finish({
    schemaVersion: DOSSIER_SCHEMA_VERSION,
    tool: "seo-rea",
    toolVersion: run.version,
    kind: "audit",
    runId: run.runId,
    inputs: { target: run.site.domain, url: run.url, keyword: null, budgetUsd: 0 },
    timestamps: { createdAt: run.createdAt, writtenAt: writtenAt.toISOString() },
    cost: { spentUsd: 0, budgetUsd: 0 },
    serp: EMPTY_SERP,
    competitors: [],
    target: targetSection(run.site, run.page ? [run.page] : [], run.pageError, [run.pageEvidenceId], run.aiReadiness),
    keywordGap: [],
    ads: [],
    citations: [],
    claims: claimRows(claims),
    unknowns,
    evidenceIndex: "evidence/index.json",
  });
}
