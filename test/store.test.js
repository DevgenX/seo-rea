import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Cache, DAY_MS } from '../src/cache.js';
import { appendLedger, BudgetError, DataForSEO, readLedger, splitCsvLine } from '../src/dataforseo.js';
import { EvidenceStore } from '../src/evidence.js';
import { politeFetch, RateLimiter } from '../src/http.js';

const tmp = () => mkdtemp(join(tmpdir(), 'seo-rea-test-'));

test('cache honours TTL and spans month boundaries', async () => {
  const dir = await tmp();
  let now = new Date('2026-01-31T12:00:00Z');
  const c = new Cache(dir, { now: () => now });
  await c.set('serp', 'q', { body: 'x' });
  now = new Date('2026-02-03T12:00:00Z');
  assert.equal((await c.get('serp', 'q', 7 * DAY_MS)).body, 'x');
  now = new Date('2026-02-09T12:00:00Z');
  assert.equal(await c.get('serp', 'q', 7 * DAY_MS), null);
  assert.equal(await new Cache(dir, { disabled: true }).get('serp', 'q', 99 * DAY_MS), null);
});

test('evidence store numbers items and writes index.md', async () => {
  const dir = await tmp();
  const ev = await new EvidenceStore(dir).load();
  const a = await ev.add({ source: 'SERP Bing', url: 'https://bing.com', ext: 'html', content: '<html></html>' });
  const b = await ev.add({ source: 'adlib', kind: 'manual-check', content: { x: 1 } });
  assert.equal(a.id, 'E001');
  assert.equal(a.file, 'E001-serp-bing.html');
  assert.equal(b.id, 'E002');
  const again = await new EvidenceStore(dir).load();
  assert.equal(again.nextId(), 'E003');
  const md = await readFile(join(dir, 'evidence', 'index.md'), 'utf8');
  assert.match(md, /\| E002 \| adlib \| manual-check \|/);
});

test('ledger CSV round-trips quoted queries', async () => {
  const path = join(await tmp(), 'ledger.csv');
  await appendLedger(path, { date: '2026-10-01T00:00:00Z', runId: 'r1', endpoint: 'serp', query: '{"keyword":"a, \\"b\\""}', usd: 0.002 });
  await appendLedger(path, { date: '2026-10-02T00:00:00Z', runId: 'r2', endpoint: 'serp', query: 'x', usd: 0.01 });
  const rows = await readLedger(path);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].query, '{"keyword":"a, \\"b\\""}');
  assert.equal(rows[1].usd, 0.01);
  assert.deepEqual(splitCsvLine('"a,b",c,"d""e"'), ['a,b', 'c', 'd"e']);
});

const creds = { DATAFORSEO_LOGIN: 'user', DATAFORSEO_PASSWORD: 'pass' };
const noFetch = () => {
  throw new Error('network must not be called');
};

test('DataForSEO refuses calls when budget is 0 or creds are missing', async () => {
  const ledgerPath = join(await tmp(), 'ledger.csv');
  const zero = new DataForSEO({ budgetUsd: 0, ledgerPath, runId: 'r', env: creds, fetchImpl: noFetch });
  assert.equal(zero.enabled, false);
  await assert.rejects(zero.serp('kw'), BudgetError);
  const noCreds = new DataForSEO({ budgetUsd: 1, ledgerPath, runId: 'r', env: {}, fetchImpl: noFetch });
  await assert.rejects(noCreds.serp('kw'), /DATAFORSEO_LOGIN/);
});

test('DataForSEO enforces run budget and monthly cap from the ledger, and caches', async () => {
  const dir = await tmp();
  const ledgerPath = join(dir, 'ledger.csv');
  const cache = new Cache(join(dir, 'cache'));
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls++;
    assert.match(init.headers.authorization, /^Basic /);
    return new Response(JSON.stringify({ status_code: 20000, cost: 0.002, tasks: [{ result: [{ items: [{ type: 'organic', url: 'https://a.com/', title: 'A' }, { type: 'paid', url: 'https://ad.com/' }, { type: 'people_also_ask' }] }] }] }), { status: 200 });
  };
  const now = () => new Date('2026-10-14T00:00:00Z');
  const d = new DataForSEO({ budgetUsd: 0.003, ledgerPath, runId: 'r1', cache, env: creds, fetchImpl, now });
  const r = await d.serp('kw');
  assert.deepEqual(r.organic, [{ position: 1, url: 'https://a.com/', title: 'A', snippet: '' }]);
  assert.deepEqual(r.features, ['paid', 'people_also_ask']);
  assert.equal((await d.serp('kw')).fromCache, true);
  assert.equal(calls, 1);
  await assert.rejects(d.serp('other kw'), /run budget would be exceeded/);
  const monthly = new DataForSEO({ budgetUsd: 1, monthlyCapUsd: 0.003, ledgerPath, runId: 'r2', cache, env: creds, fetchImpl, now });
  await assert.rejects(monthly.serp('third kw'), /monthly cap/);
  assert.equal(calls, 1);
  assert.equal((await readLedger(ledgerPath)).length, 1);
});

test('politeFetch never throws and caches only successes', async () => {
  const dir = await tmp();
  const cache = new Cache(dir);
  let n = 0;
  const ok = async () => {
    n++;
    return new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const a = await politeFetch('https://x.test/', { cache, ttlMs: DAY_MS, fetchImpl: ok });
  const b = await politeFetch('https://x.test/', { cache, ttlMs: DAY_MS, fetchImpl: ok });
  assert.equal(a.body, '<html>ok</html>');
  assert.equal(b.fromCache, true);
  assert.equal(n, 1);
  const bad = await politeFetch('https://y.test/', { cache, ttlMs: DAY_MS, fetchImpl: async () => { throw new Error('boom'); } });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'boom');
});

test('RateLimiter spaces requests to the same host', async () => {
  let clock = 0;
  const waits = [];
  const rl = new RateLimiter(1000, { now: () => clock, wait: async (ms) => { waits.push(ms); clock += ms; } });
  await Promise.all([rl.schedule('h', async () => {}), rl.schedule('h', async () => {}), rl.schedule('other', async () => {})]);
  assert.deepEqual(waits, [1000]);
});
