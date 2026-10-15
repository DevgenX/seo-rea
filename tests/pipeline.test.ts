import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDossier } from "../src/core/dossier.js";
import { auditUrl, runAudit } from "../src/services/audit.js";
import { recordCitation } from "../src/services/cite.js";
import { runTeardown } from "../src/services/teardown.js";
import { fx, html, tmp } from "./helpers.js";

/** Offline router: every URL the pipeline may request maps to a fixture. */
function fakeFetch(requested: string[], opts: { ddgBlocked?: boolean } = {}): typeof fetch {
  return async (input) => {
    const url = String(input);
    requested.push(url);
    const u = new URL(url);
    if (u.hostname === "html.duckduckgo.com") {
      return opts.ddgBlocked
        ? html('<div class="anomaly-modal">bots use DuckDuckGo too</div>', 202)
        : html(fx("ddg.html"));
    }
    if (u.hostname === "www.bing.com") return html(fx("bing.html"));
    if (u.hostname === "www.google.com") return html(fx("google-block.html"));
    if (u.hostname === "www.googleapis.com") return html("{}", 429, "application/json");
    if (u.pathname === "/robots.txt") {
      if (u.hostname === "beta.org") return html("User-agent: *\nDisallow: /guide", 200, "text/plain");
      if (u.hostname === "getcardlab.app") return html(fx("robots-ai.txt"), 200, "text/plain");
      return html("", 404);
    }
    if (u.hostname === "www.alpha.com") return html(fx("article.html"));
    if (u.hostname === "getcardlab.app") {
      if (u.pathname === "/sitemap.xml") {
        return html(
          "<urlset><url><loc>https://getcardlab.app/</loc></url><url><loc>https://getcardlab.app/features</loc></url></urlset>",
          200,
          "application/xml",
        );
      }
      if (u.pathname === "/llms.txt") return html(fx("llms.txt"), 200, "text/plain");
      if (u.pathname === "/llms-full.txt") return html("<!doctype html><html><body>app</body></html>");
      if (u.pathname === "/features") return html(fx("schema-mixed.html"));
      return html(fx("target-home.html"));
    }
    return html("not found", 404);
  };
}

async function setup(requested: string[], extra: Record<string, unknown> = {}, fetchOpts = {}) {
  const dir = await tmp();
  return {
    dir,
    opts: {
      keyword: "credit card rewards app",
      target: "https://www.getcardlab.app/",
      out: join(dir, "out"),
      budgetUsd: 0,
      cacheDir: join(dir, "cache"),
      ledgerPath: join(dir, "ledger.csv"),
      fetchImpl: fakeFetch(requested, fetchOpts),
      browser: false,
      delayMs: 0,
      minSearchDelayMs: 0,
      engines: ["google" as const, "duckduckgo" as const, "bing" as const],
      env: { DATAFORSEO_LOGIN: "x", DATAFORSEO_PASSWORD: "y" },
      now: () => new Date("2026-10-14T12:00:00Z"),
      ...extra,
    },
  };
}

