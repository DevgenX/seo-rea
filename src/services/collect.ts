// Collection steps shared by `teardown` and `audit`.

import type { EvidenceStore } from "../core/evidence.js";
import type { AiReadinessSummary, SiteSummary } from "../core/run.js";
import type { AdapterContext } from "../core/types.js";
import { aiReadinessAdapter, type LlmsTxtReport } from "../adapters/ai-readiness.js";
import { lighthouseAdapter, psiAdapter } from "../adapters/performance.js";
import { siteFilesAdapter, isAllowed, type SiteFiles } from "../adapters/site.js";

export async function collectSite(
  domain: string,
  ctx: AdapterContext,
  ev: EvidenceStore,
): Promise<{ summary: SiteSummary; files: SiteFiles }> {
  const origin = `https://${domain}`;
  const files = await siteFilesAdapter.run({ origin }, ctx);
  const rf = files.robotsFetch;
  const robotsFound = rf.ok && !/<html/i.test(rf.body);
  const robotsEv = await ev.add({
    source: `robots-${domain}`,
    url: `${origin}/robots.txt`,
    ext: "txt",
    content: robotsFound
      ? rf.body
      : `not found: ${rf.error || `HTTP ${rf.status}`}${rf.ok ? " (HTML fallback page)" : ""}`,
    fetchedAt: rf.fetchedAt,
    fromCache: rf.fromCache,
    note: robotsFound
      ? `${files.robots.groups.length} group(s), ${files.robots.sitemaps.length} sitemap line(s)`
      : "no robots.txt",
  });
  const smEv = await ev.add({
    source: `sitemap-${domain}`,
    url: files.sitemapSources[0]?.url ?? `${origin}/sitemap.xml`,
    note: `${files.sitemapUrls.length} URLs`,
    content: { sources: files.sitemapSources, urls: files.sitemapUrls },
  });
  return {
    files,
    summary: {
      domain,
      origin,
      robotsEvidenceId: robotsEv.id,
      robotsFound,
      robotsBlocksRoot: robotsFound && !isAllowed(files.robots, "*", `${origin}/`),
      sitemap: { urlCount: files.sitemapUrls.length, sources: files.sitemapSources, evidenceId: smEv.id },
    },
  };
}

const dropLinks = ({ links, ...rest }: LlmsTxtReport): Omit<LlmsTxtReport, "links"> & { linkCount: number } => ({
  ...rest,
  linkCount: links.length,
});

export interface ReadinessOptions {
  psi: boolean;
  lighthouse: boolean;
}

/** AI crawlers, llms.txt, llms-full.txt and page speed for one site. */
export async function collectAiReadiness(
  site: SiteFiles,
  pageUrl: string,
  ctx: AdapterContext,
  ev: EvidenceStore,
  opts: ReadinessOptions,
): Promise<{ summary: AiReadinessSummary; unknowns: string[] }> {
  const domain = new URL(site.origin).hostname;
  ctx.log(`ai-readiness: ${domain}`);
  const r = await aiReadinessAdapter.run({ origin: site.origin, robots: site.robots }, ctx);
  const llmsIds: string[] = [];
  for (const [name, rep, raw] of [
    ["llms-txt", r.llmsTxt, r.raw.llmsTxt],
    ["llms-full-txt", r.llmsFullTxt, r.raw.llmsFullTxt],
  ] as const) {
    const e = await ev.add({
      source: `${name}-${domain}`,
      url: rep.url,
      ext: "json",
      fetchedAt: raw.fetchedAt,
      fromCache: raw.fromCache,
      note: rep.present
        ? `${rep.valid ? "valid" : "invalid"}; ${rep.errors.length} error(s), ${rep.warnings.length} warning(s)`
        : `absent (${rep.errors[0] ?? "not found"})`,
      content: { report: rep, body: raw.ok ? raw.body.slice(0, 50000) : "" },
    });
    llmsIds.push(e.id);
  }
  const crawlerEv = await ev.add({
    source: `ai-crawlers-${domain}`,
    kind: "derived",
    url: `${site.origin}/robots.txt`,
    note: `${r.crawlers.filter((c) => c.access === "blocked").length} of ${r.crawlers.length} AI crawlers blocked at /`,
    content: r.crawlers,
  });
  const unknowns: string[] = [];
  const perf: AiReadinessSummary["perf"] = [];
  const runPerf = async (adapter: typeof psiAdapter): Promise<void> => {
    ctx.log(`perf: ${adapter.label}`);
    const p = await adapter.run({ url: pageUrl, strategy: "mobile" }, ctx);
    const { raw, ...rest } = p;
    const e = await ev.add({
      source: `${p.source}-${domain}`,
      kind: p.ok ? "api" : "observed",
      url: p.source === "psi" ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(pageUrl)}` : pageUrl,
      note: p.ok ? `performance ${p.scores.performance ?? "?"}, seo ${p.scores.seo ?? "?"}` : `skipped: ${p.skipped}`,
      content: p.ok ? raw : rest,
      fetchedAt: p.fetchedAt,
      fromCache: p.fromCache,
    });
    perf.push({ ...rest, evidenceId: e.id });
    if (!p.ok) unknowns.push(`${p.source === "psi" ? "PageSpeed Insights" : "Lighthouse"} skipped: ${p.skipped}`);
  };
  if (opts.psi) await runPerf(psiAdapter);
  else unknowns.push("PageSpeed Insights not run (--no-psi)");
  if (opts.lighthouse) {
    const a = await lighthouseAdapter.available(ctx);
    if (a.available) await runPerf(lighthouseAdapter);
    else unknowns.push(`Local Lighthouse skipped: ${a.reason}`);
  }
  return {
    summary: {
      crawlers: r.crawlers,
      llmsTxt: dropLinks(r.llmsTxt),
      llmsFullTxt: dropLinks(r.llmsFullTxt),
      llmsEvidenceIds: llmsIds,
      crawlerEvidenceId: crawlerEv.id,
      perf,
    },
    unknowns,
  };
}
