# CLI reference

```
seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [options]
seo-rea audit <domain|url> [--out <dir>] [--no-psi] [--lighthouse] [--json]
seo-rea cite --out <dir> --engine <engine> --prompt "<prompt>" --urls "<url1,url2>" [--note "<text>"]
seo-rea mcp
seo-rea doctor [--json]
seo-rea --version | help
```

Exit codes: 0 success, 1 runtime error, 2 usage error.

## teardown

Builds the full report for one keyword and one target domain.

| Option                  | Default                  | Meaning                                                                                       |
| ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| `--keyword`             | required                 | Search query                                                                                  |
| `--target`              | required                 | Your domain (scheme, `www.` and path are stripped)                                            |
| `--out`                 | required                 | Output folder                                                                                 |
| `--budget-usd <n>`      | `0`                      | Paid API cap for this run. 0 refuses every paid call                                          |
| `--monthly-cap-usd <n>` | none                     | Monthly cap summed from the ledger                                                            |
| `--top <n>`             | `8`                      | Ranking pages to analyse                                                                      |
| `--crawl <n>`           | `10`                     | Target pages to crawl                                                                         |
| `--engines <list>`      | `google,bing,duckduckgo` | Engines in order, or `none`                                                                   |
| `--no-browser`          | off                      | Skip the headless-browser path                                                                |
| `--serp-urls <list>`    | none                     | Ranking URLs in order, comma separated; used as the primary list                              |
| `--serp-html <file>`    | none                     | Results page saved from a browser; repeatable                                                 |
| `--adlib-capture`       | off                      | Screenshot ad libraries and read visible counts (needs the browser)                           |
| `--no-psi`              | off                      | Skip PageSpeed Insights                                                                       |
| `--lighthouse`          | off                      | Also run local Lighthouse if installed                                                        |
| `--delay-ms <n>`        | `3000`                   | Minimum gap between requests to one host. Search engines and ad libraries never go below 3000 |
| `--cache-dir <dir>`     | `.seo-rea/cache`         | Cache folder                                                                                  |
| `--ledger <file>`       | `.seo-rea/ledger.csv`    | Paid-call ledger                                                                              |
| `--no-cache`            | off                      | Do not read or write the cache                                                                |
| `--force`               | off                      | Replace an existing run in `--out`                                                            |

Example from this repo:

```sh
seo-rea teardown --keyword "credit card rewards app" --target getcardlab.app \
  --out examples/cardlab-teardown --budget-usd 0 --force --adlib-capture
```

Output:

```
<out>/evidence/E001-... .. index.json, index.md
<out>/report/teardown.md, ledger.md, questions.md
<out>/data/run.json
```

## audit

Single-site AEO checks: homepage (or the URL given) on-page facts and JSON-LD
validation, robots.txt and sitemap, AI-crawler access, `/llms.txt`,
`/llms-full.txt`, PageSpeed Insights. Writes `report/audit.md`,
`report/ledger.md` and `data/audit.json`. Each run replaces the previous audit
in the folder. Default `--out`: `./seo-rea-runs/audit-<domain>`.

```sh
seo-rea audit getcardlab.app --out examples/cardlab-audit
seo-rea audit https://example.com/pricing --json
```

## cite

Records which URLs an AI answer cited. No network calls. If `--out` holds a
teardown, the report is re-rendered with the new row.

Engines: `chatgpt`, `perplexity`, `gemini`, `claude`, `copilot`,
`google-ai-overview`, `grok`, `other`.

```sh
seo-rea cite --out examples/cardlab-teardown --engine perplexity \
  --prompt "best credit card rewards app" \
  --urls "https://www.cnbc.com/select/best-apps-for-tracking-your-credit-card-rewards/,https://maxrewards.com/"
```

## mcp

Starts the MCP server on stdio. See [mcp.md](mcp.md).

## doctor

Lists every adapter and whether it can run here (browser installed, Lighthouse
installed, PSI key set, DataForSEO credentials set). It reports whether a key
is set, never its value.

## Environment

| Variable                                  | Used by            | Notes                                 |
| ----------------------------------------- | ------------------ | ------------------------------------- |
| `PSI_API_KEY`                             | PageSpeed Insights | Optional free key; sent as a header   |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | DataForSEO         | Only used with `--budget-usd` above 0 |
