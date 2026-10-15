---
name: seo-rea
description: >-
  Reverse engineer why competitors and top-ranking pages win in search and AI
  answers, and check whether a site is ready for AI search. Use when given a
  target domain, keyword, or SERP and asked for their keywords, ads, schema,
  content structure, llms.txt, AI-crawler access or AI-citation strategy, or
  "how the best SEO works" for a niche. Skip for generic SEO advice with no
  site, keyword or competitor to look at.
metadata:
  version: "0.2.0"
  inspired_by: "morluto/rea reverse-engineer-anything skill (MIT), workflow pattern only"
---

# SEO-REA: reverse engineer rankings

Evidence first. Every claim ties to a saved artifact (SERP snapshot, fetched
HTML, robots.txt, llms.txt, ad-library screenshot, API JSON) with an Evidence
ID, source, timestamp and cost. Observed facts and inferences are labelled
separately. Absence is only claimed inside a stated search boundary.

## Tools

Prefer the MCP tools when the `seo-rea` server is connected; otherwise use the
CLI (`npx seo-rea ...`). Both write the same files.

| Task                        | MCP tool                 | CLI                                                   |
| --------------------------- | ------------------------ | ----------------------------------------------------- |
| Full teardown               | `seo_teardown`           | `seo-rea teardown --keyword ... --target ... --out .` |
| One page: on-page + schema  | `seo_audit_page`         | `seo-rea audit <url>`                                 |
| Site AI-search readiness    | `seo_check_ai_readiness` | `seo-rea audit <domain>`                              |
| Keyword gap for given pages | `seo_keyword_gap`        | (part of `teardown`)                                  |
| Log an AI answer's sources  | `seo_log_citation`       | `seo-rea cite --out ... --engine ... --prompt ...`    |
| Ad-library lookup URLs      | `seo_adlib_lookup`       | (part of `teardown`; `--adlib-capture` screenshots)   |
| Read evidence               | `seo_read_evidence`      | open `evidence/index.md`                              |
| What can run here           | -                        | `seo-rea doctor`                                      |

Output in `<out>`: `evidence/` (E001.. files + `index.md`), `report/questions.md`,
`report/ledger.md`, `report/teardown.md` (or `report/audit.md`), `data/run.json`.

## 0. Budget and cache rules (read first)

- Paid API cap is a run parameter (`--budget-usd` / `budgetUsd`, default 0).
  At 0 every paid call is refused before any request is made.
- Cache: `.seo-rea/cache/<yyyy-mm>/<sha1>.json`. SERPs 7 days, pages 30 days,
  PageSpeed 1 day. Blocked or degraded SERPs are never cached.
- Order: free source -> cached paid result -> paid call within budget.
- Paid calls are logged to `.seo-rea/ledger.csv`. Keys come from the
  environment only (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `PSI_API_KEY`).
  Never write them to files, evidence or logs.

Details: [references/budget-and-cache.md](references/budget-and-cache.md).

## 1. Route the target

- Keyword + target domain -> `seo_teardown`.
- Domain or URL only, "is my site ready for AI search" -> `seo_check_ai_readiness`.
- One page -> `seo_audit_page`.
- If search engines block automated access (the SERP map says so), search in a
  browser and pass the ranking URLs in order (`serpUrls` / `--serp-urls`) or a
  saved results page (`--serp-html`).
- Add your own questions to `report/questions.md` before reading results.

## 2. What gets collected (free first)

| Area          | Free source                                                                                       | Paid fallback                   |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| SERP          | headless Chromium (Google, Bing, DuckDuckGo), then plain HTML, then operator URLs or saved pages  | DataForSEO SERP (~$0.002/query) |
| Ranking pages | raw HTML (robots.txt respected), title, meta, H1-H3, words, canonical, links                      | -                               |
| Schema        | JSON-LD types and required-property checks (Article, FAQPage, Product, SoftwareApplication, ...)  | -                               |
| AI readiness  | robots.txt rules for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, ... | -                               |
| llms.txt      | `/llms.txt` and `/llms-full.txt` checked against llmstxt.org                                      | -                               |
| Speed         | PageSpeed Insights API (optional free key); local Lighthouse if installed                         | -                               |
| Keywords      | n-gram + TF-IDF gap: phrases 2+ ranking pages use that the target lacks                           | DataForSEO Labs ranked keywords |
| Ads           | Google Ads Transparency, Meta and LinkedIn ad libraries (URLs; optional screenshot and count)     | -                               |
| AI citations  | ask ChatGPT, Perplexity, Gemini, Claude, Grok; log with `seo_log_citation`                        | -                               |

Sources and limits: [references/sources.md](references/sources.md).
Evidence layout and IDs: [references/evidence-workflow.md](references/evidence-workflow.md).

## 3. Analyse

Compare winners vs. the target: intent match (roundup vs. product page),
depth, title and heading coverage, structured data, AI-crawler access,
llms.txt, internal links, ad messaging. The keyword gap is ranked by how many
competitors use a phrase, then TF-IDF weighted by phrase length; it has no
search volume on the free tier.

## 4. Finding ledger

`report/ledger.md`: claim | Evidence IDs | observed/inferred | confidence |
search boundary | open unknowns. Extend it by hand for manual findings.

## 5. Teardown output

`report/teardown.md`: 1 summary, 2 SERP map (what each engine did), 3
competitor cards, 4 schema validation, 5 AI-search readiness, 6 keyword gap,
7 AI-citation table, 8 ads, 9 playbook, 10 unknowns and cost.

## 6. Finish

Revisit `questions.md`; the tool pre-fills answered / partial / unresolved.
Never send outreach, buy ads or publish changes from this skill. Produce drafts
only.