describe("teardown (offline)", () => {
  it("runs end to end at budget 0 and writes every report", async () => {
    const requested: string[] = [];
    const { opts } = await setup(requested);
    const { run, claims, playbook } = await runTeardown(opts);

    expect(requested.some((u) => u.includes("dataforseo"))).toBe(false);
    expect(requested).not.toContain("https://beta.org/guide");
    expect(run.serp.primary).toBe("serp-html");
    expect(run.serp.primaryLabel).toBe("DuckDuckGo HTML");
    expect(run.serp.attempts.map((a) => [a.engine, Boolean(a.problem)])).toEqual([
      ["google", true],
      ["duckduckgo", false],
    ]);
    expect(run.serp.notes[0]).toMatch(/Headless browser path skipped: disabled/);
    expect(run.serp.organic).toHaveLength(2);
    expect(run.competitors[0]?.page?.wordCount).toBeGreaterThan(0);
    expect(run.competitors[1]?.error).toBe("disallowed by robots.txt");
    expect(run.target.pages.map((p) => p.url)).toEqual([
      "https://getcardlab.app/",
      "https://getcardlab.app/features",
      "https://getcardlab.app/pricing",
    ]);
    expect(run.target.schemaTypes).toContain("MobileApplication");
    expect(run.aiReadiness?.crawlers.find((c) => c.token === "GPTBot")?.access).toBe("blocked");
    expect(run.aiReadiness?.llmsTxt.valid).toBe(true);
    expect(run.aiReadiness?.llmsFullTxt.present).toBe(false);
    expect(run.aiReadiness?.perf[0]?.skipped).toMatch(/quota/);
    expect(run.keywordGap.length).toBeGreaterThan(0);
    expect(run.ads.map((a) => a.status)).toEqual(Array(9).fill("manual-check"));
    expect(run.unknowns.join("\n")).toMatch(/budget is 0/);
    expect(claims.some((c) => /does not appear/.test(c.claim))).toBe(true);
    expect(claims.some((c) => /blocks GPTBot/.test(c.claim))).toBe(true);
    expect(playbook.some((p) => /Fix JSON-LD errors on the target/.test(p.action))).toBe(true);

    const td = await readFile(join(opts.out, "report", "teardown.md"), "utf8");
    for (const h of [
      "## 2. SERP map",
      "## 3. Competitor cards",
      "## 4. Schema validation",
      "## 5. AI-search readiness",
      "## 6. Keyword gap",
      "## 8. Ads",
      "## 10. Unknowns and cost",
    ]) {
      expect(td).toContain(h);
    }
    expect(td).toMatch(/\| serp-html \| Google HTML \| not used: Google requires JavaScript/);
    expect(td).toMatch(/\| GPTBot \| OpenAI \| model training \| \*\*blocked\*\*/);
    expect(td).toMatch(/LocalBusiness \| \*\*errors\*\* \| missing required "address"/);
    const index = JSON.parse(await readFile(join(opts.out, "evidence", "index.json"), "utf8")) as Array<{ id: string }>;
    expect(index[0]?.id).toBe("E001");
    expect(await readFile(join(opts.out, "report", "questions.md"), "utf8")).toMatch(/AI search/);
    expect(await readFile(join(opts.out, "report", "ledger.md"), "utf8")).toMatch(/\| C01 \|/);

    const dossier = validateDossier(JSON.parse(await readFile(join(opts.out, "report", "dossier.json"), "utf8")));
    expect(dossier).toMatchObject({
      kind: "teardown",
      runId: run.runId,
      inputs: { keyword: "credit card rewards app" },
    });
    expect(dossier.claims).toHaveLength(claims.length);
    expect(dossier.competitors[1]).toMatchObject({ analysed: false, error: "disallowed by robots.txt" });
    expect(dossier.target.aiReadiness.crawlers.find((c) => c.token === "GPTBot")?.access).toBe("blocked");
    expect(dossier.topActions.length).toBeGreaterThan(0);
    expect(dossier.topActions.some((a) => /Fix JSON-LD errors/.test(a.title))).toBe(true);
    const ids = new Set(index.map((e) => e.id));
    for (const a of dossier.topActions) for (const id of a.evidenceIds) expect(ids.has(id)).toBe(true);
    expect(td.indexOf("## Top 10 actions")).toBeGreaterThan(0);
    expect(td.indexOf("## Top 10 actions")).toBeLessThan(td.indexOf("## 1. Summary"));
  });

  it("refuses to overwrite without --force and uses operator URLs first", async () => {
    const requested: string[] = [];
    const { opts } = await setup(requested, { serpUrls: ["https://www.alpha.com/best-rewards-apps/"], engines: [] });
    await runTeardown(opts);
    await expect(runTeardown(opts)).rejects.toThrow(/already has a run/);
    const { run } = await runTeardown({ ...opts, force: true });
    expect(run.serp.primary).toBe("serp-urls");
    expect(run.serp.notes).toContain("Live search engines skipped (--engines none).");
    expect(requested.some((u) => u.includes("duckduckgo"))).toBe(false);
  });

  it("reports when no free SERP is usable", async () => {
    const requested: string[] = [];
    const { opts } = await setup(requested, { engines: ["google", "duckduckgo"] }, { ddgBlocked: true });
    const { run } = await runTeardown(opts);
    expect(run.serp.organic).toHaveLength(0);
    expect(run.serp.attempts[1]?.problem).toMatch(/anomaly/);
    expect(run.unknowns.join("\n")).toMatch(/paid fallback refused because budget is 0/);
  });

  it("logs citations and re-renders the report", async () => {
    const requested: string[] = [];
    const { opts } = await setup(requested);
    await runTeardown(opts);
    const r = await recordCitation({
      out: opts.out,
      engine: "chatgpt",
      prompt: "best credit card rewards app",
      urls: "https://getcardlab.app/, https://www.alpha.com/x",
    });
    expect(r.rerendered).toBe(true);
    const d = validateDossier(JSON.parse(await readFile(join(opts.out, "report", "dossier.json"), "utf8")));
    expect(d.citations).toMatchObject([{ engine: "chatgpt", targetCited: true, evidenceId: r.item.id }]);
    expect(r.citation.domains).toEqual(["getcardlab.app", "alpha.com"]);
    const td = await readFile(join(opts.out, "report", "teardown.md"), "utf8");
    expect(td).toMatch(
      new RegExp(
        `\\| chatgpt \\| best credit card rewards app \\| getcardlab.app, alpha.com \\| yes \\| ${r.item.id} \\|`,
      ),
    );
    const lone = await tmp();
    expect((await recordCitation({ out: lone, engine: "gemini", prompt: "x", urls: "" })).rerendered).toBe(false);
  });

  it("accepts a saved SERP file", async () => {
    const requested: string[] = [];
    const { dir, opts } = await setup(requested, { engines: [] });
    await writeFile(join(dir, "serp.html"), fx("ddg.html"));
    const { run } = await runTeardown({ ...opts, serpHtml: [join(dir, "serp.html")] });
    expect(run.serp.primary).toBe("serp-file");
  });
});

