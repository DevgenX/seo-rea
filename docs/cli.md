# CLI reference

```
seo-rea <domain> [--vs <domain>] [--out <dir>] [--budget-usd 0] [options] [--json]
seo-rea strategy <domain> [--vs <domain>] ...
seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [options] [--json]
seo-rea crawl <domain> [--out <dir>] [--max-pages 500] [--max-depth 10] [--delay-ms 500] [--force] [--json]
seo-rea diff <older-run> <newer-run> [--out <dir>] [--json]
seo-rea audit <domain|url> [--out <dir>] [--no-psi] [--lighthouse] [--json]
seo-rea batch --sites <file.json|file.csv> [--out <dir>] [--site-delay-ms <n>] [options] [--json]
seo-rea cite --out <dir> --engine <engine> --prompt "<prompt>" --urls "<url1,url2>" [--note "<text>"]
seo-rea mcp
seo-rea doctor [--json]
seo-rea --version | help
```

Exit codes: 0 success, 1 runtime error, 2 usage error. Every failure has a
stable code; see [error-codes.md](error-codes.md).

## strategy (also `seo-rea <domain>`)

Builds the Strategy Dossier: why a site leads, from free sources. A bare
domain as the first argument runs this command.

| Option     | Default                                    | Meaning                                                                       |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| `<domain>` | required                                   | Domain to analyse                                                             |
| `--vs`     | none                                       | Second domain; roles (leader, challenger) come from the evidence              |
| `--out`    | `seo-rea-runs/strategy-<domain>[-vs-<vs>]` | Output folder                                                                 |
| `--crawl`  | `30`                                       | Pages fetched per site (up to 200 URLs are mapped from sitemaps and nav)      |
| `--terms`  | `10`                                       | Head terms checked in SERPs; split 6/4 with `--vs`, plus one brand query each |
| `--json`   | off                                        | Print `report/strategy.json` to stdout; progress goes to stderr               |

It also takes the run options of `teardown` (`--budget-usd`,
`--monthly-cap-usd`, `--engines`, `--no-browser`, `--no-psi`, `--lighthouse`,
`--adlib-capture`, `--delay-ms`, `--cache-dir`, `--ledger`, `--no-cache`,
`--force`).

Writes `report/strategy.md`, `report/strategy.json` (schema
[strategy-schema.json](strategy-schema.json), `npm run strategy-schema`
regenerates it), `evidence/` and `data/strategy-run.json`. A search engine
that answers with a captcha, consent wall, HTTP 403 or 429 is not asked again
in the same run; terms it could not check are listed as unknown.

## crawl

Crawls a whole site (1-5000 pages), robots.txt respected, resumable. Full
reference: [crawl.md](crawl.md).

| Option        | Default                       | Meaning                             |
| ------------- | ----------------------------- | ----------------------------------- |
| `<domain>`    | required                      | Site to crawl                       |
| `--out`       | `seo-rea-runs/crawl-<domain>` | Output folder (state in `data/`)    |
| `--max-pages` | `500`                         | Page limit, 1-5000                  |
| `--max-depth` | `10`                          | Link depth limit from the home page |
| `--delay-ms`  | `500`                         | Minimum gap between requests        |
| `--force`     | off                           | Start over instead of resuming      |
| `--json`      | off                           | Print `report/crawl.json` to stdout |

## diff

Fixed / new / regressed / improved findings between two runs of the same
command for the same domain, matched by stable issue id. Full reference:
[diff.md](diff.md).

| Option        | Default  | Meaning                                |
| ------------- | -------- | -------------------------------------- |
| `<older-run>` | required | Run folder or report JSON              |
| `<newer-run>` | required | Run folder or report JSON              |
| `--out`       | none     | Write `report/diff.md` and `diff.json` |
| `--json`      | off      | Print the diff JSON to stdout          |

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
| `--json`                | off                      | Print `report/dossier.json` to stdout; progress goes to stderr                                |

Example from this repo:

```sh
seo-rea teardown --keyword "credit card rewards app" --target getcardlab.app \
  --out examples/cardlab-teardown --budget-usd 0 --force --adlib-capture
```

Output:

```
<out>/evidence/E001-... .. index.json, index.md
<out>/report/teardown.md, dossier.json, ledger.md, questions.md
<out>/data/run.json
```

`report/dossier.json` follows [dossier-schema.json](dossier-schema.json)
(`schemaVersion: "1"`) and is validated before it is written. `topActions`
holds up to 10 actions ranked by impact, then effort, each with `why`,
`evidenceIds`, `effort` (S/M/L), `impact` (low/medium/high) and an `owner`
hint (content/dev/seo). After a schema change, regenerate the file with
`npm run dossier-schema`.

## audit

Single-site AEO checks: homepage (or the URL given) on-page facts and JSON-LD
validation, robots.txt and sitemap, AI-crawler access, `/llms.txt`,
`/llms-full.txt`, PageSpeed Insights. Writes `report/audit.md`,
`report/dossier.json`, `report/ledger.md` and `data/audit.json`. `--json`
prints the dossier (before 0.3.0 it printed `data/audit.json`). Each run replaces the previous audit
in the folder. Default `--out`: `./seo-rea-runs/audit-<domain>`.

```sh
seo-rea audit getcardlab.app --out examples/cardlab-audit
seo-rea audit https://example.com/pricing --json
```

## batch

Runs `audit` for every site in a sites file and `teardown` for sites that have
a keyword, one site at a time with a pause between sites. Takes the teardown
options (budget, engines, `--no-browser`, `--no-psi`, `--delay-ms`, cache,
ledger, `--force`) except `--keyword`, `--target` and the `--serp-*` flags.

| Option                | Default  | Meaning                                     |
| --------------------- | -------- | ------------------------------------------- |
| `--sites <file>`      | required | `.json` list or `.csv` with a `site` column |
| `--out <dir>`         | `out`    | Output folder                               |
| `--site-delay-ms <n>` | `5000`   | Pause between sites                         |
| `--json`              | off      | Print `summary.json` to stdout              |

Sites file, JSON (`domain` works as an alias for `site`):

```json
{ "sites": [{ "name": "CardLab", "site": "getcardlab.app", "keyword": "credit card rewards app" }] }
```

CSV (header required, `keyword` and `name` optional):

```csv
site,keyword,name
getcardlab.app,credit card rewards app,CardLab
```

A `site` of `TODO` (or empty) is skipped; a `keyword` of `TODO` runs the audit
only. Output:

```
<out>/<site>/audit/...       report/audit.md, report/dossier.json
<out>/<site>/teardown/...    report/teardown.md, report/dossier.json (sites with a keyword)
<out>/summary.json           per-site status, report paths, top 3 actions, paid spend
<out>/summary.md             the same as a table
```

`--budget-usd` applies to each teardown; use `--monthly-cap-usd` to cap the
month across runs. Exit code 1 if any site failed completely.

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
