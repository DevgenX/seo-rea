# seo-rea handoff for the SEO & AEO Desk

## What it is

seo-rea is a command-line tool that checks a site for search and AI-search
readiness and compares it with the pages that rank for a keyword. Every
finding points at saved evidence (E001, E002, ...). It costs nothing by
default: paid data sources are refused unless you raise the budget.

Per site you get `report/dossier.json` (machine-readable, schema in
`docs/dossier-schema.json`, `schemaVersion: "1"`) and a Markdown report with a
"Top 10 actions" table at the top.

## Install (once per box)

```sh
git clone https://github.com/DevgenX/seo-rea /workspace/seo-rea && cd /workspace/seo-rea && npm ci && npm run build && node dist/cli.js doctor
npx playwright install chromium   # optional: browser SERPs; without it, plain HTML SERPs or --serp-urls
```

Update later with `git pull && npm ci && npm run build`.

## Weekly audit recipe

1. Keep the site list in a file based on `examples/desk-sites.example.json`
   (`name`, `site`, `keyword`). Entries whose `site` is `TODO` are skipped;
   fill in a domain only when it is confirmed.
2. Run from `/workspace/seo-rea`:

   ```sh
   node dist/cli.js batch --sites desk-sites.json --out out/$(date +%F) --budget-usd 0
   ```

3. Results:
   - `out/<date>/summary.json` and `summary.md`: status per site and its top 3
     actions.
   - `out/<date>/<site>/audit/report/dossier.json` and `audit.md`: site checks.
   - `out/<date>/<site>/teardown/report/dossier.json` and `teardown.md`:
     keyword comparison (sites with a keyword).
   - `.../evidence/index.json`: the evidence behind every ID.

## Weekly strategy recipe

The audit says what is broken on a site. The strategy dossier says why a site
leads and what to copy. Run it weekly, after the batch, one site at a time:

1. Each desk site on its own:

   ```sh
   node dist/cli.js getcardlab.app --out out/$(date +%F)/getcardlab.app/strategy --budget-usd 0
   ```

2. Each desk site against its key competitors (one run per competitor):

   ```sh
   node dist/cli.js getcardlab.app --vs cardpointers.com \
     --out out/$(date +%F)/getcardlab.app/strategy-vs-cardpointers.com --budget-usd 0
   ```

   Roles come from the evidence: the site with more head-term rankings is the
   leader. The plan and "Top 10 actions" are written for the other one.

3. Results in each folder:
   - `report/strategy.md`: top actions, cluster map, rankings, drivers,
     playbook, weaknesses, 30/60/90-day plan and (with `--vs`) the
     side-by-side table, cluster gaps and keyword gaps.
   - `report/strategy.json`: the same data (`kind: "strategy"`,
     `schemaVersion: "1"`, schema in `docs/strategy-schema.json`).

A run takes about 3-8 minutes per site because requests are spaced out. Do not
run several at once. Keep the competitor list short (2-3 per desk site) and
only add domains that are confirmed.

## Feeding results to OpenSEO or an LLM

- Give it `dossier.json` (one site), `strategy.json` (one strategy run) or
  `summary.json` (all sites) as the input. Read `topActions` first, then
  `claims` (or `sites[].drivers` and `sites[].weaknesses`) and `unknowns`.
- Ask the model to cite the `evidenceIds` for every statement and not to add
  facts that are not in the dossier. Anything in `unknowns` was not checked
  and must not be presented as a finding.
- Check `schemaVersion` is `"1"` before parsing. For a single site on stdout:
  `node dist/cli.js audit <domain> --json` (progress goes to stderr).

## Logging AI citations

Ask ChatGPT, Perplexity, Gemini and others a keyword-style question, then
record which URLs the answer cited in that site's teardown folder:

```sh
node dist/cli.js cite --out out/<date>/getcardlab.app/teardown --engine chatgpt \
  --prompt "best credit card rewards app" --urls "https://a.com/x,https://b.com/y"
```

This updates `teardown.md` and `dossier.json` (`citations`).

## Budget rules

- Default is $0: every paid call is refused before any request is made.
- DataForSEO is used only if the desk explicitly sets `--budget-usd` above 0
  **and** `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are set in the
  environment. Never put keys in files, prompts or logs.
- Monthly cap of about $1.50: add `--monthly-cap-usd 1.5`, for example
  `--budget-usd 0.25 --monthly-cap-usd 1.5`. The cap is summed from
  `.seo-rea/ledger.csv`, so keep that folder between runs.
- `summary.json` reports `spentUsd`; it should be 0 on a default run.

## Cadence

- `batch` once a week, same day, into a new dated folder.
- Strategy runs (each desk site, then each site `--vs` its key competitors)
  the same day, into the same dated folder.
- Compare this week's `topActions` with last week's to see what was fixed.
- Log AI citations for each keyword at least once a month.

## Troubleshooting

- Captcha, consent wall or 0 SERP results: the SERP map in `teardown.md` says
  which engine was blocked. Search the keyword in a normal browser and re-run
  that one site with the ranking URLs in order:

  ```sh
  node dist/cli.js teardown --keyword "credit card rewards app" --target getcardlab.app \
    --out out/<date>/getcardlab.app/teardown --serp-urls "https://a.com/x,https://b.com/y" --force
  ```

- "already has a run": use a new dated `--out` or add `--force`.
- PageSpeed shows "quota": set a free `PSI_API_KEY` or add `--no-psi`.
- `node dist/cli.js doctor` lists what can run on the box.

## Do not

- Do not send outreach, pitches or emails based on these reports.
- Do not publish, edit or deploy anything on the sites.
- Do not buy ads or raise the budget without an explicit desk decision.
- Do not guess unknown domains; leave them as `TODO`.
- Do not add captcha solving or bot-protection workarounds.
