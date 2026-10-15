# Strategy dossier: cardpointers.com

seo-rea 0.4.0; run 20261015T064612Z; 2026-10-15T06:46:12.359Z; spent 0.0000 USD of 0. Every claim cites evidence IDs from [evidence/index.md](../evidence/index.md); (observed) means read from a fetched source, (inferred) means derived from those facts.

**Roles:** Single-domain run: cardpointers.com is analysed as the leader.

## Top 10 actions for cardpointers.com

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Build a page that targets "credit card offers" (closest page now: /cards/) | cardpointers.com is not in the 10 results Bing (headless Chromium) returned; #1 is wallethub.com/best-credit-card-deals. The phrase appears in 3 of the site's titles/H1s/slugs. | high | M | content | E048, E016 |
| 2 | Build a page that targets "credit cards" (closest page now: /) | cardpointers.com is not in the 10 results Bing (headless Chromium) returned; #1 is creditcards.com/. The phrase appears in 11 of the site's titles/H1s/slugs. | high | M | content | E050, E002 |
| 3 | Build a page that targets "credit card rewards" (closest page now: /) | cardpointers.com is not in the 10 results Bing (headless Chromium) returned; #1 is nerdwallet.com/credit-cards/best/rewards. The phrase appears in 1 of the site's titles/H1s/slugs. | high | M | content | E052, E002 |
| 4 | Build a page that targets "bank offers" (closest page now: /offers/) | cardpointers.com is not in the 10 results Bing (headless Chromium) returned; #1 is moneycrashers.com/best-new-bank-account-promotions-offers/. The phrase appears in 2 of the site's titles/H1s/slugs. | high | M | content | E054, E015 |
| 5 | Build a page that targets "gift card" (closest page now: /gift/) | cardpointers.com is not in the 10 results Bing (headless Chromium) returned; #1 is apple.com/shop/gift-cards. The phrase appears in 2 of the site's titles/H1s/slugs. | high | M | content | E056, E025 |
| 6 | Add JSON-LD to the 22 unmarked pages (/, /partner/prime/): Organization on home, Article/Product/FAQPage by template | No JSON-LD on 22/30 sampled pages. e.g. /, /partner/prime/, /search/. | medium | S | dev | E002, E003, E004, E005, E006, E007 |
| 7 | Add one descriptive H1 per page (/search/, /apps/iphone/ first) | No H1 on 19/30 sampled pages. e.g. /search/, /apps/iphone/, /apps/ipad/. | medium | S | content | E004, E005, E006, E007, E008, E009 |
| 8 | Open each inner page with a 1-3 sentence answer that repeats the H1 topic | Only 14% of 29 inner pages open with a direct answer. First paragraph after the H1 is missing, too long, or does not name the topic. | medium | S | content | E003, E004, E005, E006, E007, E008 |
| 9 | Refresh and re-date the oldest high-traffic pages first | Stale content: median page age 1011 days across 7 dated pages. None updated within 12 months. | medium | M | content | E002, E003, E004, E005, E006, E007 |
| 10 | Expand /offers pages past 600 words with answers and examples | Thin cluster /offers: median 222 words over 2 fetched pages. 11 URLs, programmatic template; examples /offers/, /offers/menchies-frozen-yogurt-lake-nona-5-back-48/. | medium | M | content | E033 |

Ranked by impact, then effort. Full data: [strategy.json](strategy.json).

## 1. Snapshot

### cardpointers.com (subject)

- **What it is** (observed, homepage meta description): Earn more rewards from your credit cards every day. [E002]
- **Homepage title / H1**: CardPointers: Credit card rewards made easy / Earn more from your credit cards every day. [E002]
- **Business model** (observed): Mobile app (App Store + Google Play links on site); store links found in page HTML [E002, E003, E005]
- **Business model** (inferred): Paid tier or subscription; URL paths /pro in sitemap/nav [E032, E002]
- **Business model** (inferred): Affiliate or partner revenue (advertiser/affiliate disclosure on pages); 2/30 fetched pages carry disclosure wording [E016, E028, E033]
- **Business model** (observed): Browser extension; extension store link or /extension page [E032, E002]
- **Audience** (inferred): People researching cards, offers; largest clusters: /cards (12), /offers (11) [E032, E033]
- **Audience** (observed): Navigation leads with: Save 50% →, CardPointers, iPhone iOS 15+, iPad iPadOS 15+, Mac macOS 12+ (Monterey), Vision Pro visionOS; homepage <nav>/<header> anchors in page order [E002]

