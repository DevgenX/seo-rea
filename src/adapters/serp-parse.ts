// SERP parsers (cheerio) shared by the HTML, Playwright and saved-file adapters.

import * as cheerio from "cheerio";
import type { EngineName, ParsedSerp, SerpAd, SerpResult } from "../core/types.js";

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

/** DuckDuckGo links look like //duckduckgo.com/l/?uddg=<encoded>&rut=... */
export function unwrapDuckDuckGo(href: string): string {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : u.toString();
  } catch {
    return href;
  }
}

/** Bing links look like https://www.bing.com/ck/a?...&u=a1<base64url>&ntb=1 */
export function unwrapBing(href: string): string {
  try {
    const u = new URL(href);
    if (!u.hostname.endsWith("bing.com") || !u.pathname.startsWith("/ck/")) return href;
    const enc = u.searchParams.get("u");
    if (!enc || !enc.startsWith("a1")) return href;
    return Buffer.from(enc.slice(2), "base64url").toString("utf8");
  } catch {
    return href;
  }
}

/** Google links are direct or /url?q=<target>. */
export function unwrapGoogle(href: string): string {
  if (href.startsWith("/url?")) return new URLSearchParams(href.slice(5)).get("q") ?? "";
  return href;
}

type Draft = Omit<SerpResult, "position">;

const TRACKING_PARAMS = /^(msockid|utm_[a-z]+|gclid|fbclid|srsltid)$/i;

