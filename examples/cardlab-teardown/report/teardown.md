# SEO teardown: "credit card rewards app" vs getcardlab.app

Run 20261015T051545Z on 2026-10-15T05:15:45.652Z with seo-rea 0.3.0. Paid budget 0 USD, spent 0.0000 USD. Evidence: [evidence/index.md](../evidence/index.md). Ledger: [ledger.md](ledger.md).

Observed facts cite Evidence IDs. Lines marked *(inferred)* are interpretations.

## Top 10 actions

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Put "credit card rewards app" (or close wording) in the title and H1 of the page meant to rank | The target title "CardLab: Track Cards & Rewards - No Bank Login" lacks the keyword terms; 2/5 ranking pages have them. | high | S | seo | E007, E010, E011, E012, E013, E017, E018, E015, E016 |
| 2 | Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review | Invalid structured data is ignored for rich results. | medium | S | dev | E017, E018 |
| 3 | Cover competitor phrases in headings and copy: maxrewards, recommendations, credits, chase sapphire, features, sapphire, gas ev, travel cards | Used by two or more ranking pages and missing from the crawled target pages. | medium | M | content | E007, E010, E011, E012, E013, E017, E018, E015, E016 |

Ranked by impact, then effort. Full data: [dossier.json](dossier.json).

## 1. Summary: why the winners win

- *(inferred)* Search intent is comparison/roundup: 5/8 titles use "best", "top", a year or review wording. Results for this query reward roundup and comparison content, not product homepages. [E001, E003, E007, E010, E011, E012, E013]
- Depth: ranking pages run a median 586 words vs 2471 on the getcardlab.app homepage. [E007, E010, E011, E012, E013]
- Relevance: 2/5 ranking pages put every keyword term in the title. [E007, E010, E011, E012, E013]
- Structured data: most common types are Organization (3/5), BreadcrumbList (2/5), Article (1/5). [E007, E010, E011, E012, E013]
- getcardlab.app does not appear in the observed results (top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15). [E001, E003]
- AI readiness: no AI crawler blocked; llms.txt valid. [E021, E019, E020]

## 2. SERP map (what each engine did)

| Path | Engine | Status | Consent | Organic | Ads | Evidence |
|---|---|---|---|---|---|---|
| serp-playwright | Google (headless Chromium) | not used: Google captcha (unusual traffic page) | none shown | 0 | 0 | E001 |
| serp-playwright | Bing (headless Chromium) | used (HTTP 200, relevance 90%) | none shown | 10 | 0 | E003 |

