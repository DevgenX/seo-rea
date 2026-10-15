---
name: seo-rea
description: >-
  Reverse engineer why competitors and top-ranking pages win in search and AI
  answers. Use when given a target domain, keyword, or SERP and asked for their
  keywords, ads, backlinks, schema, content structure, or AI-citation strategy,
  or "how the best SEO works" for a niche. Skip for routine site audits of your
  own site with no competitor question.
metadata:
  version: "0.1.0"
  inspired_by: "morluto/rea reverse-engineer-anything skill (MIT), workflow pattern only"
---

# SEO-REA: reverse engineer rankings

Evidence first. Every claim in the teardown ties to a saved artifact (SERP
snapshot, fetched HTML, ad-library lookup, API JSON) with an Evidence ID,
source, timestamp, and cost. Observed facts and inferences are labelled
separately. Absence is only claimed inside a stated search boundary.

The `seo-rea` CLI automates the free parts of this workflow:

```sh
seo-rea teardown --keyword "<kw>" --target <domain> --out <dir> [--budget-usd 0]
seo-rea cite --out <dir> --engine chatgpt --prompt "<prompt>" --urls "<url1,url2>"
```

Output in `<dir>`: `evidence/` (E001.. files + `index.md`), `report/questions.md`,
`report/ledger.md`, `report/teardown.md`, `data/run.json`.

## 0. Budget and cache rules (read first)
- Paid API cap is a run parameter (`--budget-usd`, default 0 = free sources
  only). An optional monthly cap (`--monthly-cap-usd`) is summed from the
  ledger; the routine that calls this skill owns the monthly number.
- Cache dir: `.seo-rea/cache/<yyyy-mm>/<sha1(source+query)>.json`. Reuse any
  cached result under 30 days old (SERPs under 7 days) before calling anything.
  Blocked or degraded responses are never cached.
- Order of preference: free/manual source -> cached paid result -> paid call.
- Every paid call is logged to `.seo-rea/ledger.csv` (date, run_id, endpoint,
  query, usd). Before a paid call the run's and month's spend is summed; the
  call is refused if it would exceed a cap, and always refused at budget 0.
- Credentials (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`) come from the
  environment only. Never write them to files, evidence or logs.

Details: [references/budget-and-cache.md](references/budget-and-cache.md).

## 1. Route the target
- Domain -> phase 2 with "who outranks this domain" questions.
- Keyword -> fetch SERP first, take top 5-10 organic URLs as targets.
- SERP URL/screenshot -> parse it, same as keyword. Save the page from a
  browser and pass `--serp-html <file>`, or pass the ranking URLs in order with
  `--serp-urls`.
The CLI writes the question checklist to `report/questions.md` before work.
Add your own questions there (e.g. "what ads does X run").

## 2. Collect evidence (free first)
| Area | Free source | Paid fallback |
|---|---|---|
| SERP + features | DuckDuckGo HTML, Bing HTML, browser Google search (incognito, gl/hl set) saved with `--serp-html` | DataForSEO SERP live/regular (~$0.002/query) |
| Ranking pages | fetch HTML (robots.txt respected), robots.txt, sitemap.xml | - |
| On-page + schema | title, meta, H1-H3, word count, JSON-LD types, canonical, hreflang | - |
| Internal links | crawl up to `--crawl` target pages from sitemap; inlinks per URL, anchor text | - |
| Backlinks | Ahrefs free backlink checker (top 100), OpenLinkProfiler, Bing Webmaster, Common Crawl index | DataForSEO backlinks summary (only if subscribed; skip by default) |
| Keywords | competitor titles/H2s/body (automated gap), Google autocomplete, People Also Ask, Search Console (own site), Keyword Planner | DataForSEO Labs ranked_keywords (~$0.01-0.02/call, 100 rows) |
| AI-answer citations | ask ChatGPT, Gemini, Perplexity, Google AI Overviews the target prompts; log with `seo-rea cite` | DataForSEO AI Overview in SERP (same SERP call) |
| Ads | Google Ads Transparency Center, Meta Ad Library, LinkedIn Ad Library (recorded as manual-check evidence), SERP ads | DataForSEO SERP paid block (same call) |
| Page speed | PageSpeed Insights API (free key), CrUX | - |

Use OpenSEO (if present) for stored rank/keyword data before any new call.
Sources and their limits: [references/sources.md](references/sources.md).
Evidence layout and IDs: [references/evidence-workflow.md](references/evidence-workflow.md).

## 3. Analyse
Split independent questions across parallel workers if available (one per
competitor or per area); each returns sources, conclusions, gaps. Compare
pages: shared patterns among winners vs. the target, intent match, topical
coverage, entity coverage, freshness, E-E-A-T signals, link velocity, ad
messaging/offers/landing pages.
Keyword gap = competitor phrases minus the target's, scored by how many
competitors use them and prominence (add volume, difficulty, intent and SERP
features when paid data is available).

## 4. Finding ledger
`report/ledger.md`: claim | Evidence IDs | observed/inferred | confidence |
search boundary | open unknowns. Extend it by hand for manual findings.

## 5. Teardown output
`report/teardown.md`:
1. Summary: why the winners win (5 bullets max)
2. SERP map (positions, features, ads, AI Overview)
3. Per-competitor cards: on-page, schema, structure, internal links, backlinks
4. Keyword gap table (top 30)
5. AI-citation table (prompt x engine x cited domains)
6. Ads: platforms, count, run dates, hooks, offers, landing pages
7. Playbook: prioritised actions for the target, each linked to evidence
8. Unknowns + cost spent this run

## 6. Finish
Revisit `questions.md`; mark each answered / partial / unresolved (the CLI
pre-fills a status). Never send outreach, buy ads, or publish changes from this
skill - produce drafts only.
