# Strategy dossier: getcardlab.app vs cardpointers.com

seo-rea 0.4.0; run 20261015T064820Z; 2026-10-15T06:48:20.670Z; spent 0.0000 USD of 0. Every claim cites evidence IDs from [evidence/index.md](../evidence/index.md); (observed) means read from a fetched source, (inferred) means derived from those facts.

**Roles:** cardpointers.com leads getcardlab.app: equal SERP visibility (0); Tranco #365175 vs unranked.

## Top 10 actions for getcardlab.app

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | cardpointers.com weakness: Not in the checked results for 4/4 of its own head terms | high | M | content | E118, E120, E122, E124 |
| 2 | Give each unranked head term one page with the term in title and H1: "credit card", "bank bonus tracker", "bank bonuses", "card interest calculator" | getcardlab.app: Not in the checked results for 5/5 of its own head terms | high | M | content | E093, E097, E101, E112, E116 |
| 3 | Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | medium | S | seo | E090 |
| 4 | Build one page template like /offers/{x}-back-# and launch it for the 20 entities your users ask about most, then expand (cardpointers.com runs 11 of these; e.g. /offers/). | cardpointers.com driver #4 (strength 46, medium to copy): Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | high | L | dev | E077, E078 |
| 5 | Pick the 2-3 cardpointers.com clusters closest to your product (/cards, /offers) and publish 10+ linked pages in each before widening. | cardpointers.com driver #6 (strength 31, medium to copy): Topical breadth: 135 known URLs across 2 clusters of 10+ pages | high | L | content | E077, E078 |
| 6 | Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | cardpointers.com weakness: No JSON-LD on 22/30 sampled pages | medium | S | dev | E047, E048, E049, E050, E051, E052 |
| 7 | Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | cardpointers.com weakness: No H1 on 19/30 sampled pages | medium | S | content | E049, E050, E051, E052, E053, E054 |
| 8 | Prompt happy users for an App Store rating (now 1) | Few App Store ratings: "CardLab: Track Cards & Rewards" has 1. Average 5.0; Finance. | medium | S | seo | E045 |
| 9 | Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review | JSON-LD errors on 13 sampled page(s). SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review | medium | S | dev | E002, E007, E008, E009, E011, E012 |
| 10 | Get listed or reviewed on the sites that cover cardpointers: upgradedpoints.com, reddit.com, clark.com. | cardpointers.com driver #5 (strength 43, hard to copy): Third-party coverage: brand search "cardpointers" returns 3 other domains | medium | M | content | E083, E084, E085, E086, E128 |

Ranked by impact, then effort. Full data: [strategy.json](strategy.json).

## 1. Snapshot

### cardpointers.com (leader)

- **What it is** (observed, homepage meta description): Earn more rewards from your credit cards every day. [E047]
- **Homepage title / H1**: CardPointers: Credit card rewards made easy / Earn more from your credit cards every day. [E047]
- **Business model** (observed): Mobile app (App Store + Google Play links on site); store links found in page HTML [E047, E048, E050]
- **Business model** (inferred): Paid tier or subscription; URL paths /pro in sitemap/nav [E077, E047]
- **Business model** (inferred): Affiliate or partner revenue (advertiser/affiliate disclosure on pages); 2/30 fetched pages carry disclosure wording [E061, E073, E078]
- **Business model** (observed): Browser extension; extension store link or /extension page [E077, E047]
- **Audience** (inferred): People researching cards, offers; largest clusters: /cards (12), /offers (11) [E077, E078]
- **Audience** (observed): Navigation leads with: Save 50% →, CardPointers, iPhone iOS 15+, iPad iPadOS 15+, Mac macOS 12+ (Monterey), Vision Pro visionOS; homepage <nav>/<header> anchors in page order [E047]

### getcardlab.app (challenger)

- **What it is** (observed, homepage meta description): Track your cards and rewards privately: statements, due dates, reward caps and which card to use for any purchase. Checked catalog, 38 countries, no bank login. [E002]
- **Homepage title / H1**: CardLab: Track Cards & Rewards - No Bank Login / Track cards & rewards, and know which card to use. [E002]
- **Business model** (observed): Mobile app (App Store links on site); store links found in page HTML [E002, E006, E010]
- **Business model** (inferred): Paid tier or subscription; URL paths /pricing in sitemap/nav [E032, E002]
- **Business model** (inferred): Content publisher (editorial pages are the bulk of the site); 98/116 known URLs sit in blog/guide/review/comparison clusters [E032, E033]
- **Audience** (inferred): People researching bank bonus, credit card; largest clusters: /blog (72), /guide (13) [E032, E033]
- **Audience** (observed): Navigation leads with: Coverage, Calculators, Guide, Blog, credit card tracker, bank bonus tracker; homepage <nav>/<header> anchors in page order [E002]

