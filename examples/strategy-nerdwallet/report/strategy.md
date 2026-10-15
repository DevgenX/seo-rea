# Strategy dossier: nerdwallet.com

seo-rea 0.4.0; run 20261015T064652Z; 2026-10-15T06:46:52.510Z; spent 0.0000 USD of 0. Every claim cites evidence IDs from [evidence/index.md](../evidence/index.md); (observed) means read from a fetched source, (inferred) means derived from those facts.

**Roles:** Single-domain run: nerdwallet.com is analysed as the leader.

## Top 10 actions for nerdwallet.com

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Build a page that targets "capital one business" (closest page now: /business/credit-cards/best/capital-one) | nerdwallet.com is not in the 10 results Bing (headless Chromium) returned; #1 is capitalone.com/small-business/bank/. The phrase appears in 7 of the site's titles/H1s/slugs. | high | M | content | E054, E022 |
| 2 | Build a page that targets "credit score" (closest page now: /free-credit-score) | nerdwallet.com is not in the 10 results Bing (headless Chromium) returned; #1 is creditkarma.com/. The phrase appears in 15 of the site's titles/H1s/slugs. | high | M | content | E058, E024 |
| 3 | Make /financial-advisors the target page for "financial advisors": exact phrase in its title and H1, linked from the 41 /financial-advisors URLs | nerdwallet.com is not in the 10 results Bing (headless Chromium) returned; #1 is yelp.com/search. The phrase appears in 42 of the site's titles/H1s/slugs. | high | M | content | E062 |
| 4 | Build a page that targets "credit report" (closest page now: /finance/learn/how-to-use-annualcreditreport-com) | nerdwallet.com is not in the 10 results Bing (headless Chromium) returned; #1 is annualcreditreport.com/index.action. The phrase appears in 9 of the site's titles/H1s/slugs. | high | M | content | E064, E007 |
| 5 | Build a page that targets "credit union" | nerdwallet.com is not in the 10 results Bing (headless Chromium) returned; #1 is lafcu.org/. The phrase appears in 34 of the site's titles/H1s/slugs. | high | M | content | E066 |
| 6 | Review whether blocking Google-Extended is intended | Blocks AI training crawlers: Google-Extended. Search-time bots are allowed; training bots are not (a policy choice). | low | S | seo | E036, E034, E035, E002, E003, E004 |
| 7 | Publish /llms.txt: H1 name, > summary, ## sections linking key pages | No /llms.txt. HTTP 404 | low | S | dev | E034 |
| 8 | Cut inline payload below 200 KB (now 1160 KB median) | Heavy HTML: median 1160 KB per sampled page. Raw HTML only (scripts and images not counted). | low | M | dev | E002, E003, E004, E005, E006, E007 |

Ranked by impact, then effort. Full data: [strategy.json](strategy.json).

## 1. Snapshot

### nerdwallet.com (subject)

- **What it is** (observed, homepage meta description): NerdWallet makes it easy to find the right financial product for you. Our Nerds do all the research so you don’t have to. [E002]
- **Homepage title / H1**: NerdWallet: Finance smarter / Smart financial decisions start with NerdWallet [E002]
- **Business model** (observed): Mobile app (App Store + Google Play links on site); store links found in page HTML [E002, E033]
- **Business model** (inferred): Affiliate or partner revenue (advertiser/affiliate disclosure on pages); 22/30 fetched pages carry disclosure wording [E003, E004, E005]
- **Business model** (inferred): Content publisher (editorial pages are the bulk of the site); 1060/1504 known URLs sit in blog/guide/review/comparison clusters [E032, E033]
- **Audience** (inferred): People researching mortgages, insurance, credit cards, business; largest clusters: /mortgages (175), /insurance (167), /credit-cards (141), /business (134) [E032, E033]
- **Audience** (observed): Navigation leads with: Skip to content, Best credit cards, Best credit card bonus offers, Best travel credit cards, Best cash back credit cards, Best 0% APR credit cards; homepage <nav>/<header> anchors in page order [E002]

