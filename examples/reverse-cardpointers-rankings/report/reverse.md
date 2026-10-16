# Reverse engineering: cardpointers.com

Run 20261016T013608Z - seo-rea 0.4.0 - 70 pages crawled (59 indexable, complete) - cost 0.00 USD

## 1. The strategy in brief

- _(observed, high)_ Ranks for 3178 Google keywords (US), 370 in the top 10 and 85 in the top 3, for an estimated 4295.1 organic visits a month. [E006, E007]
- _(observed, high)_ Traffic comes mostly from /cards (47% of sampled traffic, 76 keywords; best: "academy credit card"). Next: / (45%). [E006, E007]
- _(observed, high)_ Biggest keywords by traffic: "cardpointers" (#1, 5400/mo), "academy credit card" (#19, 74000/mo), "cardpointers app" (#1, 210/mo), "academy sports credit card" (#21, 74000/mo), "citi strata premier card" (#20, 18100/mo). [E006, E007]
- _(observed, medium)_ Closest organic competitors by shared keywords: nerdwallet.com (2157), wallethub.com (1823), thepointsguy.com (1531), creditkarma.com (1337), cnbc.com (1306). [E006, E007]
- _(observed, high)_ Content is concentrated in /offers (25 of 59 indexable pages, mostly entity pages). [E001]
- _(inferred, medium)_ Likely target topics (repeated across titles, H1s and URLs): "offers", "credit card", "gift card", "amex", "apple", "pro". [E001]
- _(inferred, medium)_ Page types that carry the site: entity (37), comparison (1), product (1). [E001]
- _(inferred, medium)_ Programmatic SEO: /offers/* (24 pages, titles "... 5% back"); /cards/* (13 pages, titles "(varied titles, uniform layout)"). [E001]
- _(observed, high)_ Internal linking: 22 links repeat on most pages (nav/footer); average 22.8 internal links per page; strongest internal hubs: /apps/iphone/, /apps/ipad/, /apps/watch/. [E001]
- _(observed, high)_ AEO: llms.txt present and valid (13 links); AI crawlers blocked: none; FAQPage on 0 page(s); 0 question-style titles; 68% of pages readable without JavaScript. [E002, E003, E004, E001]
- _(observed, medium)_ Stack fingerprints: Nuxt, Vue, HubSpot. [E001]
- _(observed, medium)_ Authority signals (free): Tranco rank 364213; 0 Wikipedia article(s) link to it; 1 Common Crawl index page(s). [E005, E001]

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
| https://cardpointers.com/apps/iphone/ | 0.03895 | 59 |
| https://cardpointers.com/apps/ipad/ | 0.03895 | 59 |
| https://cardpointers.com/apps/watch/ | 0.03895 | 59 |
| https://cardpointers.com/apps/vision/ | 0.03895 | 59 |
| https://cardpointers.com/apps/mac/ | 0.03895 | 59 |
| https://cardpointers.com/apps/android/ | 0.03895 | 59 |
| https://cardpointers.com/extension/ | 0.03895 | 59 |
| https://cardpointers.com/pro/ | 0.03895 | 59 |

## 5. Authority and link signals (free)

Tranco rank: 364213; Wikipedia articles linking: 0; Wikipedia mentions: 0; Common Crawl index pages: 1. [E005, E001]

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
| Target their page-two keywords: "academy credit card", "citi strata premier card", "jp morgan reserve card" | 16 keywords with 100+ searches where they sit at #4-20, so the top spots are not locked. | M | high | E006, E007 |
| Compete for the /cards traffic with better pages | 47% of their sampled traffic lands there. | L | high | E006, E007 |
| Build a /offers cluster of entity pages | 25 pages (42% of the site) sit there, linked from the hub /offers/. | L | high | E001 |
| Template pages like /offers/* | 24 pages share the title pattern "... 5% back". | L | high | E001 |
| Template pages like /cards/* | 13 pages share one layout. | L | high | E001 |
| Publish /llms.txt | They publish one with 13 links. | S | low | E002, E003, E004, E001 |
| Create hub pages linked from the global navigation | /apps/iphone/ has 59 internal inlinks and the highest internal PageRank after the home page. | S | medium | E001 |

## 11. What it actually ranks for (DataForSEO, paid)

3178 ranked keywords (Google, location 2840, en); 370 in the top 10, 85 in the top 3; est. 4295.1 visits/month. Cost: estimated $0.0000, actual $0.0000 (0 paid call(s), 2 from cache). [E006, E007]

| Keyword | Pos | Volume | Est. visits | Intent | URL |
|---|---|---|---|---|---|
| cardpointers | 1 | 5400 | 1146.74 | transactional | https://cardpointers.com/ |
| academy credit card | 19 | 74000 | 205.58 | transactional | https://cardpointers.com/cards/academy-sports-outdoors-credit-card/ |
| cardpointers app | 1 | 210 | 131.72 | navigational | https://cardpointers.com/ |
| academy sports credit card | 21 | 74000 | 94.26 | navigational | https://cardpointers.com/cards/academy-sports-outdoors-credit-card/ |
| citi strata premier card | 20 | 18100 | 76.3 | navigational | https://cardpointers.com/cards/citi-premier-card/ |
| jp morgan reserve card | 7 | 9900 | 62.72 | transactional | https://cardpointers.com/cards/j-p-morgan-reserve-card-ex-palladium/ |
| credit card rewards | 24 | 135000 | 61.66 | commercial | https://cardpointers.com/ |
| cardpointers extension | 1 | 170 | 59.23 | transactional | https://cardpointers.com/extension/ |
| mgm rewards mastercard | 21 | 18100 | 57.92 | commercial | https://cardpointers.com/cards/mgm-rewards-iconic-world-elite-mastercard/ |
| cardpointers chrome extension | 1 | 110 | 56.71 | informational | https://cardpointers.com/extension/ |
| citi custom cash card | 19 | 40500 | 48.75 | transactional | https://cardpointers.com/cards/citi-custom-cash-card/ |
| costco anywhere visa card by citi | 39 | 90500 | 42.91 | navigational | https://cardpointers.com/cards/costco-anywhere-visa-card-by-citi/ |
| citi costco card | 26 | 18100 | 41.37 | transactional | https://cardpointers.com/cards/costco-anywhere-visa-card-by-citi/ |
| synchrony home | 24 | 9900 | 37.52 | navigational | https://cardpointers.com/cards/synchrony-home-credit-card/ |
| pandora credit card | 5 | 2900 | 34.47 | transactional | https://cardpointers.com/cards/pandora-credit-card/ |
| cabela's credit card | 40 | 14800 | 32.18 | navigational | https://cardpointers.com/cards/cabelas-club-black/ |
| fidelity rewards | 20 | 8100 | 31.24 | commercial | https://cardpointers.com/cards/fidelity-rewards-visa-signature/ |
| amex offers | 14 | 8100 | 30.99 | commercial | https://cardpointers.com/offers/ |
| o'shucks bar & grill ahh sushi | 22 | 3600 | 30.96 | navigational | https://cardpointers.com/offers/oshucks-bar-grill-ahh-sushi-5-back-44/ |
| cardpointers login | 1 | 140 | 26.64 | navigational | https://cardpointers.com/login/ |
| capital one quicksilver cash rewards credit card | 33 | 27100 | 21.83 | transactional | https://cardpointers.com/cards/capital-one-quicksilver-cash-rewards-credit-card/ |
| home depot card | 28 | 18100 | 21.74 | transactional | https://cardpointers.com/cards/home-depot-credit-card/ |
| victoria's tratta italiano | 23 | 5400 | 21.58 | transactional | https://cardpointers.com/offers/victorias-tratta-italiano-5-cash-back-5/ |
| united explorer card login | 21 | 3600 | 21.09 | navigational | https://cardpointers.com/cards/united-explorer-card/ |
| academy credit | 18 | 2400 | 20.36 | informational | https://cardpointers.com/cards/academy-sports-outdoors-credit-card/ |

| Section | Keywords | Top 10 | Est. visits | Share | Best keyword |
|---|---|---|---|---|---|
| /cards | 76 | 20 | 1500.5 | 47% | academy credit card |
| / | 13 | 6 | 1435.6 | 45% | cardpointers |
| /offers | 7 | 2 | 135.6 | 4% | amex offers |
| /extension | 2 | 2 | 115.9 | 4% | cardpointers extension |
| /login | 1 | 1 | 26.6 | 1% | cardpointers login |
| /article | 1 | 1 | 7.9 | 0% | cardpointers lifetime |

| Page | Keywords | Est. visits | Best keyword | Pos |
|---|---|---|---|---|
| https://cardpointers.com/ | 13 | 1435.6 | cardpointers | 1 |
| https://cardpointers.com/cards/academy-sports-outdoors-credit-card/ | 5 | 341.5 | academy credit card | 19 |
| https://cardpointers.com/extension/ | 2 | 115.9 | cardpointers extension | 1 |
| https://cardpointers.com/cards/j-p-morgan-reserve-card-ex-palladium/ | 4 | 97.6 | jp morgan reserve card | 7 |
| https://cardpointers.com/cards/citi-premier-card/ | 2 | 84.8 | citi strata premier card | 20 |
| https://cardpointers.com/cards/costco-anywhere-visa-card-by-citi/ | 2 | 84.3 | costco anywhere visa card by citi | 39 |
| https://cardpointers.com/cards/synchrony-home-credit-card/ | 3 | 65.3 | synchrony home | 24 |
| https://cardpointers.com/cards/citi-custom-cash-card/ | 2 | 59.5 | citi custom cash card | 19 |
| https://cardpointers.com/cards/mgm-rewards-iconic-world-elite-mastercard/ | 1 | 57.9 | mgm rewards mastercard | 21 |
| https://cardpointers.com/cards/home-depot-credit-card/ | 3 | 54.8 | home depot card | 28 |
| https://cardpointers.com/cards/united-explorer-card/ | 4 | 48.1 | united explorer card login | 21 |
| https://cardpointers.com/cards/fidelity-rewards-visa-signature/ | 2 | 41.1 | fidelity rewards | 20 |
| https://cardpointers.com/cards/pandora-credit-card/ | 1 | 34.5 | pandora credit card | 5 |
| https://cardpointers.com/cards/cabelas-club-black/ | 1 | 32.2 | cabela's credit card | 40 |
| https://cardpointers.com/offers/ | 1 | 31 | amex offers | 14 |

Intent mix: transactional 36, navigational 35, commercial 19, informational 10.

| Competitor | Shared keywords | Avg pos | Ranked keywords | Est. visits |
|---|---|---|---|---|
| nerdwallet.com | 2157 | 11.5 | 1169039 | 4553404 |
| wallethub.com | 1823 | 13.5 | 401127 | 4439299.4 |
| thepointsguy.com | 1531 | 18.2 | 381005 | 1236510.1 |
| creditkarma.com | 1337 | 23.5 | 207216 | 824924.8 |
| cnbc.com | 1306 | 18.8 | 1702570 | 8211122.9 |
| upgradedpoints.com | 1282 | 20.5 | 297968 | 627460.9 |
| frequentmiler.com | 1219 | 33.9 | 73722 | 74362.1 |
| forbes.com | 1203 | 30.8 | 3855745 | 7438569.1 |
| maxrewards.com | 1163 | 39.3 | 13994 | 11293.1 |

- Sections and pages are rolled up from the top 100 keywords by estimated traffic, not every keyword.
- 2 response(s) served from cache at $0; originally billed $0.0372 (see the ledger).

## Unknowns

- Rankings: DataForSEO Labs estimates (Google US); traffic is modelled, not measured.
- Backlinks: no link index queried (pass --backlinks); free proxies only.
- JavaScript-rendered content is not seen; counts reflect raw HTML, like most AI crawlers.
- No publish dates found in page metadata; cadence unknown.

Evidence: [evidence/index.md](../evidence/index.md). Crawl: [report/crawl.json](../report/crawl.json).
