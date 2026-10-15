# Finding ledger: https://remotenurse.org/

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | https://remotenurse.org/ has 1 JSON-LD block(s) (AggregateOffer, Answer, ContactPoint, Country, FAQPage, ImageObject, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebApplication, WebSite); 2 checked node(s) with errors | E001 | observed | high | raw HTML without JavaScript | - |
| C02 | https://remotenurse.org/: 2190 words, 1 H1, 10 H2, title 51 chars, meta description present | E001 | observed | high | raw HTML without JavaScript | - |
| C03 | remotenurse.org sitemap lists 460 URLs | E003, E004 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C04 | remotenurse.org robots.txt lets all 9 checked AI crawlers fetch / | E003, E007 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C05 | remotenurse.org/llms.txt follows the llmstxt.org format (10 sections, 91 links) | E005 | observed | high | single fetch of /llms.txt | - |
| C06 | remotenurse.org/llms-full.txt present (80663 bytes) | E006 | observed | high | single fetch of /llms-full.txt | - |