## 2. Site and cluster map

### cardpointers.com

135 known URLs from 2 sitemap file(s) plus homepage navigation; 135 mapped in detail, 30 pages fetched. [E077, E078, E046]

| Cluster | URLs | Template | Fetched | Median words | Links/page | Inlinks | Hub pages | Themes | Example |
|---|---|---|---|---|---|---|---|---|---|
| //help.cardpointers.com/article | 73 | guide | 4 | 386 | 9 | 45 | - | offers, card, add | help.cardpointers.com/article/24-how-to-install-on-safari |
| /cards | 12 | page | 2 | 915 | 28 | 32 | /cards/ (12) | cards, american express, ink business | /cards/ |
| /offers | 11 | programmatic (page) | 2 | 222 | 27 | 31 | /offers/ (11) | offers, back, frozen yogurt | /offers/ |
| /(top-level) | 10 | page | 9 | 270 | 22 | 171 | - | ai, extension, search | /extension/ |
| /apps | 7 | product | 5 | 414 | 22 | 147 | /apps/iphone/ (7), /apps/ipad/ (7), /apps/mac/ (7) | apple, ipad, iphone | /apps/iphone/ |
| /help | 7 | guide | 0 | unknown | unknown | 7 | - | ai, extension | /help/extension/safari |
| //help.cardpointers.com/category | 6 | guide | 2 | 137 | 20 | 48 | help.cardpointers.com/category/16-cardpointers (6), help.cardpointers.com/category/17-frequently-asked-questions (6) | asked questions, frequently asked, center | help.cardpointers.com/category/16-cardpointers |
| /gift | 2 | tool | 1 | 320 | 23 | 22 | - | gift | /gift/ |
| /login | 2 | category | 1 | 140 | 23 | 22 | - | - | /login/ |
| /pro | 2 | product | 1 | 1,934 | 23 | 22 | - | pro | /pro/ |
| / | 1 | page | 1 | 483 | 22 | 29 | - | - | / |
| //help.cardpointers.com | 1 | category | 1 | 96 | 18 | 29 | - | - | help.cardpointers.com/ |
| //help.cardpointers.com/collection | 1 | guide | 1 | 81 | 18 | 0 | - | - | help.cardpointers.com/collection/1-cardpointers |

- **Programmatic** (inferred): /offers - 11 URLs, 90% match `/offers/{x}-back-#` (slug-affix). [E077, E078, E046]

### getcardlab.app

116 known URLs from 1 sitemap file(s) plus homepage navigation; 116 mapped in detail, 30 pages fetched. [E032, E033, E001]

| Cluster | URLs | Template | Fetched | Median words | Links/page | Inlinks | Hub pages | Themes | Example |
|---|---|---|---|---|---|---|---|---|---|
| /blog | 72 | blog | 4 | 1,298 | 50 | 283 | /blog (72), /blog/bank-bonus-vs-card-sign-up-offer (9), /blog/cardpointers-alternatives (6) | bank bonus, credit card, direct deposit | /blog |
| /guide | 13 | guide | 4 | 692 | 34 | 119 | /guide (13), /guide/statement-date (13), /guide/due-date (13) | credit card, date, grace period | /guide |
| /(top-level) | 11 | tool | 11 | 810 | 23 | 320 | - | credit card, bank bonus, bonus tracker | /credit-card-tracker |
| /blog/topic | 8 | blog | 4 | 985 | 51 | 74 | /blog/topic/bank-bonuses (8), /blog/topic/direct-deposit (8), /blog/topic/which-card (8) | bank bonuses, card, direct deposit | /blog/topic/bank-bonuses |
| /calculators | 6 | tool | 3 | 1,060 | 30 | 132 | /calculators (6) | credit card, bank bonus, calculator months | /calculators |
| /best-card | 5 | comparison | 3 | 1,220 | 30 | 44 | /best-card (5) | card, dining, groceries | /best-card |
| / | 1 | page | 1 | 2,471 | 35 | 30 | - | - | / |

