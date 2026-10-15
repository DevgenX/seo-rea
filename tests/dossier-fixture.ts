import type { Dossier } from "../src/core/dossier.js";
import type { DossierFindings } from "../src/core/report/actions.js";

const noHeadings = { h1: [], h2: [], h3: [] };

export function competitor(
  position: number,
  domain: string,
  over: Partial<Dossier["competitors"][number]> = {},
): Dossier["competitors"][number] {
  return {
    position,
    url: `https://${domain}/best`,
    domain,
    analysed: true,
    error: "",
    title: "Best credit card rewards apps 2026",
    wordCount: 2000,
    headings: { h1: ["Best apps"], h2: ["Pricing"], h3: [] },
    schema: { types: ["Article"], blocks: 1, parseErrors: [], validationErrors: [] },
    internalLinks: 40,
    evidenceId: `E10${position}`,
    ...over,
  };
}

/** A healthy target with no findings; tests switch problems on. */
export function findings(over: Partial<DossierFindings> = {}): DossierFindings {
  return {
    schemaVersion: "1",
    tool: "seo-rea",
    toolVersion: "0.3.0",
    kind: "teardown",
    runId: "20261014T120000Z",
    inputs: { target: "getcardlab.app", url: "https://getcardlab.app/", keyword: "rewards app", budgetUsd: 0 },
    timestamps: { createdAt: "2026-10-14T12:00:00.000Z", writtenAt: "2026-10-14T12:05:00.000Z" },
    cost: { spentUsd: 0, budgetUsd: 0 },
    serp: { collected: false, primary: "", engines: [], results: [], ads: [], evidenceId: "" },
    competitors: [],
    target: {
      domain: "getcardlab.app",
      fetched: true,
      error: "",
      pages: [
        {
          url: "https://getcardlab.app/",
          title: "CardLab - the rewards app",
          metaDescription: "Track card rewards.",
          wordCount: 1500,
          headings: noHeadings,
          schemaTypes: ["Organization"],
          internalLinks: 20,
        },
      ],
      schemaValidation: {
        types: ["Organization"],
        blocks: 1,
        parseErrors: [],
        checks: [
          {
            url: "https://getcardlab.app/",
            type: "Organization",
            checkedAs: "Organization",
            valid: true,
            errors: [],
            warnings: [],
          },
        ],
        evidenceIds: ["E001"],
      },
      aiReadiness: {
        crawlers: [
          { token: "GPTBot", operator: "OpenAI", purpose: "model training", access: "allowed", rule: "" },
          { token: "OAI-SearchBot", operator: "OpenAI", purpose: "search", access: "allowed", rule: "" },
        ],
        llmsTxt: { present: true, valid: true, linkCount: 3, sections: ["Docs"], errors: [], warnings: [] },
        llmsFullTxt: { present: false, bytes: 0 },
        evidenceIds: ["E005", "E006"],
      },
      performance: [],
      robots: { found: true, blocksRoot: false, evidenceId: "E002" },
      sitemap: { urlCount: 5, evidenceId: "E003" },
      evidenceIds: ["E001", "E002", "E003"],
    },
    keywordGap: [],
    ads: [],
    citations: [],
    claims: [],
    unknowns: [],
    evidenceIndex: "evidence/index.json",
    ...over,
  };
}

export function withTarget(
  over: Partial<DossierFindings["target"]>,
  rest: Partial<DossierFindings> = {},
): DossierFindings {
  const base = findings(rest);
  return { ...base, target: { ...base.target, ...over } };
}
