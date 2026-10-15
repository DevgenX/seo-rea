# Sources

What each source gives, how seo-rea uses it, and where it breaks. Record a
source failure as evidence and an open unknown; never fill the gap with a guess.

## SERPs

| Source | Access | Notes |
|---|---|---|
| DuckDuckGo HTML (`html.duckduckgo.com/html/`) | automated, default first | Best free signal (Bing-backed index). Rate limits by IP: answers HTTP 202 with an "anomaly" bot challenge after repeated requests. Detected and recorded; never cached. Wait or use `--serp-html`. |
| Bing HTML (`www.bing.com/search`) | automated | Often serves a degraded page to non-browser clients that only matches the first query word. seo-rea scores relevance (share of results containing 3/4 of the query terms) and refuses to use a SERP under 30%. |
| Google HTML | automated attempt, usually blocked | Google requires JavaScript (`enablejs`), consent or a captcha for automated requests. Recorded as blocked. For Google rankings, search in a browser (incognito, `hl=en&gl=us`), save the page and pass `--serp-html`. |
| Saved SERP page | `--serp-html <file>` (repeatable) | Engine detected from markup (DuckDuckGo, Bing, Google). Stored as `manual` evidence. |
| Operator URL list | `--serp-urls "u1,u2,..."` | Ranking URLs in order as seen in a browser. Titles come from the fetched pages. |
| DataForSEO SERP | paid, `--budget-usd > 0` | Used only when no free SERP is usable. Adds SERP feature types. |

Search boundary for any "X does not rank" claim: the engines that produced a
usable SERP, the result depth, locale and date shown in the SERP map.

## Pages and sites

- Ranking pages: fetched once each with the seo-rea user agent after checking
  robots.txt (`seo-rea` group, then `*`). Disallowed pages are skipped and
  recorded.
- Parsed without JavaScript. Client-rendered pages show low word counts; the
  report marks this as an inference, not a fact about the rendered page.
- Target: robots.txt, sitemap.xml (or sitemaps declared in robots.txt, indexes
  followed up to 5 files), homepage, then up to `--crawl` pages from the
  sitemap and homepage links.

## Keywords

- Free: 1-3 word phrases from title, meta description, H1-H3 (3x weight) and
  body text. Gap = phrases used by 2+ ranking pages and absent from every
  crawled target page. No search volume.
- Manual: Google autocomplete, People Also Ask, Search Console, Keyword Planner.
- Paid: DataForSEO Labs `ranked_keywords` for the target and top competitors.

## Ads

Ad libraries need a browser and often a login, so seo-rea records lookup URLs
as `manual-check` evidence for the target and top competitors:

- Google Ads Transparency Center: `adstransparency.google.com/?region=anywhere&domain=<domain>`
- Meta Ad Library: keyword search on the brand name
- LinkedIn Ad Library: keyword search on the brand name

Ads seen in SERP HTML (DuckDuckGo `result--ad`, Bing `b_ad`) are recorded as
observed.

## AI answers

No engine exposes citations through a free API. Ask the prompt in each engine,
copy the cited URLs and log them with `seo-rea cite`. Each entry is evidence
with engine, prompt, URLs, domains and timestamp.

## Backlinks and speed

Not automated. Use Ahrefs free backlink checker, OpenLinkProfiler, Bing
Webmaster Tools, Common Crawl index, PageSpeed Insights or CrUX by hand and add
the findings to the ledger with new evidence files.