describe("audit (offline)", () => {
  it("checks schema, AI crawlers, llms.txt and sitemap for one site", async () => {
    const requested: string[] = [];
    const dir = await tmp();
    const { run, reportPath } = await runAudit({
      target: "getcardlab.app",
      out: join(dir, "audit"),
      cacheDir: join(dir, "cache"),
      fetchImpl: fakeFetch(requested),
      delayMs: 0,
      psi: false,
    });
    expect(run.url).toBe("https://getcardlab.app/");
    expect(run.page?.schemaTypes).toEqual(["Organization"]);
    // robots.txt points at another host's sitemap, which 404s
    expect(run.site.sitemap.urlCount).toBe(0);
    expect(run.aiReadiness.crawlers.filter((c) => c.access === "blocked").map((c) => c.token)).toEqual([
      "GPTBot",
      "Google-Extended",
      "CCBot",
    ]);
    expect(run.unknowns).toContain("PageSpeed Insights not run (--no-psi)");
    const md = await readFile(reportPath, "utf8");
    expect(md).toContain("# AEO audit: https://getcardlab.app/");
    expect(md.indexOf("## Top 10 actions")).toBeLessThan(md.indexOf("## 1. Page"));
    const dossier = validateDossier(JSON.parse(await readFile(join(dir, "audit", "report", "dossier.json"), "utf8")));
    expect(dossier).toMatchObject({
      kind: "audit",
      inputs: { keyword: null },
      competitors: [],
      serp: { collected: false },
    });
    expect(dossier.topActions.map((a) => a.title)).toContain("Publish /sitemap.xml and reference it in robots.txt");
    expect(md).toMatch(/Organization \| valid/);
    expect(md).toMatch(/llms-full.txt: absent/);
    const again = await runAudit({
      target: "getcardlab.app",
      out: join(dir, "audit"),
      cacheDir: join(dir, "cache"),
      fetchImpl: fakeFetch(requested),
      delayMs: 0,
      psi: false,
    });
    expect(again.run.pageEvidenceId).toBe("E001");
    expect(auditUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(auditUrl("www.A.com")).toBe("https://a.com/");
  });
});
