#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseUrlList, recordCitation } from '../src/cite.js';
import { runTeardown } from '../src/teardown.js';

const HELP = `seo-rea - reverse engineer why pages rank (evidence first, free first)

Usage:
  seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [options]
  seo-rea cite --out <dir> --engine <chatgpt|perplexity|gemini|claude|copilot|google-ai-overview|other>
               --prompt "<prompt>" --urls "<url1,url2,...>" [--note "<text>"]

Teardown options:
  --budget-usd <n>       Paid API cap for this run (default 0 = free sources only)
  --monthly-cap-usd <n>  Optional monthly cap summed from ledger.csv
  --top <n>              Ranking pages to fetch (default 8)
  --crawl <n>            Target pages to crawl (default 10)
  --engines <list>       SERP engines in order (default duckduckgo,bing,google)
  --serp-html <file>     SERP page saved from a browser (DuckDuckGo, Bing or Google); repeatable
  --serp-urls <list>     Ranking URLs in order, comma separated, as seen in a browser search
  --delay-ms <n>         Minimum gap between requests to one host (default 1500)
  --cache-dir <dir>      Cache folder (default .seo-rea/cache)
  --ledger <file>        Paid-call ledger (default .seo-rea/ledger.csv)
  --no-cache             Ignore and do not write the cache
  --force                Replace an existing run in --out

Paid calls (DataForSEO) read DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD from the environment only.
`;

function fail(msg) {
  process.stderr.write(`seo-rea: ${msg}\n\n${HELP}`);
  process.exit(2);
}

const num = (v, name) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) fail(`--${name} must be a non-negative number`);
  return n;
};

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP);
    return;
  }
  if (cmd === 'teardown') {
    const { values: v } = parseArgs({
      args: rest,
      options: {
        keyword: { type: 'string' },
        target: { type: 'string' },
        out: { type: 'string' },
        'budget-usd': { type: 'string', default: '0' },
        'monthly-cap-usd': { type: 'string' },
        top: { type: 'string', default: '8' },
        crawl: { type: 'string', default: '10' },
        engines: { type: 'string', default: 'duckduckgo,bing,google' },
        'serp-html': { type: 'string', multiple: true, default: [] },
        'serp-urls': { type: 'string' },
        'delay-ms': { type: 'string', default: '1500' },
        'cache-dir': { type: 'string', default: '.seo-rea/cache' },
        ledger: { type: 'string', default: '.seo-rea/ledger.csv' },
        'no-cache': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
      },
    });
    if (!v.keyword || !v.target || !v.out) fail('teardown needs --keyword, --target and --out');
    const out = resolve(v.out);
    const { run, claims } = await runTeardown(
      {
        keyword: v.keyword,
        target: v.target,
        out,
        budgetUsd: num(v['budget-usd'], 'budget-usd'),
        monthlyCapUsd: num(v['monthly-cap-usd'], 'monthly-cap-usd') ?? Infinity,
        top: num(v.top, 'top'),
        crawl: num(v.crawl, 'crawl'),
        engines: v.engines.split(',').map((s) => s.trim()).filter(Boolean),
        serpHtml: v['serp-html'].map((f) => resolve(f)),
        serpUrls: parseUrlList(v['serp-urls']),
        delayMs: num(v['delay-ms'], 'delay-ms'),
        cacheDir: resolve(v['cache-dir']),
        ledgerPath: resolve(v.ledger),
        noCache: v['no-cache'],
        force: v.force,
      },
      (m) => process.stderr.write(`  ${m}\n`),
    );
    const ok = run.competitors.filter((c) => c.page).length;
    process.stdout.write(
      `Teardown written: ${join(out, 'report', 'teardown.md')}\n` +
        `  SERP: ${run.serp.organic.length} results from ${run.serp.primaryLabel || 'no engine'}; pages analysed: ${ok}/${run.competitors.length}; target pages: ${run.target.pages.length}\n` +
        `  Claims: ${claims.length}; spent ${run.spentUsd.toFixed(4)} USD of ${run.budgetUsd}\n`,
    );
    return;
  }
  if (cmd === 'cite') {
    const { values: v } = parseArgs({
      args: rest,
      options: { out: { type: 'string' }, engine: { type: 'string' }, prompt: { type: 'string' }, urls: { type: 'string', default: '' }, note: { type: 'string', default: '' } },
    });
    if (!v.out || !v.engine || !v.prompt) fail('cite needs --out, --engine and --prompt');
    const { item, content, rerendered } = await recordCitation({ out: resolve(v.out), engine: v.engine, prompt: v.prompt, urls: v.urls, note: v.note });
    process.stdout.write(`Recorded ${item.id}: ${content.urls.length} URL(s) from ${content.engine}${rerendered ? '; teardown.md updated' : ''}\n`);
    return;
  }
  fail(`unknown command "${cmd}"`);
}

main(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`seo-rea: ${err.message}\n`);
  process.exit(1);
});