## 2. Site and cluster map

### cardpointers.com

135 known URLs from 2 sitemap file(s) plus homepage navigation; 135 mapped in detail, 30 pages fetched. [E032, E033, E001]

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

- **Programmatic** (inferred): /offers - 11 URLs, 90% match `/offers/{x}-back-#` (slug-affix). [E032, E033, E001]

## 3. Keywords and rankings

- Google (headless Chromium) blocked on "credit card offers" (Google captcha (unusual traffic page)); not asked again this run.

### cardpointers.com

Head terms derived from cardpointers.com's own titles, H1s, slugs and cluster themes (inferred target set). 0/6 checked terms rank top 10; 0 unknown (SERP blocked).

| Term | Docs | Rank | Engine | Top 3 on that SERP | Evidence |
|---|---|---|---|---|---|
| credit card offers | 3 | not in top 10 | Bing (headless Chromium) | 1. wallethub.com, 2. wallethub.com, 3. nerdwallet.com | E048 |
| credit cards | 11 | not in top 10 | Bing (headless Chromium) | 1. creditcards.com, 2. nerdwallet.com, 3. creditkarma.com | E050 |
| credit card rewards | 1 | not in top 10 | Bing (headless Chromium) | 1. nerdwallet.com, 2. thepointsguy.com, 3. creditcards.com | E052 |
| bank offers | 2 | not in top 10 | Bing (headless Chromium) | 1. moneycrashers.com, 2. nerdwallet.com, 3. bankbonus.com | E054 |
| gift card | 2 | not in top 10 | Bing (headless Chromium) | 1. apple.com, 2. giftcards.com, 3. amazon.com | E056 |
| amex offers | 1 | not in top 10 | Bing (headless Chromium) | 1. americanexpress.com, 2. upgradedpoints.com, 3. americanexpress.com | E058 |

## 4. Competitors (co-ranking domains)

| Domain | SERPs shared | Terms | Best | Median | Evidence |
|---|---|---|---|---|---|
| nerdwallet.com | 4 | "credit card offers", "credit cards", "credit card rewards" | 1 | 2 | E048, E050, E052, E054 |
| bankrate.com | 4 | "credit card offers", "credit cards", "credit card rewards" | 4 | 6 | E048, E050, E052, E054 |
| forbes.com | 3 | "credit cards", "credit card rewards", "bank offers" | 4 | 4 | E050, E052, E054 |
| thepointsguy.com | 3 | "credit card offers", "credit card rewards", "amex offers" | 2 | 7 | E048, E052, E058 |
| bankofamerica.com | 3 | "credit card offers", "credit cards", "credit card rewards" | 4 | 8 | E048, E050, E052 |
| finance.yahoo.com | 3 | "credit card offers", "credit card rewards", "bank offers" | 7 | 9 | E048, E052, E054 |
| creditcards.com | 2 | "credit cards", "credit card rewards" | 1 | 2 | E050, E052 |
| upgradedpoints.com | 2 | "credit card offers", "amex offers" | 2 | 4 | E048, E058 |
| americanexpress.com | 2 | "credit cards", "amex offers" | 1 | 5 | E050, E058 |
| awardwallet.com | 2 | "credit card offers", "amex offers" | 8 | 9 | E048, E058 |
| apple.com | 1 | "gift card" | 1 | 1 | E056 |
| moneycrashers.com | 1 | "bank offers" | 1 | 1 | E054 |
| wallethub.com | 1 | "credit card offers" | 1 | 1 | E048 |
| giftcards.com | 1 | "gift card" | 2 | 2 | E056 |
| amazon.com | 1 | "gift card" | 3 | 3 | E056 |

