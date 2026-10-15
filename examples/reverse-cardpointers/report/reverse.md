# Reverse engineering: cardpointers.com

Run 20261015T223928Z - seo-rea 0.4.0 - 70 pages crawled (59 indexable, complete) - cost 0.00 USD

## 1. The strategy in brief

- _(observed, high)_ Content is concentrated in /offers (25 of 59 indexable pages, mostly entity pages). [E001]
- _(inferred, medium)_ Likely target topics (repeated across titles, H1s and URLs): "offers", "credit card", "gift card", "amex", "apple", "pro". [E001]
- _(inferred, medium)_ Page types that carry the site: entity (37), comparison (1), product (1). [E001]
- _(inferred, medium)_ Programmatic SEO: /offers/* (24 pages, titles "... 5% back"); /cards/* (13 pages, titles "(varied titles, uniform layout)"). [E001]
- _(observed, high)_ Internal linking: 22 links repeat on most pages (nav/footer); average 22.8 internal links per page; strongest internal hubs: /apps/iphone/, /apps/ipad/, /apps/watch/. [E001]
- _(observed, high)_ AEO: llms.txt present and valid (13 links); AI crawlers blocked: none; FAQPage on 0 page(s); 0 question-style titles; 68% of pages readable without JavaScript. [E002, E003, E004, E001]
- _(observed, medium)_ Stack fingerprints: Nuxt, Vue, HubSpot. [E001]
- _(observed, medium)_ Authority signals (free): Tranco rank 365175; 0 Wikipedia article(s) link to it; unknown Common Crawl index page(s). [E005, E001]

## 2. Target topics

| Term | Pages | In titles | Example |
|---|---|---|---|
| offers | 3 | 3 | https://cardpointers.com/extension/ |
| credit card | 2 | 2 | https://cardpointers.com/ |
| gift card | 2 | 2 | https://cardpointers.com/gift/ |
| amex | 2 | 2 | https://cardpointers.com/extension/ |
| apple | 2 | 2 | https://cardpointers.com/apps/watch/ |
| pro | 2 | 1 | https://cardpointers.com/apps/vision/ |
| cards | 2 | 0 | https://cardpointers.com/ |

## 3. Content architecture

| Cluster | Pages | Share | Main template | Avg words | Schema | Top terms | Hub |
|---|---|---|---|---|---|---|---|
| /offers | 25 | 42% | entity | 213 | - | - | https://cardpointers.com/offers/ |
| /cards | 14 | 24% | entity | 582 | - | - | https://cardpointers.com/cards/ |
| /apps | 7 | 12% | other | 372 | - | apple | https://cardpointers.com/apps/iphone/ |
| /gift | 2 | 3% | other | 311 | - | gift card | - |
| / | 1 | 2% | home | 483 | - | - | - |
| /account | 1 | 2% | other | 525 | - | - | - |
| /ai | 1 | 2% | other | 270 | - | - | - |
| /app | 1 | 2% | product | 24 | - | - | - |
| /extension | 1 | 2% | other | 337 | - | - | - |
| /forgot | 1 | 2% | other | 122 | - | - | - |
| /login | 1 | 2% | other | 140 | - | - | - |
| /privacy | 1 | 2% | legal | 1176 | - | - | - |

| Template | Pages | Avg words | Example |
|---|---|---|---|
| entity | 37 | 344 | https://cardpointers.com/offers/menchies-frozen-yogurt-lake-nona-5-back-48/ |
| other | 18 | 391 | https://cardpointers.com/apps/iphone/ |
| comparison | 1 | 536 | https://cardpointers.com/cards/ |
| home | 1 | 483 | https://cardpointers.com/ |
| legal | 1 | 1176 | https://cardpointers.com/privacy/ |
| product | 1 | 24 | https://cardpointers.com/app/ |

Programmatic patterns:

| Pattern | Pages | Titles | Example |
|---|---|---|---|
| /offers/* | 24 | ... 5% back | https://cardpointers.com/offers/menchies-frozen-yogurt-lake-nona-5-back-48/ |
| /cards/* | 13 | (varied titles, uniform layout) | https://cardpointers.com/cards/chase-sapphire-reserve-new/ |

## 4. Internal linking

Average 22.8 internal links per page; 22 sitewide links; 0 orphan and 1 deep (4+ clicks) pages.

| Hub | Internal PageRank | Inlinks |
|---|---|---|
| https://cardpointers.com/apps/iphone/ | 0.03829 | 60 |
| https://cardpointers.com/apps/ipad/ | 0.03829 | 60 |
| https://cardpointers.com/apps/watch/ | 0.03829 | 60 |
| https://cardpointers.com/apps/vision/ | 0.03829 | 60 |
| https://cardpointers.com/apps/mac/ | 0.03829 | 60 |
| https://cardpointers.com/apps/android/ | 0.03829 | 60 |
| https://cardpointers.com/extension/ | 0.03829 | 60 |
| https://cardpointers.com/pro/ | 0.03829 | 60 |

## 5. Authority and link signals (free)

Tranco rank: 365175; Wikipedia articles linking: 0; Wikipedia mentions: 0; Common Crawl index pages: unknown. [E005, E001]

Most-linked outbound domains: facebook.com (58), impresskit.net (58), instagram.com (58), reddit.com (58), twitter.com (58), youtube.com (58), apps.apple.com (11), play.google.com (5), chrome.google.com (4), appleid.apple.com (3), addons.mozilla.org (2), c.clapu.com (1)

## 6. Structured data

| Type | Pages | Share |
|---|---|---|

## 7. AEO tactics

- llms.txt: valid, 13 links; llms-full.txt: present [E002, E003, E004, E001]
- AI crawlers: GPTBot allowed, OAI-SearchBot allowed, ChatGPT-User allowed, ClaudeBot allowed, Claude-SearchBot allowed, PerplexityBot allowed, Google-Extended allowed, Applebot-Extended allowed, CCBot allowed
- FAQPage on 0 page(s), HowTo on 0; 0 question-style titles
- 68% of indexable pages have 200+ words without JavaScript

## 8. Publishing cadence

No publish dates in page metadata.

## 9. Tech stack

Nuxt (59), Vue (45), HubSpot (1)

## 10. Playbook: what to copy

| Step | Why | Effort | Impact | Evidence |
|---|---|---|---|---|
| Build a /offers cluster of entity pages | 25 pages (42% of the site) sit there, linked from the hub /offers/. | L | high | E001 |
| Template pages like /offers/* | 24 pages share the title pattern "... 5% back". | L | high | E001 |
| Template pages like /cards/* | 13 pages share one layout. | L | high | E001 |
| Publish /llms.txt | They publish one with 13 links. | S | low | E002, E003, E004, E001 |
| Create hub pages linked from the global navigation | /apps/iphone/ has 60 internal inlinks and the highest internal PageRank after the home page. | S | medium | E001 |

## Unknowns

- Rankings and traffic: not measured (free mode does not query SERPs per page).
- Backlinks: only free proxies (Tranco, Wikipedia, Common Crawl, outbound links); no link index.
- JavaScript-rendered content is not seen; counts reflect raw HTML, like most AI crawlers.
- No publish dates found in page metadata; cadence unknown.

Evidence: [evidence/index.md](../evidence/index.md). Crawl: [report/crawl.json](../report/crawl.json).
