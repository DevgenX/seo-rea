# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Stable issue ids: every entry in `topActions` (dossier and strategy) has an
  `id` such as `TECH-ROBOTS-BLOCKS-ALL` or `PERF-SCORE-LOW:3f2a9c1e` (rule
  code plus an optional hash of the subject). The same problem keeps the same
  id across runs. Shown in the Top 10 actions table. See
  [docs/error-codes.md](docs/error-codes.md#issue-ids).
- Published error contract: failures carry a stable code (`USAGE`,
  `RUN_EXISTS`, `BUDGET_REFUSED`, `SCHEMA_INVALID`, ...). The CLI prints
  `seo-rea: [CODE] message` plus a hint, and with `--json` prints
  `{ "error": { code, message, hint, exitCode } }` on stdout. MCP errors add
  `code` and `hint`. JSON Schema in `docs/error-contract.schema.json`
  (`npm run error-schema`).

### Changed

- `dossier.json` and `strategy.json` `topActions[]` gain a required `id`;
  JSON Schemas regenerated.

## [0.4.0] - 2026-10-15

Strategy Dossier: why a site leads, from free sources.

### Added

- `seo-rea <domain> [--vs <domain>]` (also `seo-rea strategy <domain>`) and
  the MCP tool `seo_strategy`. Writes `report/strategy.md`,
  `report/strategy.json` (`kind: "strategy"`, `schemaVersion: "1"`, validated
  with zod; JSON Schema in `docs/strategy-schema.json`, `npm run
strategy-schema` regenerates it), `evidence/` and `data/strategy-run.json`.
  `--json` prints `strategy.json` to stdout.
- Site and cluster map: robots.txt sitemaps, sitemap indexes (child sitemaps
  picked across types), navigation and a few help or blog subdomains; up to
  200 URLs mapped and about 30 pages fetched (`--crawl`). Clusters by path
  and title words with URL counts, template type, hub pages, link density and
  inlinks. Programmatic SEO detection from shared slug patterns, numeric ids
  or identical heading sets; help centres are never flagged.
- Head terms derived from the site's own titles, H1s, slugs and clusters
  (`--terms`, default 10; split 6/4 with `--vs`) plus one brand query per
  site, checked on free SERPs. An engine that returns a captcha, consent
  wall, HTTP 403 or 429 is not asked again in the run; blocked terms are
  listed as unknown. App Store and other owned listings count as rankings.
- Co-ranking competitors with shared SERP counts; six pillars (on-page,
  technical, off-page, AEO, paid, distribution); 5-8 ranked drivers with
  strength, evidence and how hard each is to copy; a copyable playbook with
  effort and impact; weaknesses with specific fixes; a 30/60/90-day plan and
  a "Top 10 actions" table.
- `--vs`: roles (leader and challenger) from head-term SERP visibility, then
  Tranco rank; side-by-side table, cluster gaps, keyword overlap and gaps, and
  the plan and actions written for the challenger.
- Free off-page and distribution signals: Tranco rank, Wikipedia linking
  articles and mentions, Common Crawl index size, App Store rating and rating
  count (iTunes Lookup), app store, extension, social, community, newsletter
  and press links found on the site.
- Examples: `examples/strategy-cardpointers`, `examples/strategy-nerdwallet`,
  `examples/strategy-cardlab-vs-cardpointers`.
- Weekly strategy routine in `HANDOFF-for-desk.md`.

## [0.3.0] - 2026-10-14

Agent-friendly output for scheduled multi-site audits.

### Added

- `report/dossier.json` for every `teardown` and `audit`: versioned JSON
  (`schemaVersion: "1"`) with inputs, timestamps, cost, SERP engine statuses
  and results, competitors, target pages, schema validation, AI readiness,
  performance, keyword gap, ads, citations, claims, unknowns and the evidence
  index path. Validated with zod before it is written; JSON Schema in
  `docs/dossier-schema.json` (`npm run dossier-schema` regenerates it).
- Top actions: up to 10 ranked actions derived from the findings (blocked AI
  search crawlers, missing or invalid schema, missing llms.txt or sitemap,
  thin content vs the ranking median, keyword missing from the title,
  FAQ/HowTo used by competitors, keyword gap, PageSpeed issues, competitor
  ads, uncited in AI answers), each with evidence IDs, effort, impact and an
  owner hint. Shown as a "Top 10 actions" table at the top of `teardown.md`
  and `audit.md`.
- `--json` on `teardown` prints the dossier to stdout; progress stays on
  stderr.
- `batch --sites <file.json|file.csv>`: audit (and teardown when a keyword is
  given) for many sites in turn, with a pause between sites, writing
  `<out>/<site>/...`, `summary.json` and `summary.md` (top 3 actions per site).
  Entries with a `TODO` domain are skipped.
- MCP `seo_teardown` and `seo_check_ai_readiness` results include
  `dossierPath` and `topActions`.
- README "Run on a box / server" section, `HANDOFF-for-desk.md` and
  `examples/desk-sites.example.json`.

### Changed

- `audit --json` prints the dossier instead of `data/audit.json` (still
  written to disk).
- `cite` also refreshes `report/dossier.json`.

## [0.2.0] - 2026-10-14

Rewrite in strict TypeScript as a CLI, an MCP server and an agent skill.

### Added

- MCP stdio server (`seo-rea mcp`) with tools `seo_teardown`, `seo_audit_page`,
  `seo_check_ai_readiness`, `seo_keyword_gap`, `seo_log_citation`,
  `seo_adlib_lookup` and `seo_read_evidence`. Inputs validated with zod.
  `server.json` for the MCP registry.
- `audit` command: single-site AEO checks (on-page facts, JSON-LD validation,
  robots.txt, sitemap, AI-crawler access, `llms.txt`, `llms-full.txt`,
  PageSpeed Insights).
- `doctor` command: lists which adapters can run in the current environment.
- Pluggable `SourceAdapter` interface; free adapters run before paid ones.
- Headless-browser SERP adapter (optional `playwright-core`): at least 3 s
  between requests to one host, real desktop user agent, cookie-banner
  handling, captcha and consent-wall detection with automatic fallback to
  plain HTML SERPs.
- Schema validation for Article, FAQPage, Product, SoftwareApplication,
  Organization, BreadcrumbList, HowTo and LocalBusiness.
- AI-crawler robots.txt check (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot,
  Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot)
  using RFC 9309 group matching, and llms.txt validation against llmstxt.org.
- PageSpeed Insights adapter (optional `PSI_API_KEY`, sent as a header) and
  optional local Lighthouse.
- TF-IDF scores in the keyword gap.
- Ad-library capture (`--adlib-capture`): screenshot and visible ad count for
  Google Ads Transparency Center, Meta Ad Library and LinkedIn Ad Library.
  Advertisers are picked from ranking product sites first.
- Report sections for the SERP map (what each engine did), schema validation
  and AI-search readiness.
- `--engines`, `--no-browser`, `--adlib-capture`, `--no-psi`, `--lighthouse`
  and `--delay-ms` teardown flags.
- `grok` as a `cite` engine.
- Docs (`docs/`), issue and PR templates, `llms.txt`,
  contributor and security policies, third-party notices.

### Changed

- Source moved from plain JavaScript in `src/` to TypeScript compiled to
  `dist/`. Tests moved to vitest in `tests/`.
- Cache TTLs per kind: SERP 7 days, pages 30 days, API 30 days, PSI 1 day.
- Results pages that redirect to a block page record the requested URL, not
  the redirect, so tokens in block-page URLs are never saved.

### Removed

- The v0.1 JavaScript sources (`bin/seo-rea.js`, `src/*.js`, `test/*.js`).

## [0.1.0] - 2026-10-14

- First release: teardown, cite, evidence store, budget ledger, file cache.