## 2. Site and cluster map

### nerdwallet.com

1,504 known URLs from 13 sitemap file(s) (sitemap indexes list 107 child sitemaps) plus homepage navigation; 200 mapped in detail, 30 pages fetched, 15 skipped by robots.txt. [E032, E033, E001]

Sitemap index by type: us/posts-articles (61), ca/posts-flex-pages (9), us/posts-insurance-flex-pages (6), us/posts-credit-cards-pages (3), us/posts-smb-pages (3), us/posts-user-pages (3), us/posts-banking-pages (2), us/posts-mortgages-pages (2), ca/posts-user-pages (1), us/news-articles (1), us/posts-auto-loan-pages (1), us/posts-calculator-pages (1), us/posts-financial-advisors-pages (1), us/posts-flex-pages (1), us/posts-home-services-pages (1).

| Cluster | URLs | Template | Fetched | Median words | Links/page | Inlinks | Hub pages | Themes | Example |
|---|---|---|---|---|---|---|---|---|---|
| /mortgages | 175 | review | 1 | 3,793 | 316 | 729 | /mortgages/learn/programs-help-first-time-homebuyers (54) | mortgages, loan, credit union | /mortgages/learn/programs-help-first-time-homebuyers |
| /insurance | 167 | programmatic (review) | 1 | 3,623 | 295 | 1259 | /insurance/auto/learn/how-to-fight-a-speeding-ticket (60) | insurance, state farm, speeding ticket | /insurance/auto/learn/how-to-fight-a-speeding-ticket |
| /credit-cards | 141 | page | 0 | unknown | unknown | 621 | - | credit cards, cash back, rewards | /credit-cards/learn/secured-credit-cards-vs-unsecured-difference |
| /business | 134 | review | 2 | 8,596 | 328 | 669 | /business/credit-cards/best/capital-one (40), /business/credit-cards/reviews/capital-one-spark-cash (33) | business, credit cards, american express | /business/credit-cards/reviews/capital-one-spark-cash |
| /author | 120 | page | 1 | 2,275 | 317 | 83 | /author/arielle-oshea (5) | author, arielle oshea, cfp | /author/arielle-oshea |
| /banking | 118 | review | 0 | unknown | unknown | 508 | - | banking, credit union, accounts | /banking/learn/responsibly-handle-inheritance |
| //support.nerdwallet.com/en/articles | 105 | guide | 1 | 991 | 23 | 41 | support.nerdwallet.com/en/articles/14035975-trouble-signing-in-password-change-required (5) | credit score, bank, accounts | support.nerdwallet.com/en/articles/14035975-trouble-signing-in-password-change-required |
| /finance | 64 | guide | 2 | 3,324 | 301 | 550 | /finance/learn/price-of-food (34), /finance/learn/how-to-use-annualcreditreport-com (33) | finance, credit, budget | /finance/learn/how-to-use-annualcreditreport-com |
| /investing | 62 | guide | 1 | 2,742 | 288 | 492 | /investing/learn/dont-believe-these-social-security-myths (21) | investing, social security, calculator | /investing/learn/dont-believe-these-social-security-myths |
| /home-ownership | 57 | guide | 2 | 2,864 | 331 | 96 | /home-ownership/home-improvement/learn/estimate-the-cost-of-your-home-renovation (42), /home-ownership (29) | ownership, improvement, cost | /home-ownership |
| /auto-loans | 44 | review | 1 | 2,959 | 294 | 178 | /auto-loans/learn/ev-lease-vs-buy (16) | auto loans, car, credit | /auto-loans/learn/ev-lease-vs-buy |
| /taxes | 43 | guide | 1 | 3,179 | 321 | 365 | /taxes (42) | taxes, deduction, capital gains | /taxes |
| /student-loans | 42 | guide | 1 | 3,307 | 313 | 314 | /student-loans/learn/pay-off-student-loans-fast (38) | student loans, pay, college | /student-loans/learn/pay-off-student-loans-fast |
| /financial-advisors | 41 | review | 1 | 8,891 | 301 | 109 | /financial-advisors/best/wealth-advisors (13) | financial advisors, wealth, personal | /financial-advisors/best/wealth-advisors |
| /travel | 36 | guide | 1 | 2,381 | 296 | 69 | /travel/news/north-american-airlines-made-16-5-billion-in-fees-last-year (7) | travel, credit, points | /travel/news/north-american-airlines-made-16-5-billion-in-fees-last-year |
| /retirement | 34 | guide | 1 | 3,953 | 301 | 212 | /retirement/learn/learn-about-ira-accounts (22) | retirement, ira, 401k | /retirement/learn/learn-about-ira-accounts |
| /personal-loans | 29 | guide | 1 | 4,532 | 301 | 301 | /personal-loans/learn/401k-loans (24) | personal loans, debt, pre qualify | /personal-loans/learn/401k-loans |
| /(top-level) | 27 | page | 5 | 1,738 | 142 | 508 | - | credit score, company, corporate | /free-credit-score |
| /redirect | 14 | page | 0 | unknown | unknown | 71 | - | credit cards, redirect credit, 11ee | /redirect/9a64ba6a-8336-11ee-83a4-d332713194b1 |
| /p | 9 | page | 0 | unknown | unknown | 76 | - | advertiser, disclosures | /p/nerdwallet-compare-inc-licenses-and-disclosures |

