# Finding ledger: "credit card rewards app" vs getcardlab.app

Run 20261015T033444Z. Evidence IDs refer to [../evidence/index.md](../evidence/index.md).

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | DuckDuckGo HTML was not used: captcha or anomaly page | E002 | observed | high | single request | DuckDuckGo HTML rankings not observed |
| C02 | Bing HTML was not used: degraded: only 0% of results match the query terms (engine likely served a bot-degraded SERP) | E003 | observed | high | single request | Bing HTML rankings not observed |
| C03 | Top results: #1 uscreditcardrewards.com, #2 play.google.com, #3 apps.apple.com, #4 businessinsider.com, #5 awardwallet.com | E001, E002, E003 | observed | high | top 5 organic results from Operator-supplied URL list (en-US, logged-out bot request) on 2026-10-15 | - |
| C04 | getcardlab.app does not appear in the observed results | E001, E002, E003 | observed | high | top 5 organic results from Operator-supplied URL list (en-US, logged-out bot request) on 2026-10-15 | Google positions and personalised results not observed |
| C05 | Ranking pages median 2134 words (range 334-4043); getcardlab.app homepage 2504 words | E004, E005, E006, E007, E008, E012, E013 | observed | high | 5 fetched ranking pages, raw HTML without JavaScript | - |
| C06 | 3/5 ranking pages contain every keyword term in <title>; target homepage: no | E004, E005, E006, E007, E008, E012, E013 | observed | high | 5 fetched ranking pages | - |
| C07 | Ranking pages median 6 H2 headings; target homepage 10 | E004, E005, E006, E007, E008, E012, E013 | observed | high | 5 fetched ranking pages | - |
| C08 | Common schema types among ranking pages: BreadcrumbList (3/5), ListItem (3/5), Organization (3/5), AggregateRating (2/5), Answer (2/5), Article (2/5); target: Answer, Article, BreadcrumbList, Country, Dataset, FAQPage, ListItem, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebSite | E004, E005, E006, E007, E008, E012, E013 | observed | high | JSON-LD on 5 ranking pages and 10 target pages | - |
| C09 | Ranking pages median 40 internal links per page; target homepage 58 | E004, E005, E006, E007, E008, E012, E013 | observed | high | links in raw HTML | - |
| C10 | Phrases used by ranking pages but absent from the 10 crawled target pages: english, cardpointers, service, maximize, points miles, welcome, credits, america | E004, E005, E006, E007, E008, E012, E013 | observed | medium | phrases in 5 ranking pages vs 10 target pages | Search volume and difficulty |
| C11 | getcardlab.app sitemap lists 114 URLs | E010, E011 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C12 | 0 search ads observed on the SERP | E001, E002, E003 | observed | medium | top 5 organic results from Operator-supplied URL list (en-US, logged-out bot request) on 2026-10-15 | Ads shown to logged-in or other-location users |
| C13 | Ad-library activity for the target and top competitors needs a manual check | E015, E016, E017, E018, E019, E020, E021, E022, E023, E024, E025, E026 | observed | high | lookup URLs only, not fetched | Ad counts, run dates, creatives |
| C14 | Backlink profiles were not collected | - | observed | high | free automated pipeline | Referring domains, link velocity |