## 5. Pillars

### cardpointers.com

- **On-page** (observed, 30 pages): median title 33 chars; H1 on 37%; meta description on 97%; median 295 words and 2 H2s; 7 dated pages, median age 1,011 days, 0% updated within 12 months. [E002, E003, E004, E005, E006]
- **Technical** (observed): JSON-LD on 27% of pages (SearchAction 8, WebSite 8, BreadcrumbList 6, ListItem 6); 0 page(s) with schema errors; canonical on 27% (self 27%); 1 noindex; robots.txt missing; 2 sitemap file(s), 96 URLs; hreflang on 0 page(s), langs en; PageSpeed not available (PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key); median HTML 177 KB. [E002, E003, E004, E005, E006, E007]
- **Off-page** (observed, free sources): Tranco #365,175; Wikipedia articles linking 0; Wikipedia text mentions 0; Common Crawl index blocks 1; brand SERP third-party domains 3 (upgradedpoints.com, reddit.com, clark.com); press links on site 0. Unknown: Backlink counts and referring domains need a paid index; not measured at $0. [E038, E039, E040, E041, E060]
- **AEO** (observed): llms.txt valid; llms-full.txt present; AI crawlers blocked none (search bots: none); FAQPage schema on 0, Q&A blocks on 1 page(s); answer-first intros 14% (inferred); Organization schema no; citations logged 0 (use `seo-rea cite`). [E036, E034, E035, E002, E003, E004]
- **Paid** (observed): 0 own ad(s) across 6 usable SERPs; 0 SERP(s) showed any ads. Ad libraries: Google Ads Transparency Center manual check (E042); Meta Ad Library manual check (E043); LinkedIn Ad Library manual check (E044).
- **Distribution** (observed): iOS App Store, Google Play, Browser extension, Social: instagram, Social: x, Social: youtube, Social: facebook, Community, Newsletter; affiliate/advertiser disclosure present. [E002, E003, E004, E005, E006, E007]

## 6. Ranked drivers (why it leads)

### cardpointers.com

cardpointers.com ranks top 10 for 0/6 of its own checked head terms, so these are assets it has, not proven reasons it ranks.

| # | Driver | Strength | Copy | Basis | Evidence |
|---|---|---|---|---|---|
| 1 | App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | 86 | hard | observed | E045 |
| 2 | Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | 85 | hard | observed | E002, E003, E004, E005 |
| 3 | Topical breadth: 135 known URLs across 2 clusters of 10+ pages | 51 | medium | observed | E032, E033 |
| 4 | Popularity: Tranco rank #365,175 | 50 | hard | observed | E038, E039 |
| 5 | Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | 46 | medium | inferred | E032, E033 |
| 6 | Third-party coverage: brand search "cardpointers" returns 3 other domains | 43 | hard | observed | E038, E039, E040, E041 |

