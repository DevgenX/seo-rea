# Evidence workflow

## Layout

```
<out>/
  evidence/
    E001-serp-playwright-google.html     raw artifact as fetched or entered
    E002-serp-playwright-google-screenshot.png
    E003-serp-playwright-bing.html
    ...
    index.json                    machine index (read by the CLI)
    index.md                      human index
  report/
    questions.md                  question checklist with status
    ledger.md                     finding ledger
    teardown.md                   final report (audit.md for `seo-rea audit`)
  data/
    run.json                      everything the report is rendered from
```

## Evidence IDs

- IDs are sequential (`E001`, `E002`, ...) and continue from what is already in
  `evidence/index.json`, so `seo-rea cite` can add to a finished run.
- Each entry has: source, kind, URL, UTC timestamp, cost in USD, file, note,
  and whether it came from the cache.
- Kinds:
  - `observed`: fetched by the CLI (SERP HTML and screenshots, page HTML,
    robots, sitemap, llms.txt, ad-library captures).
  - `derived`: computed from other evidence (parsed SERPs, competitor
    summaries, AI-crawler table, keyword gap).
  - `manual`: supplied by the operator (`--serp-html`, `--serp-urls`).
  - `manual-check`: a lookup URL a person must open (ad libraries without a
    visible count). Add findings as new evidence files and ledger rows.
  - `api`: API response (PageSpeed Insights, paid DataForSEO with cost).
  - `citation`: an AI answer logged with `seo-rea cite`.
- Raw HTML is stored as served, without JavaScript. Do not edit evidence files;
  add a new one instead.

## Claims

Every ledger row states:

| Field             | Meaning                                                           |
| ----------------- | ----------------------------------------------------------------- |
| Claim             | One sentence                                                      |
| Evidence          | IDs that support it                                               |
| Observed/inferred | Observed = read directly from evidence. Inferred = interpretation |
| Confidence        | high / medium / low                                               |
| Search boundary   | What was searched (engine, depth, locale, date, page count)       |
| Open unknowns     | What would change the claim                                       |

Absence ("not cited", "does not rank", "no schema") is only claimed inside the
stated boundary.

## AI citations

```sh
seo-rea cite --out ./examples/cardlab-teardown --engine perplexity \
  --prompt "best credit card rewards app" \
  --urls "https://www.example.com/a, https://www.example.org/b" \
  --note "logged out, US"
```

Engines: chatgpt, perplexity, gemini, claude, copilot, google-ai-overview,
grok, other. If the folder has a run, `teardown.md` and `ledger.md` are re-rendered
with the new row. `cite` makes no network requests.

## Re-running

`seo-rea teardown` refuses to overwrite a folder that already has a run.
`--force` deletes `evidence/`, `report/` and `data/` in that folder first, which
also removes logged citations; log them again or use a new `--out`.
`seo-rea audit` always replaces the previous audit in its folder.

## What is committed

Raw third-party HTML and screenshots stay out of version control
(`examples/**/evidence/*.html`, `*.png` are git-ignored). Parsed JSON, the
evidence index and the reports are kept. Block pages are recorded with the
requested URL, not the redirect, because redirect tokens can encode the
caller's IP address.