- Headless Chromium user agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8078.4 Safari/537.36`; at least 3 s between requests to one host.

Primary ranking list from **Bing (headless Chromium)** [E005]:

| # | Domain | Title | URL |
|---|---|---|---|
| 1 | forbes.com | The Best 4 Apps For Tracking Credit Cards And Travel Rewards | https://www.forbes.com/advisor/credit-cards/best-apps-to-track-credit-card-rewards/ |
| 2 | cnbc.com | Best Apps for Tracking Your Credit Card Rewards in … | https://www.cnbc.com/select/best-apps-for-tracking-your-credit-card-rewards/ |
| 3 | money.usnews.com | Here Are the Best Apps for Tracking Your Credit Card … | https://money.usnews.com/credit-cards/articles/best-credit-card-apps-for-tracking-rewards |
| 4 | appshunter.io | 247+ Best Credit Card Rewards Apps for iPhone (2026) \| Free & Paid | https://appshunter.io/ios/topics/credit-card-rewards |
| 5 | rewardswise.app | RewardsWise - All in one Credit Card Manager | https://www.rewardswise.app/ |
| 6 | maxrewards.com | Find Your Next Credit Card \| MaxRewards | https://maxrewards.com/ |
| 7 | joinkudos.com | Kudos: Put Your Cards to Work - Earn More Rewards | https://www.joinkudos.com/ |
| 8 | cardstack.money | Best Credit Card Rewards Apps in 2026 - cardstack.money | https://cardstack.money/articles/guides/credit-card-rewards-optimizer-apps-2026 |

AI Overviews and AI answers are not scraped; log them with `seo-rea cite` (section 7).

## 3. Competitor cards

### #1 forbes.com

URL: https://www.forbes.com/advisor/credit-cards/best-apps-to-track-credit-card-rewards/ | Evidence: E006

Not analysed: HTTP 403 text/html;charset=utf-8

### #2 cnbc.com

URL: https://www.cnbc.com/select/best-apps-for-tracking-your-credit-card-rewards/ | Evidence: E007

- Title: Best Apps for Tracking Your Credit Card Rewards in 2026 (55 chars)
- Meta description: CNBC Select recommends AwardWallet and MaxRewards for easily keeping track of your credit card and travel rewards.
- H1: These are the best apps for tracking your credit card, airline and hotel rewards
- Structure: 14 H2, 4 H3, 2573 words
- Top H2s: Our top picks of timely offers from our partners / Find the best credit card for you / AwardWallet and MaxRewards can help you stay on top of your credit card and travel rewards. / AwardWallet / Read more / MaxRewards
- Schema (JSON-LD): BreadcrumbList, ImageObject, ItemList, ListItem, NewsArticle, NewsMediaOrganization, Person, Rating, Review, SpeakableSpecification - 2 checked, 0 with errors
- Canonical: https://www.cnbc.com/select/best-apps-for-tracking-your-credit-card-rewards/
- Internal links: 125; external links: 48
- Top internal anchors: "Credit Cards" x2, "Loans" x1, "Best Personal Loans" x1, "Best Loans for Low Credit" x1, "Best Same Day Loans" x1, "Best Debt Consolidation Loans" x1
- robots.txt: HTTP 200, 9 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #3 money.usnews.com

URL: https://money.usnews.com/credit-cards/articles/best-credit-card-apps-for-tracking-rewards | Evidence: E008

Not analysed: The operation was aborted due to timeout

### #4 appshunter.io

URL: https://appshunter.io/ios/topics/credit-card-rewards | Evidence: E009

Not analysed: HTTP 403 text/html; charset=UTF-8

### #5 rewardswise.app

URL: https://www.rewardswise.app/ | Evidence: E010

- Title: X (Twitter) (11 chars)
- Meta description: RewardsWise is a credit card rewards manager that helps you maximize your credit card rewards and cashback. We provide personalized recommendations, tracking, and management tools to help you get the most out of your credit cards.
- H1: All in One Credit Card Manager
- Structure: 3 H2, 5 H3, 144 words
- Top H2s: Your favorite companies are our partners / Effortlessly Connect Your Bank Accounts / FAQ
- Schema (JSON-LD): none
- Canonical: https://www.rewardswise.app/
- Internal links: 14; external links: 5
- Top internal anchors: "Features" x2, "Blog" x2, "Changelog" x2, "About" x2, "RewardsWise" x1, "Get Started" x1
- robots.txt: HTTP 200, 1 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #6 maxrewards.com

URL: https://maxrewards.com/ | Evidence: E011

- Title: Find Your Next Credit Card and Get More From Every Card \| MaxRewards (68 chars)
- Meta description: Find credit cards with Smart Search, compare MaxRewards editorial picks, and see what each card could be worth for your spending.
- H1: Make every card in your wallet work harder.
- Structure: 3 H2, 6 H3, 586 words
- Top H2s: Find your next credit card / Picks you can verify. / Choosing the card is step one.
- Schema (JSON-LD): Organization - 1 checked, 0 with errors
- Canonical: https://maxrewards.com/
- Internal links: 52; external links: 13
- Top internal anchors: "Read review" x4, "Estimate value" x4, "Home" x1, "Sign In" x1, "Sign Up" x1, "Get Started" x1
- robots.txt: HTTP 200, 1 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #7 joinkudos.com

URL: https://www.joinkudos.com/ | Evidence: E012

- Title: Kudos: Put Your Cards to Work - Earn More Rewards (49 chars)
- Meta description: (none)
- H1: (none)
- Structure: 0 H2, 0 H3, 0 words
- Top H2s: (none)
- Schema (JSON-LD): ImageObject, Organization, Person - 1 checked, 0 with errors
- Canonical: (none)
- Internal links: 0; external links: 0
- Top internal anchors: (none)
- robots.txt: HTTP 200, 4 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #8 cardstack.money

URL: https://cardstack.money/articles/guides/credit-card-rewards-optimizer-apps-2026 | Evidence: E013

- Title: Best Credit Card Rewards Optimizer Apps (2026 Comparison) \| CardStack (69 chars)
- Meta description: Best credit card rewards apps in 2026 — compare CardStack, MaxRewards, Kudos, and more on features, pricing, and what each app does best.
- H1: Best Credit Card Rewards Apps in 2026
- Structure: 18 H2, 0 H3, 2056 words
- Top H2s: Feature Comparison / CardStack / MaxRewards / Kudos / AwardWallet / How to Choose
- Schema (JSON-LD): Article, BreadcrumbList, ImageObject, ListItem, Organization, WebPage - 2 checked, 0 with errors
- Canonical: https://cardstack.money/articles/guides/credit-card-rewards-optimizer-apps-2026
- Internal links: 95; external links: 19
- Top internal anchors: "Sign In" x2, "Try for Free" x2, "Features" x2, "MCP for AI Agents" x2, "Browser extension" x2, "Articles" x2
- robots.txt: HTTP 200, 2 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### Target: getcardlab.app

- Homepage title: CardLab: Track Cards & Rewards - No Bank Login
- Meta description: Track your cards and rewards privately: statements, due dates, reward caps and which card to use for any purchase. Checked catalog, 38 countries, no bank login.
- H1: Track cards & rewards, and know which card to use.; 10 H2; 2471 words
- Schema (all crawled pages): Answer, Article, BreadcrumbList, Country, Dataset, FAQPage, ListItem, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebSite
- Pages crawled: 10; sitemap URLs: 114
- Most-linked internal pages: / (51), /coverage (22), /best-card (21), /credit-card-tracker (19), /calculators (17)
- Top phrases: card, credit card, credit, cardlab, bank, bonus, cards, tracker, rate, bank bonus
- Evidence: E017, E018, E015, E016

## 4. Schema validation

Required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo and LocalBusiness (and their common subtypes). Other types are listed but not checked.

| Page | Blocks | Type (checked as) | Result | Errors | Warnings | Evidence |
|---|---|---|---|---|---|---|
| #2 cnbc.com | 3 | NewsArticle (Article) | valid | - | - | E007 |
| #2 cnbc.com | 3 | BreadcrumbList | valid | - | - | E007 |
| #5 rewardswise.app | 0 | - | no JSON-LD | - | - | E010 |
| #6 maxrewards.com | 1 | Organization | valid | - | - | E011 |
| #7 joinkudos.com | 1 | Organization | valid | - | - | E012 |
| #8 cardstack.money | 2 | Article | valid | - | - | E013 |
| #8 cardstack.money | 2 | BreadcrumbList | valid | - | - | E013 |
| target / | 1 | Organization | valid | - | - | E018 |
| target / | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target / | 1 | FAQPage | valid | - | - | E018 |
| target /best-card | 1 | BreadcrumbList | valid | - | - | E018 |
| target /best-card | 1 | FAQPage | valid | - | - | E018 |
| target /best-card | 1 | Article | valid | - | - | E018 |
| target /best-card | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /credit-card-tracker | 1 | BreadcrumbList | valid | - | - | E018 |
| target /credit-card-tracker | 1 | FAQPage | valid | - | - | E018 |
| target /credit-card-tracker | 1 | Article | valid | - | - | E018 |
| target /credit-card-tracker | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /credit-card-simulator | 1 | BreadcrumbList | valid | - | - | E018 |
| target /credit-card-simulator | 1 | FAQPage | valid | - | - | E018 |
| target /credit-card-simulator | 1 | Article | valid | - | - | E018 |
| target /credit-card-simulator | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /bank-bonus-tracker | 1 | BreadcrumbList | valid | - | - | E018 |
| target /bank-bonus-tracker | 1 | FAQPage | valid | - | - | E018 |
| target /bank-bonus-tracker | 1 | Article | valid | - | - | E018 |
| target /bank-bonus-tracker | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /best-card/groceries | 1 | BreadcrumbList | valid | - | - | E018 |
| target /best-card/groceries | 1 | FAQPage | valid | - | - | E018 |
| target /best-card/groceries | 1 | Article | valid | - | - | E018 |
| target /best-card/groceries | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /best-card/dining | 1 | BreadcrumbList | valid | - | - | E018 |
| target /best-card/dining | 1 | FAQPage | valid | - | - | E018 |
| target /best-card/dining | 1 | Article | valid | - | - | E018 |
| target /best-card/dining | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /best-card/gas | 1 | BreadcrumbList | valid | - | - | E018 |
| target /best-card/gas | 1 | FAQPage | valid | - | - | E018 |
| target /best-card/gas | 1 | Article | valid | - | - | E018 |
| target /best-card/gas | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /best-card/travel | 1 | BreadcrumbList | valid | - | - | E018 |
| target /best-card/travel | 1 | FAQPage | valid | - | - | E018 |
| target /best-card/travel | 1 | Article | valid | - | - | E018 |
| target /best-card/travel | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target /coverage | 1 | BreadcrumbList | valid | - | - | E018 |
| target /coverage | 1 | FAQPage | valid | - | - | E018 |

## 5. AI-search readiness (target)

AI crawler access to `https://getcardlab.app/` from robots.txt [E015, E021]:

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

