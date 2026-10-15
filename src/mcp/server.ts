// MCP server (stdio). Every tool returns structured JSON with evidence ids.
// Logs go to stderr; stdout carries the protocol.

import { toErrorPayload } from "../core/errors.js";
import { join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { EvidenceStore } from "../core/evidence.js";
import { normalizeDomain, slug } from "../core/util.js";
import { VERSION } from "../version.js";
import { adLibraryLookups, advertiserFromUrl, brandFromDomain } from "../adapters/adlib.js";
import { AI_ENGINES } from "../adapters/cite.js";
import { keywordGap, type KeywordDoc } from "../adapters/keywords.js";
import { pageAdapter, summarizePage } from "../adapters/page.js";
import { ENGINE_NAMES } from "../adapters/serp.js";
import { runAudit } from "../services/audit.js";
import { recordCitation } from "../services/cite.js";
import { createRuntime, type RuntimeOptions } from "../services/runtime.js";
import { runStrategy } from "../services/strategy.js";
import { runTeardown } from "../services/teardown.js";

export interface ServerDeps {
  /** Base folder for runs when a tool call gives no `out`. */
  runsDir?: string;
  runtime?: RuntimeOptions;
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};

function ok(data: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

async function guarded(fn: () => Promise<Record<string, unknown>>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    const { error } = toErrorPayload(err);
    return { ...ok({ error: error.message, code: error.code, hint: error.hint }), isError: true };
  }
}

const log = (m: string): void => {
  process.stderr.write(`seo-rea: ${m}\n`);
};

export function createServer(deps: ServerDeps = {}): McpServer {
  const server = new McpServer({ name: "seo-rea", version: VERSION });
  const runsDir = resolve(deps.runsDir ?? join(process.cwd(), "seo-rea-runs"));
  const outFor = (out: string | undefined, name: string): string =>
    out ? resolve(out) : join(runsDir, slug(name, 60));
  const rtOpts = { log, ...deps.runtime };

  server.registerTool(
    "seo_strategy",
    {
      title: "Strategy dossier (why a site leads)",
      description:
        "Explains why a domain leads: sitemap + nav cluster map with programmatic-SEO detection, head terms derived from the site and checked in free SERPs, co-ranking competitors, on-page/technical/off-page/AEO/paid/distribution pillars, ranked drivers with copy difficulty, weaknesses, a copyable playbook and a 30/60/90 plan. With `vs`, roles come from the evidence and a side-by-side comparison with cluster and keyword gaps is added. Free sources only unless budgetUsd > 0. Writes report/strategy.md, report/strategy.json and evidence/ (E001..).",
      inputSchema: {
        domain: z.string().min(1).describe("Domain to analyse, e.g. nerdwallet.com"),
        vs: z.string().optional().describe("Second domain to compare against"),
        out: z.string().optional().describe("Output folder (default ./seo-rea-runs/strategy-<domain>[-vs-<vs>])"),
        budgetUsd: z
          .number()
          .min(0)
          .max(50)
          .default(0)
          .describe("Paid API cap for this run. 0 refuses every paid call."),
        crawl: z.number().int().min(1).max(100).default(30).describe("Pages fetched per site"),
        terms: z.number().int().min(1).max(20).default(10).describe("Head terms checked in SERPs"),
        engines: z
          .array(z.enum(ENGINE_NAMES as [string, ...string[]]))
          .optional()
          .describe("Engines to try in order"),
        browser: z.boolean().default(true).describe("Use headless Chromium if available"),
        psi: z.boolean().default(true),
        adlibCapture: z.boolean().default(false).describe("Screenshot ad libraries with the browser"),
      },
    },
    (a) =>
      guarded(async () => {
        const name = `strategy-${normalizeDomain(a.domain)}${a.vs ? `-vs-${normalizeDomain(a.vs)}` : ""}`;
        const out = outFor(a.out, name);
        const { strategy, reportPath } = await runStrategy({
          ...rtOpts,
          domain: a.domain,
          vs: a.vs ?? null,
          out,
          budgetUsd: a.budgetUsd,
          crawl: a.crawl,
          terms: a.terms,
          engines: (a.engines ?? ["google", "bing", "duckduckgo"]) as typeof ENGINE_NAMES,
          browser: a.browser,
          psi: a.psi,
          adlibCapture: a.adlibCapture,
          force: true,
        });
        return {
          reportPath,
          strategyPath: join(out, "report", "strategy.json"),
          evidenceIndex: join(out, "evidence", "index.md"),
          roles: strategy.roles,
          topActions: strategy.topActions,
          drivers: strategy.sites.map((s) => ({ domain: s.domain, drivers: s.drivers })),
          weaknesses: strategy.sites.map((s) => ({ domain: s.domain, weaknesses: s.weaknesses })),
          competitors: strategy.competitors,
          comparison: strategy.comparison,
          unknowns: strategy.unknowns,
        };
      }),
  );

  server.registerTool(
    "seo_teardown",
    {
      title: "SEO teardown",
      description:
        "Evidence-first teardown for a keyword and target domain: SERP (headless browser, HTML or operator URLs), competitor pages, schema validation, AI-search readiness, keyword gap, ad-library lookups. Free sources only unless budgetUsd > 0. Writes report/teardown.md and evidence/ (E001..).",
      inputSchema: {
        keyword: z.string().min(1).describe("Search query, e.g. 'credit card rewards app'"),
        target: z.string().min(1).describe("Target domain, e.g. example.com"),
        out: z.string().optional().describe("Output folder (default ./seo-rea-runs/<keyword>-<target>)"),
        budgetUsd: z
          .number()
          .min(0)
          .max(50)
          .default(0)
          .describe("Paid API cap for this run. 0 refuses every paid call."),
        top: z.number().int().min(1).max(20).default(8),
        crawl: z.number().int().min(1).max(50).default(10),
        serpUrls: z.array(z.string().url()).optional().describe("Ranking URLs in order, as seen in a browser search"),
        engines: z
          .array(z.enum(ENGINE_NAMES as [string, ...string[]]))
          .optional()
          .describe("Engines to try in order"),
        browser: z.boolean().default(true).describe("Use headless Chromium if available"),
        psi: z.boolean().default(true),
        adlibCapture: z.boolean().default(false).describe("Screenshot ad libraries with the browser"),
      },
    },
    (a) =>
      guarded(async () => {
        const out = outFor(a.out, `${a.keyword}-${a.target}`);
        const { run, claims, dossier } = await runTeardown({
          ...rtOpts,
          keyword: a.keyword,
          target: a.target,
          out,
          budgetUsd: a.budgetUsd,
          top: a.top,
          crawl: a.crawl,
          serpUrls: a.serpUrls ?? [],
          engines: (a.engines ?? ["google", "bing", "duckduckgo"]) as typeof ENGINE_NAMES,
          browser: a.browser,
          psi: a.psi,
          adlibCapture: a.adlibCapture,
          force: true,
        });
        return {
          reportPath: join(out, "report", "teardown.md"),
          dossierPath: join(out, "report", "dossier.json"),
          topActions: dossier.topActions,
          evidenceIndex: join(out, "evidence", "index.md"),
          runId: run.runId,
          spentUsd: run.spentUsd,
          serp: { primary: run.serp.primaryLabel, attempts: run.serp.attempts, organic: run.serp.organic },
          competitors: run.competitors.map((c) => ({
            position: c.position,
            url: c.url,
            evidenceId: c.evidenceId,
            wordCount: c.page?.wordCount ?? null,
            schemaTypes: c.page?.schemaTypes ?? [],
            error: c.error ?? null,
          })),
          aiReadiness: run.aiReadiness,
          keywordGap: run.keywordGap.slice(0, 15),
          claims,
          unknowns: run.unknowns,
        };
      }),
  );

  server.registerTool(
    "seo_audit_page",
    {
      title: "Audit one page",
      description:
        "Fetch one URL (raw HTML, no JavaScript) and return on-page facts and JSON-LD schema validation with an evidence id.",
      inputSchema: { url: z.string().url(), out: z.string().optional() },
    },
    (a) =>
      guarded(async () => {
        const out = outFor(a.out, `page-${a.url}`);
        const rt = createRuntime({ ...rtOpts, browser: false });
        try {
          const ev = await new EvidenceStore(out).load();
          const r = await pageAdapter.run(a.url, rt.ctx);
          const e = await ev.add({
            source: `page-${normalizeDomain(a.url)}`,
            url: a.url,
            ext: r.page ? "html" : "txt",
            content: r.page ? r.html : `fetch failed: ${r.error}`,
            fetchedAt: r.fetchedAt,
            fromCache: r.fromCache,
            note: r.error || `${r.page?.wordCount} words`,
          });
          return {
            evidenceId: e.id,
            out,
            status: r.status,
            error: r.error || null,
            page: r.page ? summarizePage(r.page) : null,
          };
        } finally {
          await rt.close();
        }
      }),
  );

  server.registerTool(
    "seo_check_ai_readiness",
    {
      title: "Check AI-search readiness",
      description:
        "For a domain: AI-crawler access in robots.txt (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot...), /llms.txt and /llms-full.txt validation (llmstxt.org), homepage schema and PageSpeed Insights. Writes report/audit.md.",
      inputSchema: { domain: z.string().min(1), out: z.string().optional(), psi: z.boolean().default(true) },
    },
    (a) =>
      guarded(async () => {
        const out = outFor(a.out, `audit-${normalizeDomain(a.domain)}`);
        const { run, reportPath, dossier } = await runAudit({ ...rtOpts, target: a.domain, out, psi: a.psi });
        return {
          reportPath,
          dossierPath: join(out, "report", "dossier.json"),
          topActions: dossier.topActions,
          url: run.url,
          aiReadiness: run.aiReadiness,
          schema: run.page?.schema ?? null,
          pageEvidenceId: run.pageEvidenceId,
          unknowns: run.unknowns,
        };
      }),
  );

  const docSchema = z.union([
    z.string().url(),
    z.object({ url: z.string(), text: z.string(), title: z.string().optional() }),
  ]);
  server.registerTool(
    "seo_keyword_gap",
    {
      title: "Keyword gap",
      description:
        "Phrases (1-3 word n-grams, TF-IDF ranked) used by competitor pages and missing from the target pages. Pass URLs to fetch, or {url, text} objects to skip fetching.",
      inputSchema: {
        competitors: z.array(docSchema).min(1),
        targets: z.array(docSchema).min(1),
        limit: z.number().int().min(1).max(100).default(30),
      },
    },
    (a) =>
      guarded(async () => {
        const rt = createRuntime({ ...rtOpts, browser: false });
        const errors: string[] = [];
        const load = async (list: typeof a.competitors): Promise<KeywordDoc[]> => {
          const docs: KeywordDoc[] = [];
          for (const d of list) {
            if (typeof d !== "string") {
              docs.push({ url: d.url, text: d.text, ...(d.title ? { title: d.title } : {}) });
              continue;
            }
            const r = await pageAdapter.run(d, rt.ctx);
            if (r.page) docs.push(r.page);
            else errors.push(`${d}: ${r.error}`);
          }
          return docs;
        };
        try {
          const competitors = await load(a.competitors);
          const targets = await load(a.targets);
          return {
            competitorDocs: competitors.length,
            targetDocs: targets.length,
            errors,
            gap: keywordGap(competitors, targets, { limit: a.limit }),
          };
        } finally {
          await rt.close();
        }
      }),
  );

  server.registerTool(
    "seo_log_citation",
    {
      title: "Log an AI-answer citation",
      description:
        "Record which URLs an AI answer (ChatGPT, Perplexity, Gemini, Claude, Copilot, Google AI Overview, Grok) cited for a prompt. No network calls. Re-renders the teardown report in `out` if present.",
      inputSchema: {
        out: z.string().min(1),
        engine: z.enum(AI_ENGINES),
        prompt: z.string().min(1),
        urls: z.array(z.string().url()),
        note: z.string().optional(),
      },
    },
    (a) =>
      guarded(async () => {
        const r = await recordCitation({
          out: a.out,
          engine: a.engine,
          prompt: a.prompt,
          urls: a.urls,
          ...(a.note ? { note: a.note } : {}),
        });
        return { evidenceId: r.item.id, citation: r.citation, reportUpdated: r.rerendered };
      }),
  );

  server.registerTool(
    "seo_adlib_lookup",
    {
      title: "Ad-library lookup URLs",
      description:
        "Google Ads Transparency Center, Meta Ad Library and LinkedIn Ad Library lookup URLs for a domain, brand or ranking URL (app-store URLs resolve to the app's brand). URLs only; open them in a browser.",
      inputSchema: { domain: z.string().optional(), brand: z.string().optional(), url: z.string().url().optional() },
    },
    (a) =>
      guarded(() => {
        const adv = a.url
          ? advertiserFromUrl(a.url)
          : {
              domain: a.domain ? normalizeDomain(a.domain) : "",
              brand: a.brand ?? (a.domain ? brandFromDomain(a.domain) : ""),
            };
        if (!adv.domain && !adv.brand) throw new Error("give a domain, brand or url");
        return Promise.resolve({ advertiser: adv, lookups: adLibraryLookups(adv.domain, a.brand ?? adv.brand) });
      }),
  );

  server.registerTool(
    "seo_read_evidence",
    {
      title: "Read evidence",
      description:
        "List the evidence index of a run folder, or read one item (E001..) with its content (text truncated).",
      inputSchema: {
        out: z.string().min(1),
        id: z
          .string()
          .regex(/^E\d{3,}$/)
          .optional(),
        maxChars: z.number().int().min(100).max(200000).default(20000),
      },
    },
    (a) =>
      guarded(async () => {
        const ev = await new EvidenceStore(resolve(a.out)).load();
        if (!a.id) return { count: ev.items.length, items: ev.items };
        const r = await ev.read(a.id, a.maxChars);
        return { item: r.item, truncated: r.truncated, content: r.content };
      }),
  );

  return server;
}

export async function startStdioServer(deps: ServerDeps = {}): Promise<void> {
  const server = createServer(deps);
  await server.connect(new StdioServerTransport());
  log(`MCP server ${VERSION} ready on stdio`);
}