17 smaller clusters in strategy.json.

- **Programmatic** (inferred): /insurance - 167 URLs, 60% match `/insurance/{x}-insurance-review` (slug-affix). [E032, E033, E001]

## 3. Keywords and rankings

- Google (headless Chromium) blocked on "business credit cards" (Google captcha (unusual traffic page)); not asked again this run.

### nerdwallet.com

Head terms derived from nerdwallet.com's own titles, H1s, slugs and cluster themes (inferred target set). 5/10 checked terms rank top 10; 0 unknown (SERP blocked).

| Term | Docs | Rank | Engine | Top 3 on that SERP | Evidence |
|---|---|---|---|---|---|
| business credit cards | 60 | #1 /business/credit-cards/best | Bing (headless Chromium) | 1. nerdwallet.com, 2. creditcards.com, 3. creditcards.chase.com | E048 |
| pay off student | 8 | #2 /student-loans/learn/pay-off-student-loans-fast | Bing (headless Chromium) | 1. studentaid.gov, 2. nerdwallet.com, 3. studentaid.gov | E050 |
| student loans | 46 | #10 /student-loans | Bing (headless Chromium) | 1. studentaid.gov, 2. studentaid.gov, 3. ed.gov | E052 |
| capital one business | 7 | not in top 10 | Bing (headless Chromium) | 1. capitalone.com, 2. capitalone.com, 3. myaccounts.capitalone.com | E054 |
| personal finance news | 3 | #6 /news | Bing (headless Chromium) | 1. cnbc.com, 2. wsj.com, 3. washingtonpost.com | E056 |
| credit score | 15 | not in top 10 | Bing (headless Chromium) | 1. creditkarma.com, 2. experian.com, 3. creditkarma.com | E058 |
| auto loans | 45 | #1 /auto-loans/best/auto-loans-for-good-fair-and-bad-credit | Bing (headless Chromium) | 1. nerdwallet.com, 2. bankofamerica.com, 3. capitalone.com | E060 |
| financial advisors | 42 | not in top 10 | Bing (headless Chromium) | 1. yelp.com, 2. yelp.com, 3. money.usnews.com | E062 |
| credit report | 9 | not in top 10 | Bing (headless Chromium) | 1. annualcreditreport.com, 2. usa.gov, 3. transunion.com | E064 |
| credit union | 34 | not in top 10 | Bing (headless Chromium) | 1. lafcu.org, 2. cusocal.org, 3. ccu.com | E066 |