- /llms.txt: valid - title "CardLab", summary present, 9 section(s), 129 link(s) [E019]
- /llms-full.txt: valid - 586524 bytes, title "CardLab - full text" [E020]

| Source | Strategy | Performance | Accessibility | Best practices | SEO | Lab metrics | Field (CrUX) | Evidence |
|---|---|---|---|---|---|---|---|---|
| psi | mobile | skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key | | | | | | E022 |

## 6. Keyword gap (top 30)

Phrases used by ranking pages and absent from 10 crawled getcardlab.app pages. Ranked by competitors using them, then TF-IDF weighted by phrase length (title/meta/headings count 3x). No search volume on the free tier.

| # | Phrase | Competitors using | TF-IDF | Weighted count |
|---|---|---|---|---|
| 1 | maxrewards | 3 | 0.03886 | 63 |
| 2 | recommendations | 3 | 0.0183 | 12 |
| 3 | credits | 3 | 0.01394 | 24 |
| 4 | chase sapphire | 3 | 0.00681 | 11 |
| 5 | features | 3 | 0.00956 | 14 |
| 6 | sapphire | 3 | 0.00681 | 11 |
| 7 | gas ev | 3 | 0.00232 | 3 |
| 8 | travel cards | 3 | 0.00232 | 3 |
| 9 | capital | 3 | 0.00369 | 6 |
| 10 | activate | 3 | 0.00232 | 3 |
| 11 | everyday | 3 | 0.00232 | 3 |
| 12 | kudos | 2 | 0.16357 | 20 |
| 13 | partners | 2 | 0.02724 | 15 |
| 14 | awardwallet | 2 | 0.02624 | 49 |
| 15 | apps for tracking | 2 | 0.00844 | 16 |
| 16 | maximize | 2 | 0.01969 | 8 |
| 17 | chase sapphire preferred | 2 | 0.00537 | 8 |
| 18 | sapphire preferred card | 2 | 0.00537 | 8 |
| 19 | picks | 2 | 0.01567 | 12 |
| 20 | management | 2 | 0.01546 | 7 |
| 21 | programs | 2 | 0.0125 | 23 |
| 22 | checkout | 2 | 0.01076 | 11 |
| 23 | sapphire preferred | 2 | 0.00537 | 8 |
| 24 | changelog | 2 | 0.01049 | 3 |
| 25 | editorial | 2 | 0.01006 | 8 |
| 26 | loyalty programs | 2 | 0.00485 | 9 |
| 27 | extension | 2 | 0.0085 | 11 |
| 28 | premium | 2 | 0.0085 | 11 |
| 29 | chase sapphire reserve | 2 | 0.00283 | 3 |
| 30 | choosing | 2 | 0.00731 | 5 |

