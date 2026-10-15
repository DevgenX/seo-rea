import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dossierJsonSchema, validateDossier } from "../src/core/dossier.js";
import { actionScore, deriveTopActions, renderTopActions } from "../src/core/report/actions.js";
import { competitor, findings, withTarget } from "./dossier-fixture.js";

const full = (f = findings()) => ({ ...f, topActions: deriveTopActions(f) });

describe("dossier schema", () => {
  it("accepts a well-formed dossier", () => {
    expect(validateDossier(full()).schemaVersion).toBe("1");
  });

  it("rejects wrong versions, bad enums, missing fields and more than 10 actions", () => {
    expect(() => validateDossier({ ...full(), schemaVersion: "2" })).toThrow(/schemaVersion/);
    const action = { rank: 1, title: "x", why: "y", evidenceIds: [], effort: "XL", impact: "high", owner: "dev" };
    expect(() => validateDossier({ ...full(), topActions: [action] })).toThrow(/topActions\.0\.effort/);
    const ok = { ...action, effort: "S" };
    expect(() => validateDossier({ ...full(), topActions: Array.from({ length: 11 }, () => ok) })).toThrow(
      /topActions/,
    );
    const { serp: _s, ...noSerp } = full();
    expect(() => validateDossier(noSerp)).toThrow(/serp/);
    expect(() =>
      validateDossier({
        ...full(),
        claims: [
          {
            id: "X1",
            text: "t",
            evidenceIds: [],
            type: "guessed",
            confidence: "high",
            boundary: "",
            unknowns: "",
          },
        ],
      }),
    ).toThrow(/claims\.0/);
  });

  it("keeps docs/dossier-schema.json in sync with the zod schema", () => {
    const onDisk: unknown = JSON.parse(readFileSync(new URL("../docs/dossier-schema.json", import.meta.url), "utf8"));
    expect(onDisk).toEqual(dossierJsonSchema());
  });
});