- No programmatic pattern (15+ URLs on one slug pattern, id scheme or identical headings) found.

## 3. Keywords and rankings

- Google (headless Chromium) blocked on "credit card" (Google captcha (unusual traffic page)); not asked again this run.
- Google HTML blocked on "bank promo apy" (Google requires JavaScript, consent or captcha for automated requests); not asked again this run.
- DuckDuckGo HTML blocked on "bank promo apy" (DuckDuckGo anomaly (bot check) page); not asked again this run.

### cardpointers.com

Head terms derived from cardpointers.com's own titles, H1s, slugs and cluster themes (inferred target set). 0/4 checked terms rank top 10; 2 unknown (SERP blocked).

| Term | Docs | Rank | Engine | Top 3 on that SERP | Evidence |
|---|---|---|---|---|---|
| credit card offers | 3 | not in top 10 | Bing (headless Chromium) | 1. wallethub.com, 2. wallethub.com, 3. nerdwallet.com | E118 |
| credit cards | 11 | not in top 10 | Bing (headless Chromium) | 1. creditcards.com, 2. nerdwallet.com, 3. creditkarma.com | E120 |
| credit card rewards | 1 | not in top 10 | Bing (headless Chromium) | 1. nerdwallet.com, 2. thepointsguy.com, 3. creditcards.com | E122 |
| bank offers | 2 | not in top 10 | Bing (headless Chromium) | 1. moneycrashers.com, 2. nerdwallet.com, 3. bankbonus.com | E124 |
| gift card | 2 | unknown | - | - | - |
| amex offers | 1 | unknown | - | - | - |

### getcardlab.app

Head terms derived from getcardlab.app's own titles, H1s, slugs and cluster themes (inferred target set). 0/5 checked terms rank top 10; 5 unknown (SERP blocked).

| Term | Docs | Rank | Engine | Top 3 on that SERP | Evidence |
|---|---|---|---|---|---|
| credit card | 51 | not in top 10 | Bing (headless Chromium) | 1. creditcards.com, 2. bankofamerica.com, 3. nerdwallet.com | E093 |
| bank bonus tracker | 6 | not in top 10 | DuckDuckGo (headless Chromium) | 1. bankbonus.com, 2. thebonusstack.com, 3. bankbonusapp.com | E097 |
| bank bonuses | 16 | not in top 10 | DuckDuckGo (headless Chromium) | 1. doctorofcredit.com, 2. nerdwallet.com, 3. bankrate.com | E101 |
| bank promo apy | 3 | unknown (DuckDuckGo anomaly (bot check) page) | DuckDuckGo HTML | - | E109 |
| card interest calculator | 2 | not in top 10 | DuckDuckGo (headless Chromium) | 1. moneycalculators.net, 2. nerdwallet.com, 3. calculator.net | E112 |
| card payoff calculator | 2 | not in top 10 | DuckDuckGo (headless Chromium) | 1. calculator.net, 2. bankrate.com, 3. calculator.net | E116 |
| track cards rewards | 2 | unknown | - | - | - |
| bill generation date | 2 | unknown | - | - | - |
| card due date | 2 | unknown | - | - | - |
| card grace period | 2 | unknown | - | - | - |

## 4. Competitors (co-ranking domains)

| Domain | SERPs shared | Terms | Best | Median | Evidence |
|---|---|---|---|---|---|
| nerdwallet.com | 7 | "credit card", "bank bonuses", "card interest calculator" | 1 | 2 | E093, E101, E112, E118 |
| bankrate.com | 7 | "credit card", "bank bonuses", "card payoff calculator" | 2 | 4 | E093, E101, E116, E118 |
| forbes.com | 5 | "credit card", "bank bonuses", "credit cards" | 4 | 5 | E093, E101, E120, E122 |
| bankofamerica.com | 4 | "credit card", "credit card offers", "credit cards" | 2 | 6 | E093, E118, E120, E122 |
| creditcards.com | 3 | "credit card", "credit cards", "credit card rewards" | 1 | 1 | E093, E120, E122 |
| bankbonus.com | 3 | "bank bonus tracker", "bank bonuses", "bank offers" | 1 | 3 | E097, E101, E124 |
| finance.yahoo.com | 3 | "credit card offers", "credit card rewards", "bank offers" | 7 | 9 | E118, E122, E124 |
| calculator.net | 2 | "card interest calculator", "card payoff calculator" | 1 | 2 | E112, E116 |
| moneycrashers.com | 2 | "bank bonuses", "bank offers" | 1 | 3 | E101, E124 |
| creditkarma.com | 2 | "credit card", "credit cards" | 3 | 4 | E093, E120 |
| thepointsguy.com | 2 | "credit card offers", "credit card rewards" | 2 | 5 | E118, E122 |
| ultimatefinancecalculator.com | 2 | "card interest calculator", "card payoff calculator" | 4 | 6 | E112, E116 |
| creditcards.chase.com | 2 | "credit card", "credit cards" | 6 | 7 | E093, E120 |
| usbank.com | 2 | "credit card", "credit cards" | 6 | 7 | E093, E120 |
| bankcheckingsavings.com | 2 | "bank bonuses", "bank offers" | 6 | 8 | E101, E124 |