/** Drop click-tracking parameters engines append to result URLs. */
export function stripTracking(url: string): string {
  try {
    const u = new URL(url);
    for (const k of Array.from(u.searchParams.keys())) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
}

function finalize(results: Draft[], ads: SerpAd[]): ParsedSerp {
  const seen = new Set<string>();
  const organic: SerpResult[] = [];
  for (const raw of results) {
    const r = { ...raw, url: stripTracking(raw.url) };
    if (!/^https?:\/\//.test(r.url) || seen.has(r.url)) continue;
    seen.add(r.url);
    organic.push({ position: organic.length + 1, ...r });
  }
  return { organic, ads };
}

export function parseDuckDuckGo(html: string): ParsedSerp {
  const $ = cheerio.load(html);
  const results: Draft[] = [];
  const ads: SerpAd[] = [];
  // html.duckduckgo.com layout
  $("div.result").each((_, el) => {
    const b = $(el);
    const a = b.find("a.result__a").first();
    if (!a.length) return;
    const item = {
      url: unwrapDuckDuckGo(a.attr("href") ?? ""),
      title: squash(a.text()),
      snippet: squash(b.find(".result__snippet").first().text()),
    };
    if (b.hasClass("result--ad")) ads.push(item);
    else results.push(item);
  });
  // duckduckgo.com (JavaScript) layout
  $('article[data-testid="result"]').each((_, el) => {
    const b = $(el);
    const a = b.find('a[data-testid="result-title-a"]').first();
    if (!a.length) return;
    results.push({
      url: unwrapDuckDuckGo(a.attr("href") ?? ""),
      title: squash(a.text()),
      snippet: squash(b.find('[data-result="snippet"]').first().text()),
    });
  });
  $('[data-testid="ad"]').each((_, el) => {
    const a = $(el).find("a[href]").first();
    if (a.length) ads.push({ url: unwrapDuckDuckGo(a.attr("href") ?? ""), title: squash(a.text()), snippet: "" });
  });
  return finalize(results, ads);
}

export function parseBing(html: string): ParsedSerp {
  const $ = cheerio.load(html);
  const results: Draft[] = [];
  const ads: SerpAd[] = [];
  $("li.b_algo, li.b_ad").each((_, el) => {
    const b = $(el);
    const isAd = b.hasClass("b_ad");
    const h2 = b.find("h2").first();
    const a = h2.find("a").first();
    if (!a.length) return;
    const item = {
      url: unwrapBing(a.attr("href") ?? ""),
      title: squash(h2.text()),
      snippet: squash(b.find("p").first().text()),
    };
    (isAd ? ads : results).push(item);
  });
  return finalize(results, ads);
}

export function parseGoogle(html: string): ParsedSerp {
  const $ = cheerio.load(html);
  const results: Draft[] = [];
  const ads: SerpAd[] = [];
  const adRoots = $("#tads, #tadsb, [data-text-ad]");
  adRoots.find("a[href]").each((_, el) => {
    const a = $(el);
    const title = squash(a.find('[role="heading"], h3').first().text());
    const url = unwrapGoogle(a.attr("href") ?? "");
    if (title && /^https?:\/\//.test(url) && !/google\./.test(url)) ads.push({ url, title, snippet: "" });
  });
  $("a[href]").each((_, el) => {
    const a = $(el);
    if (a.closest("#tads, #tadsb, [data-text-ad]").length) return;
    const title = squash(a.find("h3").first().text());
    if (!title) return;
    const url = unwrapGoogle(a.attr("href") ?? "");
    if (/^https?:\/\/(?:[a-z]+\.)?google\./i.test(url)) return;
    const block = a.closest("div.g, div[data-hveid], div.MjjYud");
    const snippet = squash(block.find('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]').first().text());
    results.push({ url, title, snippet });
  });
  return finalize(results, ads);
}

export const PARSERS: Record<EngineName, (html: string) => ParsedSerp> = {
  google: parseGoogle,
  bing: parseBing,
  duckduckgo: parseDuckDuckGo,
};

/** Blocks that are certain whatever else the page contains. */
export function detectHardBlock(engine: string, html: string, status: number, finalUrl = ""): string {
  if (status === 429) return "rate limited (HTTP 429)";
  if (status >= 400) return `HTTP ${status}`;
  const h = String(html ?? "");
  if (engine === "google") {
    if (/\/sorry\//.test(finalUrl) || /\/sorry\/index|id="captcha-form"/i.test(h))
      return "Google captcha (unusual traffic page)";
    if (/consent\.google\./.test(finalUrl)) return "Google consent page not dismissed";
    if (/enablejs|httpservice\/retry/i.test(h))
      return "Google requires JavaScript, consent or captcha for automated requests";
  }
  if (engine === "bing" && /id="b_captcha/i.test(h)) return "Bing challenge page";
  if (/anomaly-modal/i.test(h)) return "DuckDuckGo anomaly (bot check) page";
  return "";
}

/** Detect a block, captcha, JavaScript wall or consent page instead of results. */
export function detectBlock(engine: string, html: string, status: number, finalUrl = ""): string {
  const hard = detectHardBlock(engine, html, status, finalUrl);
  if (hard) return hard;
  const h = String(html ?? "");
  // Normal Bing pages also load the Turnstile script, so this only explains an empty page.
  if (engine === "bing" && /cf-turnstile|challenges\.cloudflare\.com/i.test(h)) return "Bing challenge page";
  if (/captcha|unusual traffic|are you a robot/i.test(h)) return "captcha or anomaly page";
  return "";
}

const QUERY_STOP = new Set(["the", "and", "for", "with", "best", "top", "how", "what", "are", "you", "your"]);
const stem = (w: string): string => w.replace(/(ies|es|s)$/, "");

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Share of results whose title/snippet/URL contain at least 3/4 of the query
 * terms. Engines that answer automated clients with results for only the first
 * word show up here as a very low score.
 */
export function serpRelevance(keyword: string, organic: Draft[]): number {
  const terms = [
    ...new Set(
      String(keyword)
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 2 && !QUERY_STOP.has(w))
        .map(stem),
    ),
  ];
  if (!organic.length) return 0;
  if (!terms.length) return 1;
  const need = Math.max(1, Math.ceil(terms.length * 0.75));
  const relevant = organic.filter((r) => {
    const hay = `${r.title} ${r.snippet} ${safeDecode(r.url).replace(/[-_/.]/g, " ")}`.toLowerCase();
    return terms.filter((t) => hay.includes(t)).length >= need;
  });
  return relevant.length / organic.length;
}

export const MIN_RELEVANCE = 0.3;

/** Detect the engine of a saved SERP page (browser "Save as HTML"). */
export function detectEngine(html: string): EngineName | "" {
  if (/result__a|duckduckgo/i.test(html)) return "duckduckgo";
  if (/class="b_algo/i.test(html)) return "bing";
  if (/google\./i.test(html)) return "google";
  return "";
}

export interface Judgement {
  parsed: ParsedSerp;
  relevance: number;
  problem: string;
}

/** Parse a SERP body and decide whether it is usable. */
export function judgeSerp(engine: EngineName, keyword: string, body: string, status: number, finalUrl = ""): Judgement {
  const blocked = detectHardBlock(engine, body, status, finalUrl);
  const parsed: ParsedSerp = blocked ? { organic: [], ads: [] } : PARSERS[engine](body);
  const relevance = serpRelevance(keyword, parsed.organic);
  let problem = blocked;
  // Words like "captcha" also appear in normal pages' scripts, so the soft
  // check only explains an empty result list.
  if (!problem && !parsed.organic.length) {
    problem = detectBlock(engine, body, status, finalUrl) || "no results parsed (layout change or block)";
  }
  if (!problem && relevance < MIN_RELEVANCE) {
    problem = `degraded: only ${Math.round(relevance * 100)}% of results match the query terms (likely a bot-degraded SERP)`;
  }
  return { parsed, relevance, problem };
}