describe("top actions", () => {
  it("returns nothing for a healthy target", () => {
    expect(deriveTopActions(findings())).toEqual([]);
    expect(renderTopActions([]).join("\n")).toMatch(/No actions derived/);
  });

  it("ranks by impact, then effort, with ranks 1..n and deduped evidence", () => {
    const f = withTarget(
      {
        robots: { found: true, blocksRoot: false, evidenceId: "E002" },
        aiReadiness: {
          ...findings().target.aiReadiness,
          crawlers: [
            { token: "OAI-SearchBot", operator: "OpenAI", purpose: "search", access: "blocked", rule: "" },
            { token: "GPTBot", operator: "OpenAI", purpose: "training", access: "blocked", rule: "" },
          ],
          llmsTxt: { present: false, valid: false, linkCount: 0, sections: [], errors: ["HTTP 404"], warnings: [] },
          evidenceIds: ["E002", "E005"],
        },
        pages: [{ ...findings().target.pages[0]!, metaDescription: "" }],
      },
      { inputs: { ...findings().inputs, keyword: null } },
    );
    const actions = deriveTopActions(f);
    expect(actions.map((a) => a.rank)).toEqual([1, 2, 3]);
    expect(actions[0]).toMatchObject({ title: "Allow OAI-SearchBot in robots.txt", impact: "high", effort: "S" });
    expect(actions[0]?.evidenceIds).toEqual(["E002", "E005"]);
    expect(actions[1]?.title).toMatch(/Publish \/llms.txt/);
    expect(actions[2]).toMatchObject({ impact: "low", owner: "seo" });
    for (let i = 1; i < actions.length; i++)
      expect(actionScore(actions[i - 1]!)).toBeGreaterThanOrEqual(actionScore(actions[i]!));
  });

  it("compares against competitors: thin content, title, FAQ/HowTo, shared schema, gaps, ads", () => {
    const comps = [
      competitor(1, "a.com", {
        schema: { types: ["Article", "FAQPage"], blocks: 1, parseErrors: [], validationErrors: [] },
      }),
      competitor(2, "b.com", {
        schema: { types: ["Article", "FAQPage"], blocks: 1, parseErrors: [], validationErrors: [] },
      }),
      competitor(3, "c.com", {
        schema: { types: ["Article", "HowTo"], blocks: 1, parseErrors: [], validationErrors: [] },
      }),
      competitor(4, "d.com", { analysed: false, error: "HTTP 403", wordCount: 0 }),
    ];
    const f = withTarget(
      { pages: [{ ...findings().target.pages[0]!, title: "CardLab", wordCount: 400 }] },
      {
        inputs: { ...findings().inputs, keyword: "credit card rewards app" },
        competitors: comps,
        keywordGap: [{ phrase: "cash back", words: 2, competitors: 3, tfidf: 1, score: 9 }],
        serp: {
          ...findings().serp,
          ads: [{ engine: "Bing", url: "https://www.rival.com/lp", title: "Rival" }],
          engines: [
            {
              engine: "bing",
              label: "Bing",
              adapter: "serp-html",
              status: "used",
              problem: "",
              httpStatus: 200,
              organicCount: 4,
              adCount: 1,
              evidenceId: "E004",
            },
          ],
        },
      },
    );
    const titles = deriveTopActions(f).map((a) => a.title);
    expect(titles[0]).toMatch(/Put "credit card rewards app" .* title/);
    expect(titles[1]).toMatch(/Publish a dedicated page for "credit card rewards app" \(about 2000 words/);
    expect(titles).toContain("Add a FAQ section with FAQPage JSON-LD");
    expect(titles).toContain("Add a step-by-step section with HowTo JSON-LD");
    expect(titles).toContain("Add JSON-LD types ranking pages share: Article");
    expect(titles.some((t) => t.startsWith("Cover competitor phrases") && t.includes("cash back"))).toBe(true);
    expect(titles.at(-2)).toMatch(/Review competitor ads/);
    expect(titles.at(-1)).toMatch(/HowTo/);
    const howTo = deriveTopActions(f).find((a) => a.title.includes("HowTo"));
    expect(howTo).toMatchObject({ impact: "low", evidenceIds: ["E103"] });
  });

  it("flags schema, sitemap, PSI and citation problems and caps the list at 10", () => {
    const t = findings().target;
    const f = withTarget(
      {
        robots: { found: true, blocksRoot: true, evidenceId: "E002" },
        pages: [{ ...t.pages[0]!, wordCount: 40, metaDescription: "" }],
        schemaValidation: {
          ...t.schemaValidation,
          checks: [{ ...t.schemaValidation.checks[0]!, valid: false, errors: ['missing required "url"'] }],
        },
        aiReadiness: {
          ...t.aiReadiness,
          crawlers: [
            { token: "PerplexityBot", operator: "Perplexity", purpose: "search", access: "blocked", rule: "" },
          ],
          llmsTxt: { ...t.aiReadiness.llmsTxt, valid: false, errors: ["first line must be an H1"] },
        },
        sitemap: { urlCount: 0, evidenceId: "E003" },
        performance: [
          {
            source: "psi",
            strategy: "mobile",
            ok: true,
            skipped: "",
            scores: { performance: 35, seo: 80 },
            lab: { "largest-contentful-paint": "6.1 s" },
            field: {},
            evidenceId: "E009",
          },
        ],
      },
      {
        competitors: [competitor(1, "a.com"), competitor(2, "b.com")],
        keywordGap: [{ phrase: "points", words: 1, competitors: 2, tfidf: 1, score: 3 }],
        citations: [
          {
            engine: "chatgpt",
            prompt: "best rewards app",
            urls: ["https://a.com/best"],
            domains: ["a.com"],
            targetCited: false,
            recordedAt: "2026-10-14T12:00:00.000Z",
            evidenceId: "E020",
          },
        ],
      },
    );
    const actions = deriveTopActions(f);
    expect(actions).toHaveLength(10);
    expect(actions[0]?.title).toMatch(/Disallow: \//);
    const all = actions.map((a) => a.title).join("\n");
    expect(all).toMatch(/Allow PerplexityBot/);
    expect(all).toMatch(/Fix JSON-LD errors: Organization: missing required "url"/);
    expect(all).toMatch(/sitemap.xml/);
    expect(all).toMatch(/Fix the PageSpeed SEO audit items/);
    expect(validateDossier({ ...f, topActions: actions }).topActions).toHaveLength(10);
  });

  it("never recommends the generic Thing type", () => {
    const types = { types: ["Thing", "Article"], blocks: 1, parseErrors: [], validationErrors: [] };
    const f = findings({
      competitors: [competitor(1, "a.com", { schema: types }), competitor(2, "b.com", { schema: types })],
    });
    const shared = deriveTopActions(f).find((a) => a.title.startsWith("Add JSON-LD types"));
    expect(shared?.title).toBe("Add JSON-LD types ranking pages share: Article");
  });

  it("renders a markdown table", () => {
    const md = renderTopActions([
      {
        rank: 1,
        title: "Fix a | b",
        why: "Because",
        evidenceIds: ["E001", "E001"],
        effort: "S",
        impact: "high",
        owner: "dev",
      },
    ]).join("\n");
    expect(md).toContain("## Top 10 actions");
    expect(md).toContain("| 1 | Fix a \\| b | Because | high | S | dev | E001 |");
  });
});
