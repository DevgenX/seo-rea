# AEO audit: https://getcardlab.app/

Run 20261015T051615Z on 2026-10-15T05:16:15.920Z with seo-rea 0.3.0. Free sources only. Evidence: [evidence/index.md](../evidence/index.md).

## Top 10 actions

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review | Invalid structured data is ignored for rich results. | medium | S | dev | E001 |

Ranked by impact, then effort. Full data: [dossier.json](dossier.json).

## 1. Page

- Title: CardLab: Track Cards & Rewards - No Bank Login (46 chars)
- Meta description: Track your cards and rewards privately: statements, due dates, reward caps and which card to use for any purchase. Checked catalog, 38 countries, no bank login.
- H1: Track cards & rewards, and know which card to use.; 10 H2; 2471 words in raw HTML
- Canonical: https://getcardlab.app/; lang: en; robots meta: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1
- Links: 58 internal, 4 external
- Evidence: E001

## 2. Schema validation

| Page | Blocks | Type (checked as) | Result | Errors | Warnings | Evidence |
|---|---|---|---|---|---|---|
| https://getcardlab.app/ | 1 | Organization | valid | - | - | E001 |
| https://getcardlab.app/ | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E001 |
| https://getcardlab.app/ | 1 | FAQPage | valid | - | - | E001 |

## 3. AI-search readiness

AI crawler access to `https://getcardlab.app/` from robots.txt [E003, E007]:

| Crawler | Operator | Purpose | Access | Rule |
|---|---|---|---|---|
| GPTBot | OpenAI | model training | allowed | own group: no disallow |
| OAI-SearchBot | OpenAI | ChatGPT search index | allowed | own group: no disallow |
| ChatGPT-User | OpenAI | user-initiated fetches | allowed | own group: no disallow |
| ClaudeBot | Anthropic | model training | allowed | own group: no disallow |
| Claude-SearchBot | Anthropic | search index | allowed | own group: no disallow |
| PerplexityBot | Perplexity | search index | allowed | own group: no disallow |
| Google-Extended | Google | Gemini training and grounding (not Search) | allowed | own group: no disallow |
| Applebot-Extended | Apple | Apple Intelligence training | allowed | own group: no disallow |
| CCBot | Common Crawl | open crawl used for training | allowed | own group: no disallow |

- /llms.txt: valid - title "CardLab", summary present, 9 section(s), 129 link(s) [E005]
- /llms-full.txt: valid - 586524 bytes, title "CardLab - full text" [E006]

| Source | Strategy | Performance | Accessibility | Best practices | SEO | Lab metrics | Field (CrUX) | Evidence |
|---|---|---|---|---|---|---|---|---|
| psi | mobile | skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key | | | | | | E008 |

## 4. Crawlability

- robots.txt: found [E003]
- Sitemap: 114 URLs from 1 file(s) [E004]

## 5. Findings

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | https://getcardlab.app/ has 1 JSON-LD block(s) (Answer, Country, FAQPage, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebSite); 1 checked node(s) with errors | E001 | observed | high | raw HTML without JavaScript | - |
| C02 | https://getcardlab.app/: 2471 words, 1 H1, 10 H2, title 46 chars, meta description present | E001 | observed | high | raw HTML without JavaScript | - |
| C03 | getcardlab.app sitemap lists 114 URLs | E003, E004 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C04 | getcardlab.app robots.txt lets all 9 checked AI crawlers fetch / | E003, E007 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C05 | getcardlab.app/llms.txt follows the llmstxt.org format (9 sections, 129 links) | E005 | observed | high | single fetch of /llms.txt | - |
| C06 | getcardlab.app/llms-full.txt present (586524 bytes) | E006 | observed | high | single fetch of /llms-full.txt | - |

## 6. Fixes

1. Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review. Invalid structured data is ignored for rich results. [E001]

## 7. Unknowns

- Server or CDN bot blocking not tested
- PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Rendered (JavaScript) DOM not checked; checks use raw HTML
