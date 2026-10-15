# AEO audit: https://remotenurse.org/

Run 20261015T051651Z on 2026-10-15T05:16:51.464Z with seo-rea 0.3.0. Free sources only. Evidence: [evidence/index.md](../evidence/index.md).

## Top 10 actions

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review | Invalid structured data is ignored for rich results. | medium | S | dev | E001 |

Ranked by impact, then effort. Full data: [dossier.json](dossier.json).

## 1. Page

- Title: Medical VA training and NCLEX-RN prep \| RemoteNurse (51 chars)
- Meta description: Free training for remote medical VA work: 16 courses, 442 scored practice cases and job boards. NCLEX-RN prep with 2,600 questions.
- H1: Medical VA training and NCLEX-RN prepWork the desk before the job. Sit the exam before the exam.; 10 H2; 2190 words in raw HTML
- Canonical: https://remotenurse.org/; lang: en; robots meta: index, follow
- Links: 189 internal, 0 external
- Evidence: E001

## 2. Schema validation

| Page | Blocks | Type (checked as) | Result | Errors | Warnings | Evidence |
|---|---|---|---|---|---|---|
| https://remotenurse.org/ | 1 | Organization | valid | - | - | E001 |
| https://remotenurse.org/ | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E001 |
| https://remotenurse.org/ | 1 | WebApplication (SoftwareApplication) | **errors** | needs one of: aggregateRating, review | - | E001 |
| https://remotenurse.org/ | 1 | FAQPage | valid | - | - | E001 |

## 3. AI-search readiness

AI crawler access to `https://remotenurse.org/` from robots.txt [E003, E007]:

| Crawler | Operator | Purpose | Access | Rule |
|---|---|---|---|---|
| GPTBot | OpenAI | model training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| OAI-SearchBot | OpenAI | ChatGPT search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| ChatGPT-User | OpenAI | user-initiated fetches | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| ClaudeBot | Anthropic | model training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Claude-SearchBot | Anthropic | search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| PerplexityBot | Perplexity | search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Google-Extended | Google | Gemini training and grounding (not Search) | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Applebot-Extended | Apple | Apple Intelligence training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| CCBot | Common Crawl | open crawl used for training | **partial** | falls back to *: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |

- /llms.txt: valid - title "RemoteNurse", summary present, 10 section(s), 91 link(s) [E005]
  - warning: list item is not "- [name](url): notes": - Product: remotenurse.org. The iOS companion Medical VA Coach: RemoteNurse is p
  - warning: list item is not "- [name](url): notes": - Audience: US bedside RNs moving into review work; nurses and healthcare BPO st
  - warning: list item is not "- [name](url): notes": - NCLEX-RN prep: an original 2,600-question NCLEX-style bank written to the 2026
  - warning: list item is not "- [name](url): notes": - Scope: sixteen remote healthcare desks, not a single role. Fifteen of the sixt
  - warning: list item is not "- [name](url): notes": - Grading: the Case Judge is deterministic and is the only verdict; AI coaches a
- /llms-full.txt: valid - 80663 bytes, title "RemoteNurse" [E006]

| Source | Strategy | Performance | Accessibility | Best practices | SEO | Lab metrics | Field (CrUX) | Evidence |
|---|---|---|---|---|---|---|---|---|
| psi | mobile | skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key | | | | | | E008 |

## 4. Crawlability

- robots.txt: found [E003]
- Sitemap: 460 URLs from 1 file(s) [E004]

## 5. Findings

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | https://remotenurse.org/ has 1 JSON-LD block(s) (AggregateOffer, Answer, ContactPoint, Country, FAQPage, ImageObject, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebApplication, WebSite); 2 checked node(s) with errors | E001 | observed | high | raw HTML without JavaScript | - |
| C02 | https://remotenurse.org/: 2190 words, 1 H1, 10 H2, title 51 chars, meta description present | E001 | observed | high | raw HTML without JavaScript | - |
| C03 | remotenurse.org sitemap lists 460 URLs | E003, E004 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C04 | remotenurse.org robots.txt lets all 9 checked AI crawlers fetch / | E003, E007 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C05 | remotenurse.org/llms.txt follows the llmstxt.org format (10 sections, 91 links) | E005 | observed | high | single fetch of /llms.txt | - |
| C06 | remotenurse.org/llms-full.txt present (80663 bytes) | E006 | observed | high | single fetch of /llms-full.txt | - |

## 6. Fixes

1. Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review. Invalid structured data is ignored for rich results. [E001]
2. Fix /llms.txt: list item is not "- [name](url): notes": - Product: remotenurse.org. The iOS companion Medical VA Coach: RemoteNurse is p; list item is not "- [name](url): notes": - Audience: US bedside RNs moving into review work; nurses and healthcare BPO st; list item is not "- [name](url): notes": - NCLEX-RN prep: an original 2,600-question NCLEX-style bank written to the 2026. The file exists but does not fully follow the llmstxt.org format. [E005]

## 7. Unknowns

- Server or CDN bot blocking not tested
- PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Rendered (JavaScript) DOM not checked; checks use raw HTML
