// AI-search readiness: which AI crawlers robots.txt lets in, and whether
// /llms.txt and /llms-full.txt exist and follow the llmstxt.org format.

import type { AdapterContext, FetchResult, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";
import { groupsFor, isAllowed, type Robots } from "./site.js";

export interface AiCrawler {
  token: string;
  operator: string;
  purpose: string;
}

/** Product tokens as published by each operator. */
export const AI_CRAWLERS: AiCrawler[] = [
  { token: "GPTBot", operator: "OpenAI", purpose: "model training" },
  { token: "OAI-SearchBot", operator: "OpenAI", purpose: "ChatGPT search index" },
  { token: "ChatGPT-User", operator: "OpenAI", purpose: "user-initiated fetches" },
  { token: "ClaudeBot", operator: "Anthropic", purpose: "model training" },
  { token: "Claude-SearchBot", operator: "Anthropic", purpose: "search index" },
  { token: "PerplexityBot", operator: "Perplexity", purpose: "search index" },
  { token: "Google-Extended", operator: "Google", purpose: "Gemini training and grounding (not Search)" },
  { token: "Applebot-Extended", operator: "Apple", purpose: "Apple Intelligence training" },
  { token: "CCBot", operator: "Common Crawl", purpose: "open crawl used for training" },
];

export type CrawlerAccess = "allowed" | "blocked" | "partial";

export interface CrawlerCheck extends AiCrawler {
  access: CrawlerAccess;
  explicit: boolean;
  rule: string;
}

/** Check each AI crawler against parsed robots.txt for the site root. */
export function checkAiCrawlers(robots: Robots, origin: string, crawlers = AI_CRAWLERS): CrawlerCheck[] {
  return crawlers.map((c) => {
    const { groups, explicit } = groupsFor(robots, c.token);
    const rootOk = isAllowed(robots, c.token, `${origin}/`);
    const disallows = groups.flatMap((g) => g.rules).filter((r) => !r.allow && r.path);
    const access: CrawlerAccess = !rootOk ? "blocked" : disallows.length ? "partial" : "allowed";
    const rule = explicit
      ? `own group: ${disallows.map((r) => `Disallow ${r.path}`).join(", ") || "no disallow"}`
      : groups.length
        ? `falls back to *: ${disallows.map((r) => `Disallow ${r.path}`).join(", ") || "no disallow"}`
        : "no matching group (allowed by default)";
    return { ...c, access, explicit, rule };
  });
}

export interface LlmsTxtLink {
  title: string;
  url: string;
  note: string;
  section: string;
}

export interface LlmsTxtReport {
  present: boolean;
  status: number;
  url: string;
  contentType: string;
  bytes: number;
  title: string;
  summary: string;
  sections: string[];
  links: LlmsTxtLink[];
  errors: string[];
  warnings: string[];
  valid: boolean;
}

const LINK_RE = /^[-*]\s+\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/;

/**
 * Validate llms.txt text against the llmstxt.org format: an H1 title first,
 * an optional > summary, optional prose, then H2 sections of
 * "- [name](url): notes" link lists. "## Optional" marks skippable links.
 */
export function validateLlmsTxt(
  text: string,
  opts: { full?: boolean } = {},
): Omit<LlmsTxtReport, "present" | "status" | "url" | "contentType"> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const content = lines.map((l) => l.trim()).filter(Boolean);
  let title = "";
  let summary = "";
  const sections: string[] = [];
  const links: LlmsTxtLink[] = [];

  if (/^\s*<(!doctype|html)/i.test(text)) {
    errors.push("served HTML, not Markdown (likely an app fallback page)");
    return { bytes: text.length, title, summary, sections, links, errors, warnings, valid: false };
  }
  const first = content[0] ?? "";
  if (/^#\s+\S/.test(first)) title = first.replace(/^#\s+/, "");
  else errors.push("first line must be an H1 title (# Name)");
  // llms-full.txt concatenates whole documents, so only the title rule applies to it.
  if (opts.full)
    return { bytes: text.length, title, summary, sections, links, errors, warnings, valid: errors.length === 0 };
  if (content.filter((l) => /^#\s/.test(l)).length > 1) errors.push("more than one H1");

  let section = "";
  for (const line of content.slice(1)) {
    if (/^>\s?/.test(line) && !sections.length && !summary) summary = line.replace(/^>\s?/, "");
    else if (/^##\s+\S/.test(line)) {
      section = line.replace(/^##\s+/, "");
      sections.push(section);
    } else if (/^###?#+\s/.test(line) && section) warnings.push(`heading below H2 inside "${section}": ${line}`);
    else if (/^[-*]\s/.test(line) && section) {
      const m = LINK_RE.exec(line);
      if (!m) {
        warnings.push(`list item is not "- [name](url): notes": ${line.slice(0, 80)}`);
        continue;
      }
      const url = m[2] as string;
      if (!/^(https?:\/\/|\/)/.test(url)) warnings.push(`link is not an absolute or root-relative URL: ${url}`);
      links.push({ title: m[1] as string, url, note: m[3] ?? "", section });
    }
  }
  if (!summary) warnings.push("no > blockquote summary after the title");
  if (!sections.length) warnings.push("no ## sections with link lists");
  else if (!links.length) warnings.push("sections contain no links");
  return { bytes: text.length, title, summary, sections, links, errors, warnings, valid: errors.length === 0 };
}

/** `full` = llms-full.txt: whole docs in Markdown, so link-list rules do not apply. */
export function llmsReportFrom(url: string, r: FetchResult, full = false): LlmsTxtReport {
  const base = { url, status: r.status, contentType: r.contentType };
  if (!r.ok) {
    return {
      ...base,
      present: false,
      bytes: 0,
      title: "",
      summary: "",
      sections: [],
      links: [],
      errors: [r.error || `HTTP ${r.status}`],
      warnings: [],
      valid: false,
    };
  }
  const v = validateLlmsTxt(r.body, { full });
  const htmlFallback = v.errors.some((e) => e.startsWith("served HTML"));
  if (!htmlFallback && r.contentType && !/text\/(plain|markdown)/i.test(r.contentType)) {
    v.warnings.push(`content-type is ${r.contentType}; text/plain or text/markdown expected`);
  }
  return { ...base, ...v, present: !htmlFallback };
}

export interface AiReadiness {
  origin: string;
  crawlers: CrawlerCheck[];
  llmsTxt: LlmsTxtReport;
  llmsFullTxt: LlmsTxtReport;
  raw: { llmsTxt: FetchResult; llmsFullTxt: FetchResult };
}

/** Needs a parsed robots.txt; fetches /llms.txt and /llms-full.txt. */
export const aiReadinessAdapter: SourceAdapter<{ origin: string; robots: Robots }, AiReadiness> = {
  id: "ai-readiness",
  label: "AI-crawler robots check + llms.txt / llms-full.txt",
  category: "ai-readiness",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run({ origin, robots }, ctx: AdapterContext): Promise<AiReadiness> {
    const llmsUrl = `${origin}/llms.txt`;
    const fullUrl = `${origin}/llms-full.txt`;
    const llms = await ctx.fetch(llmsUrl, { source: "llms-txt", ttlMs: TTL.page });
    const full = await ctx.fetch(fullUrl, { source: "llms-txt", ttlMs: TTL.page });
    return {
      origin,
      crawlers: checkAiCrawlers(robots, origin),
      llmsTxt: llmsReportFrom(llmsUrl, llms),
      llmsFullTxt: llmsReportFrom(fullUrl, full, true),
      raw: { llmsTxt: llms, llmsFullTxt: full },
    };
  },
};
