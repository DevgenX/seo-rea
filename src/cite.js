import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EvidenceStore } from './evidence.js';
import { domainOf } from './report.js';
import { writeReports } from './teardown.js';

export const AI_ENGINES = ['chatgpt', 'perplexity', 'gemini', 'claude', 'copilot', 'google-ai-overview', 'other'];

/** Split a --urls value on commas, whitespace or newlines; keep valid http(s) URLs. */
export function parseUrlList(s) {
  return String(s ?? '')
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) && domainOf(u));
}

/**
 * Record one AI answer's citations as evidence. If the folder holds a teardown
 * run, the report is re-rendered so the AI-citation table updates.
 */
export async function recordCitation({ out, engine, prompt, urls, note = '' }) {
  if (!AI_ENGINES.includes(engine)) throw new Error(`--engine must be one of: ${AI_ENGINES.join(', ')}`);
  if (!prompt) throw new Error('--prompt is required');
  const list = parseUrlList(urls);
  const ev = await new EvidenceStore(out).load();
  const content = { engine, prompt, urls: list, domains: [...new Set(list.map(domainOf))], recordedAt: new Date().toISOString(), method: 'manual entry by operator', note };
  const item = await ev.add({ source: `cite-${engine}`, kind: 'citation', url: '', note: `${list.length} cited URL(s): ${prompt.slice(0, 60)}`, content });

  let rerendered = false;
  try {
    const run = JSON.parse(await readFile(join(out, 'data', 'run.json'), 'utf8'));
    await writeReports(out, run, ev);
    rerendered = true;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return { item, content, rerendered };
}
