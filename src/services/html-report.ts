// Writes self-contained HTML reports next to a run's JSON reports.

import { readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SeoReaError } from "../core/errors.js";
import { validateCrawl, type CrawlReport } from "../core/crawl/schema.js";
import { DiffReportSchema } from "../core/diff/schema.js";
import { validateReverse } from "../core/reverse/schema.js";
import { renderCrawlHtml, renderDiffHtml, renderReverseHtml } from "../core/html/render.js";

const exists = async (p: string): Promise<boolean> =>
  stat(p).then(
    () => true,
    () => false,
  );
const readJson = async (p: string): Promise<unknown> => JSON.parse(await readFile(p, "utf8")) as unknown;

/**
 * Render report/{crawl,reverse,diff}.json in a run folder to matching .html
 * files. Returns the paths written; throws when the folder has none.
 */
export async function writeHtmlReports(runDir: string): Promise<string[]> {
  const dir = resolve(runDir);
  const report = join(dir, "report");
  const written: string[] = [];
  let crawl: CrawlReport | null = null;
  const crawlPath = join(report, "crawl.json");
  if (await exists(crawlPath)) {
    crawl = validateCrawl(await readJson(crawlPath));
    const out = join(report, "crawl.html");
    await writeFile(out, renderCrawlHtml(crawl));
    written.push(out);
  }
  const reversePath = join(report, "reverse.json");
  if (await exists(reversePath)) {
    const r = validateReverse(await readJson(reversePath));
    if (!crawl) {
      const linked = resolve(dir, r.coverage.crawlReport);
      if (await exists(linked)) crawl = validateCrawl(await readJson(linked));
    }
    const out = join(report, "reverse.html");
    await writeFile(out, renderReverseHtml(r, crawl));
    written.push(out);
  }
  const diffPath = join(report, "diff.json");
  if (await exists(diffPath)) {
    const parsed = DiffReportSchema.safeParse(await readJson(diffPath));
    if (!parsed.success) throw new SeoReaError("SCHEMA_INVALID", `${diffPath} does not match the diff schema`);
    const out = join(report, "diff.html");
    await writeFile(out, renderDiffHtml(parsed.data));
    written.push(out);
  }
  if (!written.length) {
    throw new SeoReaError("NOT_FOUND", `no report/crawl.json, reverse.json or diff.json in ${dir}`);
  }
  return written;
}
