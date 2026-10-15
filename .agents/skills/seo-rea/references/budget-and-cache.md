# Budget and cache

## Cache

- Location: `--cache-dir` (default `.seo-rea/cache`), one JSON file per
  request at `<yyyy-mm>/<sha1(source + "\n" + query)>.json`.
- TTL: SERPs 7 days, pages/robots/sitemaps/llms.txt 30 days, PageSpeed
  Insights 1 day, paid API results 30 days. Browser SERPs are not cached.
  Lookups check the current and previous month folder so a TTL can span a
  month end.
- Only successful responses are cached. SERP responses that are blocked
  (captcha, anomaly, JavaScript wall) or degraded (low relevance) are never
  cached, so a later run can retry.
- `--no-cache` skips reading and writing. Delete the folder to clear it.
- The cache holds third-party HTML; it is git-ignored.

## Paid calls (DataForSEO)

- Disabled unless `--budget-usd` is above 0 and `DATAFORSEO_LOGIN` and
  `DATAFORSEO_PASSWORD` are set in the environment. Credentials are never read
  from files and never written anywhere.
- Free first: the paid SERP is used only when no free SERP is usable. Paid
  ranked keywords run for the target and up to 3 competitors.
- Before each call:
  1. Cached result under TTL? Use it, cost 0.
  2. Budget 0 or no credentials? Refuse (`BudgetError`).
  3. Sum this run's rows in the ledger plus the call estimate. Over
     `--budget-usd`? Refuse.
  4. Sum this calendar month's rows plus the estimate. Over
     `--monthly-cap-usd`? Refuse.
- After each call the actual `cost` from the API response is appended to the
  ledger, even if the API reports an error.
- Estimates: SERP live regular 0.002 USD, Labs ranked_keywords 0.02 USD, other
  endpoints 0.05 USD.

## Ledger

`--ledger` (default `.seo-rea/ledger.csv`):

```
date,run_id,source,query,usd
"2026-10-14T03:00:00.000Z","20261014T030000Z","dataforseo:serp/google/organic/live/regular","{""keyword"":""...""}",0.0020
```

The teardown reports spend for the run in its header and in section 10. Keep
the ledger out of version control; it records your account activity.