## 7. AI-citation table

No AI answers recorded yet. Ask each engine and log the cited URLs, for example:

```sh
seo-rea cite --out <this dir> --engine chatgpt --prompt "what is the best credit card rewards app" --urls "https://a.com/x,https://b.com/y"
```

## 8. Ads

SERP ads observed: 0. Ad libraries:

| Advertiser | Platform | Status | Visible count | Note | Lookup | Evidence |
|---|---|---|---|---|---|---|
| getcardlab.app | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=getcardlab.app | E024 |
| getcardlab.app | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=cardlab&search_type=keyword_unordered&media_type=all | E025 |
| getcardlab.app | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=cardlab | E026 |
| rewardswise.app | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=rewardswise.app | E027 |
| rewardswise.app | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=rewardswise&search_type=keyword_unordered&media_type=all | E028 |
| rewardswise.app | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=rewardswise | E029 |
| maxrewards.com | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=maxrewards.com | E030 |
| maxrewards.com | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=maxrewards&search_type=keyword_unordered&media_type=all | E031 |
| maxrewards.com | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=maxrewards | E032 |
| joinkudos.com | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=joinkudos.com | E033 |
| joinkudos.com | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=joinkudos&search_type=keyword_unordered&media_type=all | E034 |
| joinkudos.com | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=joinkudos | E035 |

