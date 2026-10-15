# Finding ledger: "remote nursing jobs" vs remotenurse.org

Run 20261015T051651Z. Evidence IDs refer to [../evidence/index.md](../evidence/index.md).

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | Google (headless Chromium) was not used: Google captcha (unusual traffic page) | E001 | observed | high | single request | Google (headless Chromium) rankings not observed |
| C02 | Top results: #1 indeed.com, #2 nurseremotely.com, #3 remotenursingjobs.com, #4 nurse.org, #5 remotenursingjobs.com | E001, E003 | observed | high | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | - |
| C03 | remotenurse.org does not appear in the observed results | E001, E003 | observed | high | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | Personalised and other-location results not observed |
| C04 | Search intent is comparison/roundup: 4/8 titles use "best", "top", a year or review wording | E001, E003, E007, E008, E010, E012, E013 | inferred | medium | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | - |
| C05 | Ranking pages median 1077 words (range 0-3039); remotenurse.org homepage 2190 words | E007, E008, E010, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages, raw HTML without JavaScript | - |
| C06 | 2/5 ranking pages contain every keyword term in <title>; target homepage: no | E007, E008, E010, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages | - |
| C07 | Ranking pages median 4 H2 headings; target homepage 10 | E007, E008, E010, E012, E013, E017, E018 | observed | high | 5 fetched ranking pages | - |
| C08 | Common schema types among ranking pages: CollectionPage (2/5), FAQPage (2/5), Organization (2/5), BreadcrumbList (1/5); target: AboutPage, AggregateOffer, Answer, Article, BreadcrumbList, CollectionPage, ContactPoint, Country, CreativeWork, FAQPage, HowTo, HowToStep, ImageObject, ListItem, Offer, Organization, Question, SoftwareApplication, SpeakableSpecification, UnitPriceSpecification, WebApplication, WebPage, WebSite | E007, E008, E010, E012, E013, E017, E018 | observed | high | JSON-LD on 5 ranking pages and 10 target pages | - |
| C09 | Ranking pages median 156 internal links per page; target homepage 189 | E007, E008, E010, E012, E013, E017, E018 | observed | high | links in raw HTML | - |
| C10 | Could not analyse https://www.indeed.com/q-Remote-Nursing-jobs.html: HTTP 403 text/html; charset=UTF-8 | E006 | observed | high | single request | On-page facts for indeed.com |
| C11 | Could not analyse https://nurse.org/education/remote-nursing-jobs/: HTTP 403 text/html | E009 | observed | high | single request | On-page facts for nurse.org |
| C12 | Could not analyse https://www.indeed.com/q-remote-registered-nurse-l-remote%e2%80%8b%e2%80%8b-work-from-home-jobs.html: HTTP 403 text/html; charset=UTF-8 | E011 | observed | high | single request | On-page facts for indeed.com |
| C13 | 1 page(s) carry JSON-LD with missing required properties or parse errors | E018 | observed | high | required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo, LocalBusiness | - |
| C14 | remotenurse.org robots.txt lets all 9 checked AI crawlers fetch / | E015, E021 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C15 | remotenurse.org/llms.txt follows the llmstxt.org format (10 sections, 91 links) | E019 | observed | high | single fetch of /llms.txt | - |
| C16 | remotenurse.org/llms-full.txt present (80663 bytes) | E020 | observed | high | single fetch of /llms-full.txt | - |
| C17 | remotenurse.org sitemap lists 460 URLs | E015, E016 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C18 | 0 search ads observed on the collected SERPs | E001, E003 | observed | medium | top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15 | Ads shown to logged-in or other-location users |
| C19 | 12 ad-library lookup(s) need a manual check | E024, E025, E026, E027, E028, E029, E030, E031, E032, E033, E034, E035 | observed | high | lookup URLs (and screenshots where captured) | Ad counts, run dates, creatives |
| C20 | Backlink profiles were not collected | - | observed | high | free automated pipeline | Referring domains, link velocity |
