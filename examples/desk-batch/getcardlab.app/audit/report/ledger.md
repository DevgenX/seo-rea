# Finding ledger: https://getcardlab.app/

| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |
|---|---|---|---|---|---|---|
| C01 | https://getcardlab.app/ has 1 JSON-LD block(s) (Answer, Country, FAQPage, Offer, Organization, Question, SoftwareApplication, UnitPriceSpecification, WebSite); 1 checked node(s) with errors | E001 | observed | high | raw HTML without JavaScript | - |
| C02 | https://getcardlab.app/: 2471 words, 1 H1, 10 H2, title 46 chars, meta description present | E001 | observed | high | raw HTML without JavaScript | - |
| C03 | getcardlab.app sitemap lists 114 URLs | E003, E004 | observed | high | robots.txt Sitemap lines and /sitemap.xml | - |
| C04 | getcardlab.app robots.txt lets all 9 checked AI crawlers fetch / | E003, E007 | observed | high | robots.txt rules for each product token; crawlers may ignore robots.txt or be blocked by a firewall | Server or CDN bot blocking not tested |
| C05 | getcardlab.app/llms.txt follows the llmstxt.org format (9 sections, 129 links) | E005 | observed | high | single fetch of /llms.txt | - |
| C06 | getcardlab.app/llms-full.txt present (586524 bytes) | E006 | observed | high | single fetch of /llms-full.txt | - |