## 4. Competitors (co-ranking domains)

| Domain | SERPs shared | Terms | Best | Median | Evidence |
|---|---|---|---|---|---|
| experian.com | 3 | "personal finance news", "credit score", "credit report" | 2 | 4 | E056, E058, E064 |
| studentaid.gov | 2 | "pay off student", "student loans" | 1 | 1 | E050, E052 |
| capitalone.com | 2 | "capital one business", "auto loans" | 1 | 2 | E054, E060 |
| yelp.com | 2 | "auto loans", "financial advisors" | 1 | 3 | E060, E062 |
| transunion.com | 2 | "credit score", "credit report" | 3 | 4 | E058, E064 |
| usa.gov | 2 | "credit score", "credit report" | 2 | 4 | E058, E064 |
| annualcreditreport.com | 2 | "credit score", "credit report" | 1 | 5 | E058, E064 |
| creditkarma.com | 2 | "credit score", "credit report" | 1 | 5 | E058, E064 |
| earnest.com | 2 | "pay off student", "student loans" | 5 | 6 | E050, E052 |
| money.usnews.com | 2 | "pay off student", "financial advisors" | 3 | 6 | E050, E062 |
| equifax.com | 2 | "credit score", "credit report" | 7 | 8 | E058, E064 |
| cnbc.com | 1 | "personal finance news" | 1 | 1 | E056 |
| lafcu.org | 1 | "credit union" | 1 | 1 | E066 |
| bankofamerica.com | 1 | "auto loans" | 2 | 2 | E060 |
| creditcards.com | 1 | "business credit cards" | 2 | 2 | E048 |

## 5. Pillars

### nerdwallet.com

- **On-page** (observed, 30 pages): median title 55 chars; H1 on 93%; meta description on 93%; median 3,009 words and 5 H2s; 19 dated pages, median age 182 days, 74% updated within 12 months. [E002, E003, E004, E005, E006]
- **Technical** (observed): JSON-LD on 93% of pages (Organization 25, ImageObject 21, Person 21, WebSite 21, Country 20, PostalAddress 20); 0 page(s) with schema errors; canonical on 90% (self 90%); 0 noindex; robots.txt found; 13 sitemap file(s), 873 URLs; hreflang on 4 page(s), langs en, en-us; PageSpeed not available (PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key); median HTML 1,160 KB. [E002, E003, E004, E005, E006, E007]
- **Off-page** (observed, free sources): Tranco #4,832; Wikipedia articles linking 28; Wikipedia text mentions 78; Common Crawl index blocks 2; brand SERP third-party domains 2 (en.wikipedia.org, consumeraffairs.com); press links on site 1. Unknown: Backlink counts and referring domains need a paid index; not measured at $0. [E038, E039, E040, E041, E068]
- **AEO** (observed): llms.txt absent; llms-full.txt absent; AI crawlers blocked Google-Extended (search bots: none); FAQPage schema on 4, Q&A blocks on 14 page(s); answer-first intros 38% (inferred); Organization schema yes, 9 sameAs; citations logged 0 (use `seo-rea cite`). [E036, E034, E035, E002, E003, E004]
- **Paid** (observed): 0 own ad(s) across 10 usable SERPs; 0 SERP(s) showed any ads. Ad libraries: Google Ads Transparency Center manual check (E042); Meta Ad Library manual check (E043); LinkedIn Ad Library manual check (E044).
- **Distribution** (observed): iOS App Store, Google Play, Social: x, Social: youtube, Social: instagram, Social: tiktok, Social: linkedin, Social: facebook, Newsletter; affiliate/advertiser disclosure present. [E002, E003, E004, E005, E006, E007]

## 6. Ranked drivers (why it leads)

### nerdwallet.com

