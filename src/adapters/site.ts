// robots.txt (RFC 9309 style matching) and sitemap.xml parsing.

import * as cheerio from "cheerio";
import type { AdapterContext, FetchResult, SourceAdapter } from "../core/types.js";
import { TTL } from "../core/cache.js";

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface Robots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

/** Parse robots.txt into groups of user-agents with allow/disallow rules. */
export function parseRobots(txt: string): Robots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of String(txt ?? "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = (m[1] as string).toLowerCase();
    const val = (m[2] as string).trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") sitemaps.push(val);
    else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ allow: key === "allow", path: val });
    }
  }
  return { groups, sitemaps };
}

function ruleMatches(path: string, rulePath: string): boolean {
  if (!rulePath) return false;
  const anchored = rulePath.endsWith("$");
  const body = anchored ? rulePath.slice(0, -1) : rulePath;
  const pattern = body
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

/**
 * Groups that apply to `agent`: every group naming its product token
 * (case-insensitive), else the `*` groups. Returns [] if none apply.
 */
export function groupsFor(robots: Robots, agent: string): { groups: RobotsGroup[]; explicit: boolean } {
  const token = agent.toLowerCase();
  const named = robots.groups.filter((g) => g.agents.includes(token));
  if (named.length) return { groups: named, explicit: true };
  return { groups: robots.groups.filter((g) => g.agents.includes("*")), explicit: false };
}

/** Longest-match allow/disallow for `agent`. Empty Disallow allows all; ties go to Allow. */
export function isAllowed(robots: Robots, agent: string, url: string): boolean {
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return true;
  }
  const rules = groupsFor(robots, agent).groups.flatMap((g) => g.rules);
  let best: RobotsRule | null = null;
  for (const r of rules) {
    if (!ruleMatches(path, r.path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

export interface Sitemap {
  kind: "urlset" | "index" | "unknown";
  locs: string[];
}

/** Parse a sitemap or sitemap index. */
export function parseSitemap(xml: string): Sitemap {
  const s = String(xml ?? "");
  const kind = /<sitemapindex\b/i.test(s) ? "index" : /<urlset\b/i.test(s) ? "urlset" : "unknown";
  const $ = cheerio.load(s, { xml: true });
  const locs = $("loc")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  return { kind, locs };
}

export interface SiteFiles {
  origin: string;
  robotsFetch: FetchResult;
  robots: Robots;
  sitemapSources: Array<{ url: string; kind: string; locs: number }>;
  sitemapUrls: string[];
}

/** robots.txt plus up to `maxSitemaps` sitemap files for an origin. */
export const siteFilesAdapter: SourceAdapter<{ origin: string; maxSitemaps?: number }, SiteFiles> = {
  id: "robots-sitemap",
  label: "robots.txt + sitemap.xml",
  category: "site",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  async run({ origin, maxSitemaps = 5 }, ctx: AdapterContext): Promise<SiteFiles> {
    const robotsFetch = await ctx.fetch(`${origin}/robots.txt`, { source: "robots", ttlMs: TTL.page });
    const robots = parseRobots(robotsFetch.ok && !/<html/i.test(robotsFetch.body) ? robotsFetch.body : "");
    const queue = robots.sitemaps.length ? [...robots.sitemaps] : [`${origin}/sitemap.xml`];
    const sitemapSources: SiteFiles["sitemapSources"] = [];
    const sitemapUrls: string[] = [];
    for (let i = 0; i < queue.length && i < maxSitemaps; i++) {
      const url = queue[i] as string;
      const r = await ctx.fetch(url, { source: "sitemap", ttlMs: TTL.page });
      if (!r.ok) continue;
      const sm = parseSitemap(r.body);
      if (sm.kind === "unknown") continue;
      sitemapSources.push({ url, kind: sm.kind, locs: sm.locs.length });
      if (sm.kind === "index") queue.push(...sm.locs);
      else sitemapUrls.push(...sm.locs);
    }
    return { origin, robotsFetch, robots, sitemapSources, sitemapUrls };
  },
};
