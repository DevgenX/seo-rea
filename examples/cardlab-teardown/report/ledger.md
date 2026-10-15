# Finding ledger: "credit card rewards app" vs getcardlab.app

Run 20261015T044454Z. Evidence IDs refer to [../evidence/index.md](../evidence/index.md).

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | Google (headless Chromium) was not used: Google captcha (unusual traffic page) | E001 | observed | high | single request | Google (headless Chromium) rankings not observed |
| C02 | Top results: #1 forbes.com, #2 cnbc.com, #3 money.usnews.com, #4 appshunter.io, #5 rewardswise.app | E001, E003 | observed | high | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | - |
| C03 | getcardlab.app does not appear in the observed results | E001, E003 | observed | high | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | Personalised and other-location results not observed |
| C04 | Search intent is comparison/roundup: 5/8 titles use "best", "top", a year or review wording | E001, E003, E007, E010, E011, E012, E013 | inferred | medium | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | - |
| C05 | Ranking pages median 586 words (range 0-2573); getcardlab.app homepage 2471 words | E007, E010, E011, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages, raw HTML without JavaScript | - |
| C06 | 2/5 ranking pages contain every keyword term in <title>; target homepage: no | E007, E010, E011, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages | - |
| C07 | Ranking pages median 3 H2 headings; target homepage 10 | E007, E010, E011, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages | - |
| C08 | Common schema types among ranking pages: Organization (3/5), BreadcrumbList (2/5), Article (1/5), ItemList (1/5), NewsArticle (1/5), NewsMediaOrganization (1/5); target: Answer, Article, BreadcrumbList, Country, Dataset, FAQPage, ListItem, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebSite | E007, E010, E011, E012, E013, E017, E018 | observed | high | JSON-LD on 5 ranking pages and 10 target pages | - |
| C09 | Ranking pages median 52 internal links per page; target homepage 58 | E007, E010, E011, E012, E013, E017, E018 | observed | high | links in raw HTML | - |
| C10 | Could not analyse https://www.forbes.com/advisor/credit-cards/best-apps-to-track-credit-card-rewards/: HTTP 403 text/html;charset=utf-8 | E006 | observed | high | single request | On-page facts for forbes.com |
| C11 | Could not analyse https://money.usnews.com/credit-cards/articles/best-credit-card-apps-for-tracking-rewards: The operation was aborted due to timeout | E008 | observed | high | single request | On-page facts for money.usnews.com |
| C12 | Could not analyse https://appshunter.io/ios/topics/credit-card-rewards: HTTP 403 text/html; charset=UTF-8 | E009 | observed | high | single request | On-page facts for appshunter.io |
| C13 | 9 page(s) carry JSON-LD with missing required properties or parse errors | E018 | observed | high | required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo, LocalBusiness | - |
| C14 | getcardlab.app robots.txt lets all 9 checked AI crawlers fetch / | E015, E021 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C15 | getcardlab.app/llms.txt follows the llmstxt.org format (9 sections, 129 links) | E019 | observed | high | single fetch of /llms.txt | - |
| C16 | getcardlab.app/llms-full.txt present (586524 bytes) | E020 | observed | high | single fetch of /llms-full.txt | - |
| C17 | getcardlab.app sitemap lists 114 URLs | E015, E016 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C18 | 0 search ads observed on the collected SERPs | E001, E003 | observed | medium | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | Ads shown to logged-in or other-location users |
| C19 | Google Ads Transparency Center shows 0 result(s) for "cardlab" | E025, E024 | observed | medium | one logged-out page load; ads pointing to this domain | Creatives, run dates, spend |
| C20 | Meta Ad Library shows 95 result(s) for "cardlab" | E027, E026 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C21 | LinkedIn Ad Library shows 2 result(s) for "cardlab" | E029, E028 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C22 | Google Ads Transparency Center shows 0 result(s) for "rewardswise" | E031, E030 | observed | medium | one logged-out page load; ads pointing to this domain | Creatives, run dates, spend |
| C23 | Meta Ad Library shows 0 result(s) for "rewardswise" | E033, E032 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C24 | LinkedIn Ad Library shows 0 result(s) for "rewardswise" | E035, E034 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C25 | Google Ads Transparency Center shows 0 result(s) for "maxrewards" | E037, E036 | observed | medium | one logged-out page load; ads pointing to this domain | Creatives, run dates, spend |
| C26 | Meta Ad Library shows 61 result(s) for "maxrewards" | E039, E038 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C27 | LinkedIn Ad Library shows 0 result(s) for "maxrewards" | E041, E040 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C28 | Google Ads Transparency Center shows 46 result(s) for "joinkudos" | E043, E042 | observed | medium | one logged-out page load; ads pointing to this domain | Creatives, run dates, spend |
| C29 | Meta Ad Library shows 20 result(s) for "joinkudos" | E045, E044 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C30 | LinkedIn Ad Library shows 0 result(s) for "joinkudos" | E047, E046 | observed | medium | one logged-out page load; keyword search, so other advertisers using the word are included | Creatives, run dates, spend |
| C31 | Backlink profiles were not collected | - | observed | high | free automated pipeline | Referring domains, link velocity |