Record what you find (count, run dates, hooks, offers, landing pages) as notes next to the evidence ID.

## 9. Playbook

1. Get listed in the roundups that already rank (forbes.com, cnbc.com, money.usnews.com, appshunter.io, cardstack.money): draft a short pitch with what the product does differently. Do not send from this tool. Most results are third-party roundups, so inclusion is the fastest way onto this SERP. [E001, E003]
2. Put "credit card rewards app" (or close wording) in the title and H1 of the page meant to rank. Ranking pages carry the keyword terms in their title; the target homepage does not. [E007, E010, E011, E012, E013, E017, E018]
3. Fix JSON-LD errors on the target: SoftwareApplication: needs one of: aggregateRating, review. Invalid structured data is ignored for rich results. [E017, E018]
4. Cover these competitor phrases in H2s and copy where they fit the product: maxrewards, recommendations, credits, chase sapphire, features, sapphire, gas ev, travel cards, capital, activate. Used by two or more ranking pages, missing from the target crawl. [E007, E010, E011, E012, E013, E017, E018]
5. Ask ChatGPT, Perplexity, Gemini and Grok "credit card rewards app" style prompts and log answers with `seo-rea cite`. AI-answer citations have not been recorded yet.
6. Open the ad-library links and note competitor ad hooks, offers and landing pages. Ad libraries need a browser; counts alone do not show the creative. [E024, E025, E026, E027, E028, E029, E030, E031, E032, E033, E034, E035]

Drafts only: this tool never sends outreach, buys ads or publishes changes.

## 10. Unknowns and cost

- Google (headless Chromium) rankings not observed
- Personalised and other-location results not observed
- On-page facts for forbes.com
- On-page facts for money.usnews.com
- On-page facts for appshunter.io
- Server or CDN bot blocking not tested
- Ads shown to logged-in or other-location users
- Ad counts, run dates, creatives
- Referring domains, link velocity
- PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Paid keyword data (volume, ranked keywords) skipped: budget is 0

Paid API spend this run: 0.0000 USD (budget 0 USD).
