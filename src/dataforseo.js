// Optional paid module. Credentials come from the environment only
// (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD). Every call is cached and logged
// to ledger.csv; calls are refused when the budget is 0 or would be exceeded.

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { TTL } from './cache.js';

const API = 'https://api.dataforseo.com/v3';

// Conservative per-call estimates used for the pre-call budget check.
export const ESTIMATES = {
  'serp/google/organic/live/regular': 0.002,
  'dataforseo_labs/google/ranked_keywords/live': 0.02,
};

export class BudgetError extends Error {}

const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

export function splitCsvLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      cells.push(cur);
      cur = '';
    } else cur += c;
  }
  cells.push(cur);
  return cells;
}

/** ledger.csv: date,run_id,endpoint,query,usd */
export async function readLedger(path) {
  let txt = '';
  try {
    txt = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  return txt
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [date, runId, endpoint, query, usd] = splitCsvLine(line);
      return { date, runId, endpoint, query, usd: Number(usd) || 0 };
    });
}

export async function appendLedger(path, row) {
  await mkdir(dirname(path), { recursive: true });
  let exists = true;
  try {
    await readFile(path);
  } catch {
    exists = false;
  }
  const header = exists ? '' : 'date,run_id,endpoint,query,usd\n';
  await appendFile(path, `${header}${[row.date, row.runId, row.endpoint, row.query].map(csvCell).join(',')},${Number(row.usd).toFixed(4)}\n`);
}

export function credentialsFromEnv(env = process.env) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  return login && password ? { login, password } : null;
}

export class DataForSEO {
  constructor({ budgetUsd = 0, monthlyCapUsd = Infinity, ledgerPath, runId, cache, env = process.env, fetchImpl = fetch, now = () => new Date() }) {
    this.budgetUsd = Number(budgetUsd) || 0;
    this.monthlyCapUsd = monthlyCapUsd;
    this.ledgerPath = ledgerPath;
    this.runId = runId;
    this.cache = cache;
    this.creds = credentialsFromEnv(env);
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  get enabled() {
    return this.budgetUsd > 0 && Boolean(this.creds);
  }

  async spent() {
    const rows = await readLedger(this.ledgerPath);
    const month = this.now().toISOString().slice(0, 7);
    return {
      run: rows.filter((r) => r.runId === this.runId).reduce((s, r) => s + r.usd, 0),
      month: rows.filter((r) => r.date.startsWith(month)).reduce((s, r) => s + r.usd, 0),
    };
  }

  async checkBudget(endpoint) {
    if (this.budgetUsd <= 0) throw new BudgetError('paid calls disabled: budget is 0');
    if (!this.creds) throw new BudgetError('paid calls disabled: DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD not set');
    const est = ESTIMATES[endpoint] ?? 0.05;
    const { run, month } = await this.spent();
    if (run + est > this.budgetUsd) throw new BudgetError(`run budget would be exceeded (${run.toFixed(4)} + ~${est} > ${this.budgetUsd})`);
    if (month + est > this.monthlyCapUsd) throw new BudgetError(`monthly cap would be exceeded (${month.toFixed(4)} + ~${est} > ${this.monthlyCapUsd})`);
  }

  /** POST one task. Returns { data, costUsd, fromCache }. Throws BudgetError before spending. */
  async call(endpoint, task) {
    const query = JSON.stringify(task);
    const hit = await this.cache?.get(`dataforseo:${endpoint}`, query, endpoint.startsWith('serp/') ? TTL.serp : TTL.api);
    if (hit) return { data: hit.data, costUsd: 0, fromCache: true };
    await this.checkBudget(endpoint);
    const auth = Buffer.from(`${this.creds.login}:${this.creds.password}`).toString('base64');
    const res = await this.fetchImpl(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify([task]),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    const costUsd = Number(data?.cost) || 0;
    await appendLedger(this.ledgerPath, { date: this.now().toISOString(), runId: this.runId, endpoint, query, usd: costUsd });
    if (!res.ok || data?.status_code !== 20000) throw new Error(`DataForSEO ${endpoint}: ${data?.status_message ?? res.status}`);
    await this.cache?.set(`dataforseo:${endpoint}`, query, { data });
    return { data, costUsd, fromCache: false };
  }

  async serp(keyword, { locationCode = 2840, languageCode = 'en', depth = 10 } = {}) {
    const r = await this.call('serp/google/organic/live/regular', { keyword, location_code: locationCode, language_code: languageCode, depth });
    const items = r.data?.tasks?.[0]?.result?.[0]?.items ?? [];
    return {
      ...r,
      organic: items.filter((i) => i.type === 'organic').map((i, n) => ({ position: n + 1, url: i.url, title: i.title ?? '', snippet: i.description ?? '' })),
      ads: items.filter((i) => i.type === 'paid').map((i) => ({ url: i.url, title: i.title ?? '', snippet: i.description ?? '' })),
      features: [...new Set(items.map((i) => i.type).filter((t) => t !== 'organic'))],
    };
  }

  async rankedKeywords(domain, { locationCode = 2840, languageCode = 'en', limit = 100 } = {}) {
    const r = await this.call('dataforseo_labs/google/ranked_keywords/live', { target: domain, location_code: locationCode, language_code: languageCode, limit });
    const items = r.data?.tasks?.[0]?.result?.[0]?.items ?? [];
    return { ...r, keywords: items.map((i) => ({ keyword: i.keyword_data?.keyword, volume: i.keyword_data?.keyword_info?.search_volume ?? null, position: i.ranked_serp_element?.serp_item?.rank_group ?? null })) };
  }
}
