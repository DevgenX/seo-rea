# Sources

What each source gives, how seo-rea uses it, and where it breaks. Record a
source failure as evidence and an open unknown; never fill the gap with a guess.

## SERPs

Tried in this order. The first usable SERP becomes the ranking list; every
attempt is recorded in the SERP map with its evidence ID.

| Source            | Access                             | Notes                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Operator URL list | `--serp-urls "u1,u2,..."`          | Ranking URLs in order as seen in a browser. Used as the primary list when given. Titles come from the fetched pages.                                                                                                                                                                                                           |
| Saved SERP page   | `--serp-html <file>` (repeatable)  | Engine detected from markup (Google, Bing, DuckDuckGo).                                                                                                                                                                                                                                                                        |
| Headless Chromium | needs `playwright-core` + Chromium | Google, Bing, DuckDuckGo in `--engines` order. Desktop user agent with the browser's real version, at least 3 s between requests to one host, cookie banners dismissed (reject first). Captcha, consent walls and challenge pages are detected and recorded; the next engine is tried. A screenshot is saved for each attempt. |
| Plain HTML        | built in                           | DuckDuckGo HTML, Bing, Google. Used when the browser is missing or every browser attempt was blocked. Google almost always answers with a JavaScript wall. Bing may serve a degraded page; results under 30% query-term relevance are refused.                                                                                 |
| DataForSEO SERP   | paid, `--budget-usd > 0`           | Only when no free SERP is usable.                                                                                                                                                                                                                                                                                              |

Search boundary for any "X does not rank" claim: the engine that produced the
list, result depth, locale and date shown in the SERP map.

## Pages and sites

- Ranking pages are fetched once each with the `seo-rea` user agent after
  checking robots.txt. Disallowed pages are skipped and recorded.
- Parsed without JavaScript. Client-rendered pages show low word counts; the
  report marks this as an inference.
- Target: robots.txt, sitemaps (from robots.txt or `/sitemap.xml`, indexes
  followed up to 5 files), homepage, then up to `--crawl` pages.

## Schema

All `application/ld+json` blocks are parsed; `@graph` members and top-level
nodes are checked. Rule sets (subtypes map to them, e.g. BlogPosting ->
Article, MobileApplication -> SoftwareApplication):

| Type                | Required                                                  | Recommended                                                |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Article             | headline                                                  | author, datePublished, dateModified, image, publisher      |
| FAQPage             | mainEntity of Question with acceptedAnswer.text           | -                                                          |
| Product             | name; one of offers, review, aggregateRating              | image, description, brand, sku                             |
| SoftwareApplication | name, offers (with price); one of aggregateRating, review | operatingSystem, applicationCategory                       |
| Organization        | name                                                      | url, logo, sameAs                                          |
| BreadcrumbList      | itemListElement with position, name, item (except last)   | -                                                          |
| HowTo               | name, step (each with text)                               | image, totalTime, supply, tool                             |
| LocalBusiness       | name, address                                             | telephone, openingHoursSpecification, geo, url, priceRange |

These follow the documented rich-result requirements; they are a lint, not a
guarantee that a rich result will show.

## AI readiness

- robots.txt is evaluated per product token (exact group match, else `*`):
  GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot,
  PerplexityBot, Google-Extended, Applebot-Extended, CCBot. Result per bot:
  allowed, partial (some paths disallowed) or blocked at `/`.
- Bots may ignore robots.txt, and a CDN or firewall can block them anyway;
  that is not tested.
- `/llms.txt` is checked against llmstxt.org: H1 title first, optional `>`
  summary, `##` sections of `- [name](url): notes` links. An HTML page served at
  that path (app fallback) counts as absent. `/llms-full.txt` only needs an H1.

## Speed

PageSpeed Insights (mobile) with `PSI_API_KEY` if set (sent as a header, never
stored). Without a key the shared quota often answers HTTP 429; the run records
the skip. Local Lighthouse runs with `--lighthouse` when `lighthouse` and
`chrome-launcher` are installed.

## Keywords

- Free: 1-3 word n-grams from title, meta description, H1-H3 (3x weight) and
  body. Gap = phrases used by 2+ ranking pages and absent from every crawled
  target page, ranked by competitor count then TF-IDF x phrase length.
- Paid: DataForSEO Labs `ranked_keywords` for the target and top competitors.

## Ads

For the target and up to 3 competitors (product sites before publishers):

- Google Ads Transparency Center by domain (app-store listings have no domain,
  so search the name by hand)
- Meta Ad Library and LinkedIn Ad Library keyword search on the brand

URL only by default (`manual-check` evidence). With `--adlib-capture` and a
browser, each page is loaded once, screenshotted, and a visible result count is
read when shown. Meta and LinkedIn counts are keyword matches, so other
advertisers using the word are included.

## AI answers

No engine exposes citations through a free API. Ask the prompt in each engine,
copy the cited URLs and log them with `seo-rea cite` / `seo_log_citation`.