1. **App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings** - Finance; Free; last update 2026-10-13. Store listings rank for brand and category searches and send users who never touch the website. How hard to copy: hard; Ratings accrue with users; prompt for reviews at the moment of value.
2. **Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter** - iOS App Store (https://apps.apple.com/app/apple-store/id1472875808?pt=285054&ct=homepage&mt=8); Google Play (https://play.google.com/store/apps/details?id=com.cardpointers.app); Browser extension (https://chrome.google.com/webstore/detail/cardpointers-x/hlambnnbnnjkabpgemeompijpdliimkm); Social: instagram (https://www.instagram.com/cardpointers/); Social: x (https://twitter.com/cardpointers); Social: youtube (https://www.youtube.com/channel/UCQETiaLC_AZWDgEhQeKki2w); Social: facebook (https://www.facebook.com/cardpointers); Community (https://www.reddit.com/r/cardpointers); Newsletter How hard to copy: hard; Each channel is a product or a habit, not a page.
3. **Topical breadth: 135 known URLs across 2 clusters of 10+ pages** - Largest clusters: /cards (12, page), /offers (11, programmatic). How hard to copy: medium; Years of publishing; copy the cluster shape, not the volume.
4. **Popularity: Tranco rank #365,175** - Tranco ranks the top 1M domains by aggregated traffic lists (2026-10-14). How hard to copy: hard; Brand demand and reference links build over years.
5. **Programmatic pages: 11 URLs on one template at /offers/{x}-back-#** - 90% of /offers URLs fit /offers/{x}-back-# (slug-affix). Examples: /offers/, /offers/menchies-frozen-yogurt-lake-nona-5-back-48/, /offers/tsuki-sushi-grill-5-back-50/. How hard to copy: medium; Needs a structured data source covering ~11 entities plus a template; the template is easy, the data is the moat.
6. **Third-party coverage: brand search "cardpointers" returns 3 other domains** - Domains: upgradedpoints.com, reddit.com, clark.com. How hard to copy: hard; Reviews, forums and press pick a brand up once it has users.

## 7. Copyable playbook

Steps a challenger can copy from cardpointers.com, ranked by impact then effort.

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | M | high | cardpointers.com weakness: Not in the checked results for 6/6 of its own head terms | E048, E050, E052, E054 |
| Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | S | medium | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | E045 |
| Pick the 2-3 cardpointers.com clusters closest to your product (/cards, /offers) and publish 10+ linked pages in each before widening. | L | high | cardpointers.com driver #3 (strength 51, medium to copy): Topical breadth: 135 known URLs across 2 clusters of 10+ pages | E032, E033 |
| Build one page template like /offers/{x}-back-# and launch it for the 20 entities your users ask about most, then expand (cardpointers.com runs 11 of these; e.g. /offers/). | L | high | cardpointers.com driver #5 (strength 46, medium to copy): Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | E032, E033 |
| Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | S | medium | cardpointers.com weakness: No JSON-LD on 22/30 sampled pages | E002, E003, E004, E005 |
| Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | S | medium | cardpointers.com weakness: No H1 on 19/30 sampled pages | E004, E005, E006, E007 |
| Get listed or reviewed on the sites that cover cardpointers: upgradedpoints.com, reddit.com, clark.com. | M | medium | cardpointers.com driver #6 (strength 43, hard to copy): Third-party coverage: brand search "cardpointers" returns 3 other domains | E038, E039, E040, E041 |
| Publish dated, current versions of its oldest topics (median age 1011 days). | M | medium | cardpointers.com weakness: Stale content: median page age 1011 days across 7 dated pages | E002, E003, E004, E005 |
| Add the owned channels cardpointers.com uses that you lack (iOS App Store, Google Play, Browser extension, social, Community, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | cardpointers.com driver #2 (strength 85, hard to copy): Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | E002, E003, E004, E005 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (cardpointers.com is linked from 0 Wikipedia article(s)). | L | medium | cardpointers.com driver #4 (strength 50, hard to copy): Popularity: Tranco rank #365,175 | E038, E039 |

## 8. Weaknesses and openings

### cardpointers.com

| Severity | Weakness | Detail | Opening | Evidence |
|---|---|---|---|---|
| high | Not in the checked results for 6/6 of its own head terms | "credit card offers" (#1 wallethub.com); "credit cards" (#1 creditcards.com); "credit card rewards" (#1 nerdwallet.com); "bank offers" (#1 moneycrashers.com); "gift card" (#1 apple.com) | Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | E048, E050, E052, E054 |
| medium | No JSON-LD on 22/30 sampled pages | e.g. /, /partner/prime/, /search/. | Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | E002, E003, E004, E005 |
| medium | Stale content: median page age 1011 days across 7 dated pages | None updated within 12 months. | Publish dated, current versions of its oldest topics (median age 1011 days). | E002, E003, E004, E005 |
| medium | No H1 on 19/30 sampled pages | e.g. /search/, /apps/iphone/, /apps/ipad/. | Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | E004, E005, E006, E007 |
| low | Thin cluster /offers: median 222 words over 2 fetched pages | 11 URLs, programmatic template; examples /offers/, /offers/menchies-frozen-yogurt-lake-nona-5-back-48/. | Out-write /offers with ~800-word pages on offers, back, frozen yogurt. | E033 |
| low | Only 14% of 29 inner pages open with a direct answer | First paragraph after the H1 is missing, too long, or does not name the topic. | Lead your pages with the answer; cardpointers.com does so on 14% of inner pages. | E003, E004, E005, E006 |
| low | No canonical tag on 22/30 sampled pages | e.g. /, /partner/prime/, /search/. | Duplicate URLs split signals. | E002, E003, E004, E005 |

## 9. 30/60/90-day plan for a challenger to cardpointers.com

**Days 1-30 (small effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Ask for App Store ratings right after the in-app moment users came for; cardpointers.com has 10,355. | S | medium | cardpointers.com driver #1 (strength 86, hard to copy): App Store demand: "CardPointers for Credit Cards" rated 4.7 from 10,355 ratings | E045 |
| Mark up the same templates with JSON-LD; cardpointers.com leaves 22/30 sampled pages bare. | S | medium | cardpointers.com weakness: No JSON-LD on 22/30 sampled pages | E002, E003, E004, E005 |
| Give your matching pages a clear H1; cardpointers.com leaves 19/30 without one. | S | medium | cardpointers.com weakness: No H1 on 19/30 sampled pages | E004, E005, E006, E007 |

**Days 31-60 (medium effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish a better page for "credit card offers", "credit cards", "credit card rewards"; cardpointers.com is not in the checked results. | M | high | cardpointers.com weakness: Not in the checked results for 6/6 of its own head terms | E048, E050, E052, E054 |
| Get listed or reviewed on the sites that cover cardpointers: upgradedpoints.com, reddit.com, clark.com. | M | medium | cardpointers.com driver #6 (strength 43, hard to copy): Third-party coverage: brand search "cardpointers" returns 3 other domains | E038, E039, E040, E041 |
| Publish dated, current versions of its oldest topics (median age 1011 days). | M | medium | cardpointers.com weakness: Stale content: median page age 1011 days across 7 dated pages | E002, E003, E004, E005 |

**Days 61-90 (large effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Pick the 2-3 cardpointers.com clusters closest to your product (/cards, /offers) and publish 10+ linked pages in each before widening. | L | high | cardpointers.com driver #3 (strength 51, medium to copy): Topical breadth: 135 known URLs across 2 clusters of 10+ pages | E032, E033 |
| Build one page template like /offers/{x}-back-# and launch it for the 20 entities your users ask about most, then expand (cardpointers.com runs 11 of these; e.g. /offers/). | L | high | cardpointers.com driver #5 (strength 46, medium to copy): Programmatic pages: 11 URLs on one template at /offers/{x}-back-# | E032, E033 |
| Add the owned channels cardpointers.com uses that you lack (iOS App Store, Google Play, Browser extension, social, Community, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | cardpointers.com driver #2 (strength 85, hard to copy): Distribution beyond search: iOS App Store, Google Play, Browser extension, 4 social profiles, Community, Newsletter | E002, E003, E004, E005 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (cardpointers.com is linked from 0 Wikipedia article(s)). | L | medium | cardpointers.com driver #4 (strength 50, hard to copy): Popularity: Tranco rank #365,175 | E038, E039 |

## 10. Side-by-side (--vs)

Single-domain run. Re-run with `--vs <domain>` for a side-by-side table, cluster gaps and keyword gaps.

## Unknowns

- cardpointers.com: PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Paid data (search volume, backlinks, paid SERP fallback) skipped: budget is 0
- cardpointers.com: Backlink counts and referring domains need a paid index; not measured at $0

Full data: [strategy.json](strategy.json). Run data: [../data/strategy-run.json](../data/strategy-run.json).