## 5. Pillars

### cardpointers.com

- **On-page** (observed, 30 pages): median title 33 chars; H1 on 37%; meta description on 97%; median 295 words and 2 H2s; 7 dated pages, median age 1,011 days, 0% updated within 12 months. [E047, E048, E049, E050, E051]
- **Technical** (observed): JSON-LD on 27% of pages (SearchAction 8, WebSite 8, BreadcrumbList 6, ListItem 6); 0 page(s) with schema errors; canonical on 27% (self 27%); 1 noindex; robots.txt missing; 2 sitemap file(s), 96 URLs; hreflang on 0 page(s), langs en; PageSpeed not available (PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key); median HTML 177 KB. [E047, E048, E049, E050, E051, E052]
- **Off-page** (observed, free sources): Tranco #365,175; Wikipedia articles linking 0; Wikipedia text mentions 0; Common Crawl index blocks 1; brand SERP third-party domains 3 (upgradedpoints.com, reddit.com, clark.com); press links on site 0. Unknown: Backlink counts and referring domains need a paid index; not measured at $0. [E083, E084, E085, E086, E128]
- **AEO** (observed): llms.txt valid; llms-full.txt present; AI crawlers blocked none (search bots: none); FAQPage schema on 0, Q&A blocks on 1 page(s); answer-first intros 14% (inferred); Organization schema no; citations logged 0 (use `seo-rea cite`). [E081, E079, E080, E047, E048, E049]
- **Paid** (observed): 0 own ad(s) across 9 usable SERPs; 0 SERP(s) showed any ads. Ad libraries: Google Ads Transparency Center manual check (E087); Meta Ad Library manual check (E088); LinkedIn Ad Library manual check (E089).
- **Distribution** (observed): iOS App Store, Google Play, Browser extension, Social: instagram, Social: x, Social: youtube, Social: facebook, Community, Newsletter; affiliate/advertiser disclosure present. [E047, E048, E049, E050, E051, E052]

### getcardlab.app

- **On-page** (observed, 30 pages): median title 47 chars; H1 on 100%; meta description on 100%; median 972 words and 6 H2s; 26 dated pages, median age 18 days, 100% updated within 12 months. [E002, E003, E004, E005, E006]
- **Technical** (observed): JSON-LD on 100% of pages (BreadcrumbList 28, ListItem 28, Answer 20, FAQPage 20, Question 20, Offer 13); 13 page(s) with schema errors (SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review); canonical on 100% (self 100%); 0 noindex; robots.txt found; 1 sitemap file(s), 114 URLs; hreflang on 0 page(s), langs en; PageSpeed not available (PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key); median HTML 20 KB. [E002, E003, E004, E005, E006, E007]
- **Off-page** (observed, free sources): Tranco not in top 1M or unavailable; Wikipedia articles linking 0; Wikipedia text mentions 3; Common Crawl index blocks 0; brand SERP third-party domains 1 (gpaycard.net); press links on site 0. Unknown: Backlink counts and referring domains need a paid index; not measured at $0. [E038, E039, E040, E041, E126]
- **AEO** (observed): llms.txt valid; llms-full.txt present; AI crawlers blocked none (search bots: none); FAQPage schema on 20, Q&A blocks on 24 page(s); answer-first intros 31% (inferred); Organization schema yes, 1 sameAs; citations logged 0 (use `seo-rea cite`). [E036, E034, E035, E002, E003, E004]
- **Paid** (observed): 0 own ad(s) across 9 usable SERPs; 0 SERP(s) showed any ads. Ad libraries: Google Ads Transparency Center manual check (E042); Meta Ad Library manual check (E043); LinkedIn Ad Library manual check (E044).
- **Distribution** (observed): iOS App Store. [E002, E006, E010, E017, E020, E022]

