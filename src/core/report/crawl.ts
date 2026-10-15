// Markdown for report/crawl.md.

import type { CrawlReport } from "../crawl/schema.js";
import { cell } from "../util.js";

const MAX_ROWS = 50;

export function renderCrawl(r: CrawlReport): string {
  const s = r.stats;
  const L: string[] = [
    `# Site crawl: ${r.domain}`,
    "",
    `Run ${r.runId} - seo-rea ${r.toolVersion} - ${r.timestamps.started} to ${r.timestamps.finished}`,
    "",
    "## 1. Coverage",
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Pages crawled | ${s.pagesCrawled} (limit ${r.limits.maxPages}, depth ${r.limits.maxDepth}) |`,
    `| HTML pages | ${s.htmlPages} |`,
    `| Indexable pages | ${s.indexable} |`,
    `| Sitemap URLs | ${s.sitemapUrls} |`,
    `| Blocked by robots.txt | ${s.blockedByRobots} |`,
    `| Still queued | ${s.queuedLeft}${s.complete ? " (crawl complete)" : " (page limit reached; rerun with a higher --max-pages to continue)"} |`,
    `| Resumed | ${s.resumed ? "yes" : "no"} |`,
    `| robots.txt | ${r.robots.fetched ? "read" : "missing"} |`,
    "",
    "## 2. Issues by rule",
    "",
  ];
  if (!r.summary.length) L.push("No issues found.", "");
  else {
    L.push("| Rule | Severity | Issue | Pages | Fix |", "|---|---|---|---|---|");
    for (const x of r.summary)
      L.push(`| \`${x.rule}\` | ${x.severity} | ${cell(x.title)} | ${x.count} | ${cell(x.fix)} |`);
    L.push("");
  }
  L.push("## 3. Issues", "");
  if (!r.issues.length) L.push("None.", "");
  else {
    L.push("| ID | Severity | URL | Detail |", "|---|---|---|---|");
    for (const i of r.issues.slice(0, MAX_ROWS))
      L.push(`| \`${i.id}\` | ${i.severity} | ${cell(i.url)} | ${cell(i.detail)} |`);
    if (r.issues.length > MAX_ROWS) L.push("", `${r.issues.length - MAX_ROWS} more in [crawl.json](crawl.json).`);
    L.push("");
  }
  L.push("## 4. Internal link graph", "", "| Page | Inlinks |", "|---|---|");
  for (const x of r.graph.inlinks.slice(0, 10)) L.push(`| ${cell(x.url)} | ${x.count} |`);
  L.push("", "| Page | Internal PageRank |", "|---|---|");
  for (const x of r.graph.pagerank.slice(0, 10)) L.push(`| ${cell(x.url)} | ${x.score} |`);
  L.push("", "| Click depth | Pages |", "|---|---|");
  for (const x of r.graph.depthHistogram) L.push(`| ${x.depth} | ${x.pages} |`);
  L.push("", "Issue ids are stable across runs; compare two crawls with `seo-rea diff`.", "");
  return L.join("\n");
}
