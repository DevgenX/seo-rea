# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