## 6. Ranked drivers (why it leads)

### cardpointers.com

cardpointers.com ranks top 10 for 0/4 of its own checked head terms, so these are assets it has, not proven reasons it ranks.

| # | Driver | Strength | Copy | Basis | Evidence |
|---|---|---|---|---|---|
| 1 | App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | 86 | hard | observed | E090 |
| 2 | Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | 85 | hard | observed | E047, E048, E049, E050 |
| 3 | Popularity: Tranco rank #365,175 | 50 | hard | observed | E083, E084 |
| 4 | Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | 46 | medium | inferred | E077, E078 |
| 5 | Third-party coverage: brand search "cardpointers" returns 3 other domains | 43 | hard | observed | E083, E084, E085, E086 |
| 6 | Topical breadth: 135 known URLs across 2 clusters of 10+ pages | 31 | medium | observed | E077, E078 |

1. **App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings** - Finance; Free; last update 2026-10-13. Store listings rank for brand and category searches and send users who never touch the website. How hard to copy: hard; Ratings accrue with users; prompt for reviews at the moment of value.
2. **Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter** - iOS App Store (https://apps.apple.com/app/apple-store/id1472875808?pt=285054&ct=homepage&mt=8); Google Play (https://play.google.com/store/apps/details?id=com.cardpointers.app); Browser extension (https://chrome.google.com/webstore/detail/cardpointers-x/hlambnnbnnjkabpgemeompijpdliimkm); Social: instagram (https://www.instagram.com/cardpointers/); Social: x (https://twitter.com/cardpointers); Social: youtube (https://www.youtube.com/channel/UCQETiaLC_AZWDgEhQeKki2w); Social: facebook (https://www.facebook.com/cardpointers); Community (https://www.reddit.com/r/cardpointers); Newsletter How hard to copy: hard; Each channel is a product or a habit, not a page.
3. **Popularity: Tranco rank #365,175** - Tranco ranks the top 1M domains by aggregated traffic lists (2026-10-14). How hard to copy: hard; Brand demand and reference links build over years.
4. **Programmatic pages: 11 URLs on one template at /offers/{x}-back-#** - 90% of /offers URLs fit /offers/{x}-back-# (slug-affix). Examples: /offers/, /offers/menchies-frozen-yogurt-lake-nona-5-back-48/, /offers/tsuki-sushi-grill-5-back-50/. How hard to copy: medium; Needs a structured data source covering ~11 entities plus a template; the template is easy, the data is the moat.
5. **Third-party coverage: brand search "cardpointers" returns 3 other domains** - Domains: upgradedpoints.com, reddit.com, clark.com. How hard to copy: hard; Reviews, forums and press pick a brand up once it has users.
6. **Topical breadth: 135 known URLs across 2 clusters of 10+ pages** - Largest clusters: /cards (12, page), /offers (11, programmatic). getcardlab.app matches this (Topical breadth: 116 known URLs across 2 clusters of 10+ pages). How hard to copy: medium; Years of publishing; copy the cluster shape, not the volume.

### getcardlab.app

getcardlab.app ranks top 10 for 0/5 of its own checked head terms, so these are assets it has, not proven reasons it ranks.

| # | Driver | Strength | Copy | Basis | Evidence |
|---|---|---|---|---|---|
| 1 | Interactive tools: 10 calculator/tool URLs | 78 | medium | inferred | E032, E033 |
| 2 | Fresh content: 100% of 26 dated pages updated within 12 months | 75 | medium | observed | E002, E003, E004, E005 |
| 3 | Commercial-intent pages: 21 review/comparison URLs in the mapped sample | 72 | medium | inferred | E032, E033 |
| 4 | Structured data on 100% of 30 sampled pages | 66 | easy | observed | E002, E003, E004, E005 |
| 5 | Answer-ready for AI search: 31% of inner pages open with a direct answer, 24 pages with Q&A blocks, FAQPage schema on 20, valid llms.txt | 64 | easy | observed | E036, E034, E035, E002 |
| 6 | Hub pages: /blog links to 72 pages in /blog | 54 | easy | observed | E006 |
| 7 | Topical breadth: 116 known URLs across 2 clusters of 10+ pages | 30 | medium | observed | E032, E033 |

1. **Interactive tools: 10 calculator/tool URLs** - Examples: /calculators, /credit-card-tracker, /credit-card-simulator, /bank-bonus-tracker. How hard to copy: medium; Needs engineering, then earns links and repeat visits.
2. **Fresh content: 100% of 26 dated pages updated within 12 months** - Median page age 18 days (dateModified, article:modified_time or visible "Updated" text). How hard to copy: medium; Needs an editorial refresh calendar.
3. **Commercial-intent pages: 21 review/comparison URLs in the mapped sample** - Examples: /best-card, /blog/cardpointers-alternatives, /best-card/groceries, /blog/bank-bonus-vs-card-sign-up-offer. How hard to copy: medium; Needs honest product testing to be credible.
4. **Structured data on 100% of 30 sampled pages** - Types by page count: BreadcrumbList 28, ListItem 28, Answer 20, FAQPage 20, Question 20. Pages with JSON-LD errors: 13. How hard to copy: easy; A template change; no content needed.
5. **Answer-ready for AI search: 31% of inner pages open with a direct answer, 24 pages with Q&A blocks, FAQPage schema on 20, valid llms.txt** - No AI search crawler (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot) is blocked. How hard to copy: easy; Formatting and robots.txt changes.
6. **Hub pages: /blog links to 72 pages in /blog** - /blog -> /blog (72); /guide -> /guide (13); /guide/statement-date -> /guide (13); /guide/due-date -> /guide (13) How hard to copy: easy; Pure site architecture.
7. **Topical breadth: 116 known URLs across 2 clusters of 10+ pages** - Largest clusters: /blog (72, blog), /guide (13, guide). cardpointers.com matches this (Topical breadth: 135 known URLs across 2 clusters of 10+ pages). How hard to copy: medium; Years of publishing; copy the cluster shape, not the volume.

## 7. Copyable playbook

Steps getcardlab.app can copy from cardpointers.com, ranked by impact then effort.

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | M | high | cardpointers.com weakness: Not in the checked results for 4/4 of its own head terms | E118, E120, E122, E124 |
| Give each unranked head term one page with the term in title and H1: "credit card", "bank bonus tracker", "bank bonuses", "card interest calculator" | M | high | getcardlab.app: Not in the checked results for 5/5 of its own head terms | E093, E097, E101, E112 |
| Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | S | medium | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | E090 |
| Build one page template like /offers/{x}-back-# and launch it for the 20 entities your users ask about most, then expand (cardpointers.com runs 11 of these; e.g. /offers/). | L | high | cardpointers.com driver #4 (strength 46, medium to copy): Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | E077, E078 |
| Pick the 2-3 cardpointers.com clusters closest to your product (/cards, /offers) and publish 10+ linked pages in each before widening. | L | high | cardpointers.com driver #6 (strength 31, medium to copy): Topical breadth: 135 known URLs across 2 clusters of 10+ pages | E077, E078 |
| Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | S | medium | cardpointers.com weakness: No JSON-LD on 22/30 sampled pages | E047, E048, E049, E050 |
| Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | S | medium | cardpointers.com weakness: No H1 on 19/30 sampled pages | E049, E050, E051, E052 |
| Get listed or reviewed on the sites that cover cardpointers: upgradedpoints.com, reddit.com, clark.com. | M | medium | cardpointers.com driver #5 (strength 43, hard to copy): Third-party coverage: brand search "cardpointers" returns 3 other domains | E083, E084, E085, E086 |
| Publish dated, current versions of its oldest topics (median age 1011 days). | M | medium | cardpointers.com weakness: Stale content: median page age 1011 days across 7 dated pages | E047, E048, E049, E050 |
| Add the owned channels cardpointers.com uses that you lack (iOS App Store, Google Play, Browser extension, social, Community, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | cardpointers.com driver #2 (strength 85, hard to copy): Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | E047, E048, E049, E050 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (cardpointers.com is linked from 0 Wikipedia article(s)). | L | medium | cardpointers.com driver #3 (strength 50, hard to copy): Popularity: Tranco rank #365,175 | E083, E084 |

## 8. Weaknesses and openings

### cardpointers.com

| Severity | Weakness | Detail | Opening | Evidence |
|---|---|---|---|---|
| high | Not in the checked results for 4/4 of its own head terms | "credit card offers" (#1 wallethub.com); "credit cards" (#1 creditcards.com); "credit card rewards" (#1 nerdwallet.com); "bank offers" (#1 moneycrashers.com) | Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | E118, E120, E122, E124 |
| medium | No JSON-LD on 22/30 sampled pages | e.g. /, /partner/prime/, /search/. | Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | E047, E048, E049, E050 |
| medium | Stale content: median page age 1011 days across 7 dated pages | None updated within 12 months. | Publish dated, current versions of its oldest topics (median age 1011 days). | E047, E048, E049, E050 |
| medium | No H1 on 19/30 sampled pages | e.g. /search/, /apps/iphone/, /apps/ipad/. | Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | E049, E050, E051, E052 |
| low | Thin cluster /offers: median 222 words over 2 fetched pages | 11 URLs, programmatic template; examples /offers/, /offers/menchies-frozen-yogurt-lake-nona-5-back-48/. | Out-write /offers with ~800-word pages on offers, back, frozen yogurt. | E078 |
| low | Only 14% of 29 inner pages open with a direct answer | First paragraph after the H1 is missing, too long, or does not name the topic. | Lead your pages with the answer; cardpointers.com does so on 14% of inner pages. | E048, E049, E050, E051 |
| low | No canonical tag on 22/30 sampled pages | e.g. /, /partner/prime/, /search/. | Duplicate URLs split signals. | E047, E048, E049, E050 |

### getcardlab.app

| Severity | Weakness | Detail | Opening | Evidence |
|---|---|---|---|---|
| high | Not in the checked results for 5/5 of its own head terms | "credit card" (#1 creditcards.com); "bank bonus tracker" (#1 bankbonus.com); "bank bonuses" (#1 doctorofcredit.com); "card interest calculator" (#1 moneycalculators.net); "card payoff calculator" (#1 calculator.net) | Publish a better page for "credit card", "bank bonus tracker", "bank bonuses"; getcardlab.app is not in the checked results. | E093, E097, E101, E112 |
| medium | Few App Store ratings: "CardLab: Track Cards & Rewards" has 1 | Average 5.0; Finance. | A rival app with more ratings wins the store search and the trust check. | E045 |
| medium | Weak public footprint: not in the Tranco top 1M; 0 Wikipedia links | Brand SERP third-party domains: 1. | Out-earn its mentions: getcardlab.app is outside the Tranco top 1M with 0 Wikipedia links. | E038, E039, E040, E041 |
| low | JSON-LD errors on 13 sampled page(s) | SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review | Invalid markup is ignored for rich results. | E002, E007, E008, E009 |

## 9. 30/60/90-day plan for getcardlab.app

**Days 1-30 (small effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | S | medium | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | E090 |
| Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | S | medium | cardpointers.com weakness: No JSON-LD on 22/30 sampled pages | E047, E048, E049, E050 |
| Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | S | medium | cardpointers.com weakness: No H1 on 19/30 sampled pages | E049, E050, E051, E052 |

**Days 31-60 (medium effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | M | high | cardpointers.com weakness: Not in the checked results for 4/4 of its own head terms | E118, E120, E122, E124 |
| Give each unranked head term one page with the term in title and H1: "credit card", "bank bonus tracker", "bank bonuses", "card interest calculator" | M | high | getcardlab.app: Not in the checked results for 5/5 of its own head terms | E093, E097, E101, E112 |
| Get listed or reviewed on the sites that cover cardpointers: upgradedpoints.com, reddit.com, clark.com. | M | medium | cardpointers.com driver #5 (strength 43, hard to copy): Third-party coverage: brand search "cardpointers" returns 3 other domains | E083, E084, E085, E086 |
| Publish dated, current versions of its oldest topics (median age 1011 days). | M | medium | cardpointers.com weakness: Stale content: median page age 1011 days across 7 dated pages | E047, E048, E049, E050 |

**Days 61-90 (large effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Build one page template like /offers/{x}-back-# and launch it for the 20 entities your users ask about most, then expand (cardpointers.com runs 11 of these; e.g. /offers/). | L | high | cardpointers.com driver #4 (strength 46, medium to copy): Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | E077, E078 |
| Pick the 2-3 cardpointers.com clusters closest to your product (/cards, /offers) and publish 10+ linked pages in each before widening. | L | high | cardpointers.com driver #6 (strength 31, medium to copy): Topical breadth: 135 known URLs across 2 clusters of 10+ pages | E077, E078 |
| Add the owned channels cardpointers.com uses that you lack (iOS App Store, Google Play, Browser extension, social, Community, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | cardpointers.com driver #2 (strength 85, hard to copy): Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | E047, E048, E049, E050 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (cardpointers.com is linked from 0 Wikipedia article(s)). | L | medium | cardpointers.com driver #3 (strength 50, hard to copy): Popularity: Tranco rank #365,175 | E083, E084 |

## 10. Side-by-side (--vs)

Leader: **cardpointers.com**; challenger: **getcardlab.app**. cardpointers.com leads getcardlab.app: equal SERP visibility (0); Tranco #365175 vs unranked. [E093, E097, E101, E112, E116, E118]

| Pillar | Metric | cardpointers.com | getcardlab.app | Edge |
|---|---|---|---|---|
| Map | Known URLs (sitemaps + nav) | 135 | 116 | leader |
| Map | Clusters with 10+ URLs | 3 | 2 | leader |
| Map | Programmatic clusters | 1 | 0 | leader |
| Keywords | Own head terms in top 10 | 0 | 0 | even |
| On-page | Median words per sampled page | 295 | 972 | challenger |
| On-page | Pages with meta description | 97% | 100% | challenger |
| On-page | Dated pages updated within 12 months | 0% | 100% | challenger |
| Technical | Pages with JSON-LD | 27% | 100% | challenger |
| Technical | Pages with JSON-LD errors | 0 | 13 | leader |
| Technical | Self-canonical pages | 27% | 100% | challenger |
| Technical | Mobile PageSpeed performance | unknown | unknown | unknown |
| Technical | Median HTML KB | 177 | 20 | challenger |
| Off-page | Tranco rank (lower is better) | #365,175 | unknown | unknown |
| Off-page | Wikipedia articles linking | 0 | 0 | even |
| Off-page | Wikipedia text mentions of brand | 0 | 3 | challenger |
| Off-page | Third-party domains on brand SERP | 3 | 1 | leader |
| AEO | Valid llms.txt | yes | yes | even |
| AEO | AI search crawlers blocked | 0 | 0 | even |
| AEO | Pages with Q&A blocks | 1 | 24 | challenger |
| AEO | Answer-first inner pages | 14% | 31% | challenger |
| AEO | Organization sameAs links | 0 | 1 | challenger |
| Paid | Own ads on checked SERPs | 0 | 0 | even |
| Distribution | Owned channels found | 9 | 1 | leader |
| Distribution | App Store ratings | 10,355 | 1 | leader |

**Cluster gaps** (topics cardpointers.com covers that getcardlab.app has no URL, title or heading for; inferred):

None found: every leader cluster has a matching term or path on the challenger.

**Keyword overlap** (checked SERPs, top 10):

- Both rank: none
- Only cardpointers.com: none
- Only getcardlab.app: none
- Neither: "credit card", "bank bonus tracker", "bank bonuses", "card interest calculator", "card payoff calculator", "credit card offers", "credit cards", "credit card rewards", "bank offers"
- Unknown (SERP blocked): "bank promo apy"
- Leader terms absent from getcardlab.app's titles and URLs: "credit card offers", "bank offers", "gift card", "amex offers"

**First moves for getcardlab.app:**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Give each unranked head term one page with the term in title and H1: "credit card", "bank bonus tracker", "bank bonuses", "card interest calculator" | M | high | getcardlab.app: Not in the checked results for 5/5 of its own head terms | E093, E097, E101, E112 |
| Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | M | high | cardpointers.com weakness: Not in the checked results for 4/4 of its own head terms | E118, E120, E122, E124 |
| Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | S | medium | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | E090 |

## Unknowns

- getcardlab.app: PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- cardpointers.com: PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Paid data (search volume, backlinks, paid SERP fallback) skipped: budget is 0
- 1/12 SERP checks were blocked or degraded; rankings for "bank promo apy" are unknown
- getcardlab.app: Backlink counts and referring domains need a paid index; not measured at $0
- cardpointers.com: Backlink counts and referring domains need a paid index; not measured at $0

Full data: [strategy.json](strategy.json). Run data: [../data/strategy-run.json](../data/strategy-run.json).
