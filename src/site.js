// robots.txt and sitemap.xml parsing.

import { decodeEntities } from './html.js';

/** Parse robots.txt into { groups: [{ agents, rules:[{allow,path}] }], sitemaps }. */
export function parseRobots(txt) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(txt ?? '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') sitemaps.push(val);
    else if ((key === 'allow' || key === 'disallow') && current) current.rules.push({ allow: key === 'allow', path: val });
  }
  return { groups, sitemaps };
}

function ruleMatches(path, rulePath) {
  if (!rulePath) return false;
  const anchored = rulePath.endsWith('$');
  const body = anchored ? rulePath.slice(0, -1) : rulePath;
  const re = new RegExp(`^${body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anchored ? '$' : ''}`);
  return re.test(path);
}

/** Longest-match allow/disallow for `agent` (falls back to `*`). Empty Disallow allows all. */
export function isAllowed(robots, agent, url) {
  let path;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return true;
  }
  const a = agent.toLowerCase();
  const group = robots.groups.find((g) => g.agents.some((x) => x !== '*' && a.includes(x))) ?? robots.groups.find((g) => g.agents.includes('*'));
  if (!group) return true;
  let best = null;
  for (const r of group.rules) {
    if (!ruleMatches(path, r.path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

/** Parse a sitemap or sitemap index: { kind: 'urlset'|'index'|'unknown', locs }. */
export function parseSitemap(xml) {
  const s = String(xml ?? '');
  const kind = /<sitemapindex\b/i.test(s) ? 'index' : /<urlset\b/i.test(s) ? 'urlset' : 'unknown';
  const locs = [];
  const re = /<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(s))) locs.push(decodeEntities(m[1].trim()));
  return { kind, locs };
}