| # | Driver | Strength | Copy | Basis | Evidence |
|---|---|---|---|---|---|
| 1 | Popularity: Tranco rank #4,832; 28 Wikipedia article(s) link to it | 91 | hard | observed | E038, E039 |
| 2 | App Store demand: "NerdWallet: Smart Money App" rated 4.8 from 125,314 ratings | 90 | hard | observed | E045 |
| 3 | Topical breadth: 1,504 known URLs across 17 clusters of 10+ pages | 89 | medium | observed | E032, E033 |
| 4 | Commercial-intent pages: 28 review/comparison URLs in the mapped sample | 85 | medium | inferred | E032, E033 |
| 5 | Long-form content: median 3,221 words across 6 fetched editorial pages | 85 | medium | observed | E005, E014, E016, E019 |
| 6 | Structured data on 93% of 30 sampled pages | 72 | easy | observed | E002, E003, E004, E005 |
| 7 | Interactive tools: 7 calculator/tool URLs | 72 | medium | inferred | E032, E033 |
| 8 | Distribution beyond search: iOS App Store, Google Play, 6 social profiles, Newsletter | 68 | hard | observed | E002, E003, E004, E005 |

1. **Popularity: Tranco rank #4,832; 28 Wikipedia article(s) link to it** - Tranco ranks the top 1M domains by aggregated traffic lists (2026-10-14). Linking articles include: Walnut Valley Unified School District, Diamond Bar, California, Walnut, California, Walnut High School. How hard to copy: hard; Brand demand and reference links build over years.
2. **App Store demand: "NerdWallet: Smart Money App" rated 4.8 from 125,314 ratings** - Finance; Free; last update 2026-10-13. Store listings rank for brand and category searches and send users who never touch the website. How hard to copy: hard; Ratings accrue with users; prompt for reviews at the moment of value.
3. **Topical breadth: 1,504 known URLs across 17 clusters of 10+ pages** - Largest clusters: /mortgages (175, review), /insurance (167, programmatic), /credit-cards (141, page), /business (134, review). Sitemap index lists 107 child sitemaps (us/posts-articles x61, ca/posts-flex-pages x9, us/posts-insurance-flex-pages x6). How hard to copy: medium; Years of publishing; copy the cluster shape, not the volume.
4. **Commercial-intent pages: 28 review/comparison URLs in the mapped sample** - Examples: /credit-cards/learn/secured-credit-cards-vs-unsecured-difference, /business/credit-cards/reviews/capital-one-spark-cash, /auto-loans/learn/ev-lease-vs-buy, /best/banking/high-yield-online-savings-accounts. How hard to copy: medium; Needs honest product testing to be credible.
5. **Long-form content: median 3,221 words across 6 fetched editorial pages** - Median 6 H2 sections. Longest: /business/credit-cards/best/capital-one (11,581), /business/credit-cards/reviews/capital-one-spark-cash (5,611). How hard to copy: medium; Needs writers with subject knowledge; length alone does not rank.
6. **Structured data on 93% of 30 sampled pages** - Types by page count: Organization 25, ImageObject 21, Person 21, WebSite 21, Country 20. Pages with JSON-LD errors: 0. How hard to copy: easy; A template change; no content needed.
7. **Interactive tools: 7 calculator/tool URLs** - Examples: /cost-of-living-calculator, /cost-of-living-calculator/city-life/san-francisco-ca, /cost-of-living-calculator/city-life/new-york-manhattan-ny, /taxes/calculators/tax-calculator. How hard to copy: medium; Needs engineering, then earns links and repeat visits.
8. **Distribution beyond search: iOS App Store, Google Play, 6 social profiles, Newsletter** - iOS App Store (https://apps.apple.com/us/app/nerdwallet-smart-money-app/id1174471607); Google Play (https://play.google.com/store/apps/details?id=com.mobilecreditcards&hl=en_US&source_caller=ui&shortlink=233a7a41&c=mbma_mktg_footer_badge_android&pid=footer); Social: x (https://x.com/NerdWallet); Social: youtube (https://www.youtube.com/@nerdwallet); Social: instagram (https://www.instagram.com/NerdWallet/); Social: tiktok (https://www.tiktok.com/@nerdwallet?lang=en); Social: linkedin (https://www.linkedin.com/company/nerdwallet); Social: facebook (https://www.facebook.com/NerdWallet/); Newsletter How hard to copy: hard; Each channel is a product or a habit, not a page.

## 7. Copyable playbook

Steps a challenger can copy from nerdwallet.com, ranked by impact then effort.

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish "X vs Y" and "<product> review" pages for what your users compare, like /credit-cards/learn/secured-credit-cards-vs-unsecured-difference and /business/credit-cards/reviews/capital-one-spark-cash. | M | high | nerdwallet.com driver #4 (strength 85, medium to copy): Commercial-intent pages: 28 review/comparison URLs in the mapped sample | E032, E033 |
| Publish a better page for "capital one business", "credit score", "financial advisors"; nerdwallet.com is not in the checked results. | M | high | nerdwallet.com weakness: Not in the checked results for 5/10 of its own head terms | E054, E058, E062, E064 |
| Ask for App Store ratings right after the in-app moment users came for; nerdwallet.com has 125,314. | S | medium | nerdwallet.com driver #2 (strength 90, hard to copy): App Store demand: "NerdWallet: Smart Money App" rated 4.8 from 125,314 ratings | E045 |
| Pick the 2-3 nerdwallet.com clusters closest to your product (/mortgages, /insurance, /credit-cards) and publish 10+ linked pages in each before widening. | L | high | nerdwallet.com driver #3 (strength 89, medium to copy): Topical breadth: 1,504 known URLs across 17 clusters of 10+ pages | E032, E033 |
| Add the JSON-LD nerdwallet.com uses on matching templates: Organization, ImageObject, Person, WebSite. | S | medium | nerdwallet.com driver #6 (strength 72, easy to copy): Structured data on 93% of 30 sampled pages | E002, E003, E004, E005 |
| Match depth on your top 5 pages: about 3,221 words and 6 H2 sections, like /business/credit-cards/reviews/capital-one-spark-cash. | M | medium | nerdwallet.com driver #5 (strength 85, medium to copy): Long-form content: median 3,221 words across 6 fetched editorial pages | E005, E014, E016, E019 |
| Ship free tools for the questions your users repeat; nerdwallet.com has /cost-of-living-calculator, /cost-of-living-calculator/city-life/san-francisco-ca, /cost-of-living-calculator/city-life/new-york-manhattan-ny. | M | medium | nerdwallet.com driver #7 (strength 72, medium to copy): Interactive tools: 7 calculator/tool URLs | E032, E033 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (nerdwallet.com is linked from 28 Wikipedia article(s)). | L | medium | nerdwallet.com driver #1 (strength 91, hard to copy): Popularity: Tranco rank #4,832; 28 Wikipedia article(s) link to it | E038, E039 |
| Add the owned channels nerdwallet.com uses that you lack (iOS App Store, Google Play, social, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | nerdwallet.com driver #8 (strength 68, hard to copy): Distribution beyond search: iOS App Store, Google Play, 6 social profiles, Newsletter | E002, E003, E004, E005 |

## 8. Weaknesses and openings

### nerdwallet.com

| Severity | Weakness | Detail | Opening | Evidence |
|---|---|---|---|---|
| high | Not in the checked results for 5/10 of its own head terms | "capital one business" (#1 capitalone.com); "credit score" (#1 creditkarma.com); "financial advisors" (#1 yelp.com); "credit report" (#1 annualcreditreport.com); "credit union" (#1 lafcu.org) | Publish a better page for "capital one business", "credit score", "financial advisors"; nerdwallet.com is not in the checked results. | E054, E058, E062, E064 |
| low | Blocks AI training crawlers: Google-Extended | Search-time bots are allowed; training bots are not (a policy choice). | Models trained without the site know less about the brand. | E036, E034, E035, E002 |
| low | No /llms.txt | HTTP 404 | Publish your own /llms.txt; it has none that validates. | E034 |
| low | Heavy HTML: median 1160 KB per sampled page | Raw HTML only (scripts and images not counted). | Lighter pages crawl and render faster. | E002, E003, E004, E005 |

## 9. 30/60/90-day plan for a challenger to nerdwallet.com

**Days 1-30 (small effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Ask for App Store ratings right after the in-app moment users came for; nerdwallet.com has 125,314. | S | medium | nerdwallet.com driver #2 (strength 90, hard to copy): App Store demand: "NerdWallet: Smart Money App" rated 4.8 from 125,314 ratings | E045 |
| Add the JSON-LD nerdwallet.com uses on matching templates: Organization, ImageObject, Person, WebSite. | S | medium | nerdwallet.com driver #6 (strength 72, easy to copy): Structured data on 93% of 30 sampled pages | E002, E003, E004, E005 |

**Days 31-60 (medium effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Publish "X vs Y" and "<product> review" pages for what your users compare, like /credit-cards/learn/secured-credit-cards-vs-unsecured-difference and /business/credit-cards/reviews/capital-one-spark-cash. | M | high | nerdwallet.com driver #4 (strength 85, medium to copy): Commercial-intent pages: 28 review/comparison URLs in the mapped sample | E032, E033 |
| Publish a better page for "capital one business", "credit score", "financial advisors"; nerdwallet.com is not in the checked results. | M | high | nerdwallet.com weakness: Not in the checked results for 5/10 of its own head terms | E054, E058, E062, E064 |
| Match depth on your top 5 pages: about 3,221 words and 6 H2 sections, like /business/credit-cards/reviews/capital-one-spark-cash. | M | medium | nerdwallet.com driver #5 (strength 85, medium to copy): Long-form content: median 3,221 words across 6 fetched editorial pages | E005, E014, E016, E019 |
| Ship free tools for the questions your users repeat; nerdwallet.com has /cost-of-living-calculator, /cost-of-living-calculator/city-life/san-francisco-ca, /cost-of-living-calculator/city-life/new-york-manhattan-ny. | M | medium | nerdwallet.com driver #7 (strength 72, medium to copy): Interactive tools: 7 calculator/tool URLs | E032, E033 |

**Days 61-90 (large effort)**

| Step | Effort | Impact | From | Evidence |
|---|---|---|---|---|
| Pick the 2-3 nerdwallet.com clusters closest to your product (/mortgages, /insurance, /credit-cards) and publish 10+ linked pages in each before widening. | L | high | nerdwallet.com driver #3 (strength 89, medium to copy): Topical breadth: 1,504 known URLs across 17 clusters of 10+ pages | E032, E033 |
| Publish one original data study a quarter in your strongest cluster so reference sites have something to cite (nerdwallet.com is linked from 28 Wikipedia article(s)). | L | medium | nerdwallet.com driver #1 (strength 91, hard to copy): Popularity: Tranco rank #4,832; 28 Wikipedia article(s) link to it | E038, E039 |
| Add the owned channels nerdwallet.com uses that you lack (iOS App Store, Google Play, social, Newsletter); start with a newsletter or extension tied to your best tool. | L | medium | nerdwallet.com driver #8 (strength 68, hard to copy): Distribution beyond search: iOS App Store, Google Play, 6 social profiles, Newsletter | E002, E003, E004, E005 |

## 10. Side-by-side (--vs)

Single-domain run. Re-run with `--vs <domain>` for a side-by-side table, cluster gaps and keyword gaps.

## Unknowns

- nerdwallet.com: PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Paid data (search volume, backlinks, paid SERP fallback) skipped: budget is 0
- nerdwallet.com: Backlink counts and referring domains need a paid index; not measured at $0

Full data: [strategy.json](strategy.json). Run data: [../data/strategy-run.json](../data/strategy-run.json).
