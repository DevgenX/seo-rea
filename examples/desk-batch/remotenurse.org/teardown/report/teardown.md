# SEO teardown: "remote nursing jobs" vs remotenurse.org

Run 20261015T051651Z on 2026-10-15T05:16:51.498Z with seo-rea 0.3.0. Paid budget 0 USD, spent 0.0000 USD. Evidence: [evidence/index.md](../evidence/index.md). Ledger: [ledger.md](ledger.md).

Observed facts cite Evidence IDs. Lines marked *(inferred)* are interpretations.

## Top 10 actions

| # | Action | Why | Impact | Effort | Owner | Evidence |
|---|---|---|---|---|---|---|
| 1 | Put "remote nursing jobs" (or close wording) in the title and H1 of the page meant to rank | The target title "Medical VA training and NCLEX-RN prep \| RemoteNurse" lacks the keyword terms; 2/5 ranking pages have them. | high | S | seo | E007, E008, E010, E012, E013, E017, E018, E015, E016 |
| 2 | Fix JSON-LD errors: SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review | Invalid structured data is ignored for rich results. | medium | S | dev | E017, E018 |
| 3 | Cover competitor phrases in headings and copy: remote nursing jobs, jobs remote, case management, utilization management, curated, acute care, management utilization, nurse case manager | Used by two or more ranking pages and missing from the crawled target pages. | medium | M | content | E007, E008, E010, E012, E013, E017, E018, E015, E016 |

Ranked by impact, then effort. Full data: [dossier.json](dossier.json).

## 1. Summary: why the winners win

- *(inferred)* Search intent is comparison/roundup: 4/8 titles use "best", "top", a year or review wording. Results for this query reward roundup and comparison content, not product homepages. [E001, E003, E007, E008, E010, E012, E013]
- Depth: ranking pages run a median 1077 words vs 2190 on the remotenurse.org homepage. [E007, E008, E010, E012, E013]
- Relevance: 2/5 ranking pages put every keyword term in the title. [E007, E008, E010, E012, E013]
- Structured data: most common types are CollectionPage (2/5), FAQPage (2/5), Organization (2/5). [E007, E008, E010, E012, E013]
- remotenurse.org does not appear in the observed results (top 8 organic results from Bing (headless Chromium) (en-US, logged out) on 2026-10-15). [E001, E003]
- AI readiness: no AI crawler blocked; llms.txt valid. [E021, E019, E020]

## 2. SERP map (what each engine did)

| Path | Engine | Status | Consent | Organic | Ads | Evidence |
|---|---|---|---|---|---|---|
| serp-playwright | Google (headless Chromium) | not used: Google captcha (unusual traffic page) | none shown | 0 | 0 | E001 |
| serp-playwright | Bing (headless Chromium) | used (HTTP 200, relevance 70%) | none shown | 10 | 0 | E003 |

- Headless Chromium user agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8078.4 Safari/537.36`; at least 3 s between requests to one host.

Primary ranking list from **Bing (headless Chromium)** [E005]:

| # | Domain | Title | URL |
|---|---|---|---|
| 1 | indeed.com | Remote Nursing jobs - Indeed | https://www.indeed.com/q-Remote-Nursing-jobs.html |
| 2 | nurseremotely.com | All jobs - nurseremotely.com | https://www.nurseremotely.com/jobs |
| 3 | remotenursingjobs.com | 399 Remote Nursing Jobs in California \| Remote … | https://remotenursingjobs.com/location/california/ |
| 4 | nurse.org | Top 7 Companies With Remote Nursing Jobs in 2026 \| Nurse.org | https://nurse.org/education/remote-nursing-jobs/ |
| 5 | remotenursingjobs.com | 1066 Remote Nursing Jobs in Anywhere \| Remote Nursing Jobs | https://remotenursingjobs.com/location/anywhere/ |
| 6 | indeed.com | remote registered nurse jobs in Remote Work From Home | https://www.indeed.com/q-remote-registered-nurse-l-remote%e2%80%8b%e2%80%8b-work-from-home-jobs.html |
| 7 | remoternjobs.com | Remote RN Jobs — 780 Live Roles · RemoteRN | https://www.remoternjobs.com/remote-rn-jobs |
| 8 | app.nursefern.com | Remote Nurse Jobs \| Nurse Fern | https://app.nursefern.com/ |

AI Overviews and AI answers are not scraped; log them with `seo-rea cite` (section 7).

## 3. Competitor cards

### #1 indeed.com

URL: https://www.indeed.com/q-Remote-Nursing-jobs.html | Evidence: E006

Not analysed: HTTP 403 text/html; charset=UTF-8

### #2 nurseremotely.com

URL: https://www.nurseremotely.com/jobs | Evidence: E007

- Title: All jobs (8 chars)
- Meta description: Browse remote nursing jobs on NurseRemotely — telehealth, utilization review, case management & work-from-home RN roles. 30K monthly visitors. Updated daily.
- H1: All jobs
- Structure: 1 H2, 52 H3, 1077 words
- Top H2s: Footer
- Schema (JSON-LD): none
- Canonical: https://www.nurseremotely.com/jobs
- Internal links: 97; external links: 1
- Top internal anchors: "Jobs" x2, "Hire Nurses" x2, "Blog" x2, "Companies" x2, "Sign in" x2, "Sign up" x2
- robots.txt: HTTP 200, 1 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #3 remotenursingjobs.com

URL: https://remotenursingjobs.com/location/california/ | Evidence: E008

- Title: 399 Remote Nursing Jobs in California \| Remote Nursing Jobs (59 chars)
- Meta description: Find 399 work from home nursing jobs in California. Browse verified positions for RNs, NPs, LPNs/LVNs across nursing specialties. Updated October 14, 2026.
- H1: Remote Nursing Jobs California
- Structure: 7 H2, 24 H3, 1182 words
- Top H2s: Top Remote Nursing Jobs in California / Nurse Salaries in California / Explore Work-From-Home Nursing Jobs in Nearby States / Popular Online RN Jobs and Specialties in California / FAQs - Remote RN Jobs California / Explore Remote Nursing Jobs in Popular States
- Schema (JSON-LD): Answer, CollectionPage, FAQPage, ImageObject, Organization, Question, Thing - 1 checked, 0 with errors
- Canonical: https://remotenursingjobs.com/location/california/
- Internal links: 156; external links: 4
- Top internal anchors: "California" x6, "Unlock all jobs" x6, "Remote RN Jobs" x3, "Remote LPN/LVN Jobs" x3, "Remote NP Jobs" x3, "Remote PA Jobs" x3
- robots.txt: HTTP 200, 0 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #4 nurse.org

URL: https://nurse.org/education/remote-nursing-jobs/ | Evidence: E009

Not analysed: HTTP 403 text/html

### #5 remotenursingjobs.com

URL: https://remotenursingjobs.com/location/anywhere/ | Evidence: E010

- Title: 1066 Remote Nursing Jobs in Anywhere \| Remote Nursing Jobs (58 chars)
- Meta description: Find 1066 work from home nursing jobs in Anywhere. Browse verified positions for RNs, NPs, LPNs/LVNs across nursing specialties. Updated October 14, 2026.
- H1: Remote Nursing Jobs Anywhere
- Structure: 4 H2, 22 H3, 892 words
- Top H2s: Top Remote Nursing Jobs in Anywhere / Popular Online RN Jobs and Specialties in Anywhere / Explore Remote Nursing Jobs in Popular States / Find Remote RN, NP, and LPN Jobs by Skills and Specialties
- Schema (JSON-LD): CollectionPage, ImageObject, Organization, Thing - 0 checked, 0 with errors
- Canonical: https://remotenursingjobs.com/location/anywhere/
- Internal links: 159; external links: 4
- Top internal anchors: "Unlock all jobs" x6, "RN" x5, "Anywhere" x5, "Full Time" x4, "Remote RN Jobs" x3, "Remote LPN/LVN Jobs" x3
- robots.txt: HTTP 200, 0 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #6 indeed.com

URL: https://www.indeed.com/q-remote-registered-nurse-l-remote%e2%80%8b%e2%80%8b-work-from-home-jobs.html | Evidence: E011

Not analysed: HTTP 403 text/html; charset=UTF-8

### #7 remoternjobs.com

URL: https://www.remoternjobs.com/remote-rn-jobs | Evidence: E012

- Title: Remote RN Jobs — 776 Live Roles · RemoteRN (42 chars)
- Meta description: 776 live remote RN openings — salary and license requirements shown where disclosed, every listing reviewed by a nurse before it goes live. Updated October 15, 2026.
- H1: Remote RN Jobs
- Structure: 7 H2, 51 H3, 3039 words
- Top H2s: Open roles / Filters / Filters / New remote nursing jobs, as they post / Medical Field Case Manager / New remote Case Management jobs, as they post
- Schema (JSON-LD): Answer, BreadcrumbList, FAQPage, ListItem, Question - 2 checked, 0 with errors
- Canonical: https://www.remoternjobs.com/remote-rn-jobs
- Internal links: 278; external links: 1
- Top internal anchors: "Job details" x50, "Case Management" x28, "Crawford & Company" x14, "California" x12, "Utilization Review" x9, "In-Home Assessment" x8
- robots.txt: HTTP 200, 4 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### #8 app.nursefern.com

URL: https://app.nursefern.com/ | Evidence: E013

- Title: Remote Nurse Jobs \| Nurse Fern (30 chars)
- Meta description: Remote nurse job posts, biotech nurse jobs, and non-bedside nurse jobs, curated for nurses leaving the bedside. Jobs updated daily!
- H1: (none)
- Structure: 0 H2, 0 H3, 0 words
- Top H2s: (none)
- Schema (JSON-LD): none
- Canonical: https://app.nursefern.com/
- Internal links: 0; external links: 0
- Top internal anchors: (none)
- robots.txt: HTTP 200, 1 sitemap(s) declared
- Backlinks: not collected (see unknowns)

### Target: remotenurse.org

- Homepage title: Medical VA training and NCLEX-RN prep \| RemoteNurse
- Meta description: Free training for remote medical VA work: 16 courses, 442 scored practice cases and job boards. NCLEX-RN prep with 2,600 questions.
- H1: Medical VA training and NCLEX-RN prepWork the desk before the job. Sit the exam before the exam.; 10 H2; 2190 words
- Schema (all crawled pages): AboutPage, AggregateOffer, Answer, Article, BreadcrumbList, CollectionPage, ContactPoint, Country, CreativeWork, FAQPage, HowTo, HowToStep, ImageObject, ListItem, Offer, Organization, Question, SoftwareApplication, SpeakableSpecification, UnitPriceSpecification, WebApplication, WebPage, WebSite
- Pages crawled: 10; sitemap URLs: 460
- Most-linked internal pages: /sign-in (55), /guides (43), /support (42), /roles (41), /features/learn (40)
- Top phrases: nclex, ncsbn, take the nclex, free, source ncsbn, test, practice, fees and steps, trumerit formerly cgfns, board
- Evidence: E017, E018, E015, E016

## 4. Schema validation

Required-property checks for Article, FAQPage, Product, SoftwareApplication, Organization, BreadcrumbList, HowTo and LocalBusiness (and their common subtypes). Other types are listed but not checked.

| Page | Blocks | Type (checked as) | Result | Errors | Warnings | Evidence |
|---|---|---|---|---|---|---|
| #2 nurseremotely.com | 0 | - | no JSON-LD | - | - | E007 |
| #3 remotenursingjobs.com | 1 | FAQPage | valid | - | - | E008 |
| #5 remotenursingjobs.com | 1 | (no checked types) | n/a | - | - | E010 |
| #7 remoternjobs.com | 2 | BreadcrumbList | valid | - | - | E012 |
| #7 remoternjobs.com | 2 | FAQPage | valid | - | - | E012 |
| #8 app.nursefern.com | 0 | - | no JSON-LD | - | - | E013 |
| target / | 1 | Organization | valid | - | - | E018 |
| target / | 1 | SoftwareApplication | **errors** | needs one of: aggregateRating, review | - | E018 |
| target / | 1 | WebApplication (SoftwareApplication) | **errors** | needs one of: aggregateRating, review | - | E018 |
| target / | 1 | FAQPage | valid | - | - | E018 |
| target /about | 1 | Organization | valid | - | - | E018 |
| target /about | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/study-plan | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/study-plan | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/study-plan | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/nigeria | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/nigeria | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/nigeria | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/nigeria | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/nigeria | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/india | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/india | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/india | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/india | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/india | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/kenya | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/kenya | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/kenya | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/kenya | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/kenya | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/mexico | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/mexico | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/mexico | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/mexico | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/mexico | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/philippines | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/philippines | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/philippines | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/philippines | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/philippines | 1 | FAQPage | valid | - | - | E018 |
| target /nclex-rn-prep/pakistan | 1 | Organization | valid | - | - | E018 |
| target /nclex-rn-prep/pakistan | 1 | Article | valid | - | - | E018 |
| target /nclex-rn-prep/pakistan | 1 | HowTo | valid | - | missing recommended "image"; missing recommended "totalTime"; missing recommended "supply"; missing recommended "tool" | E018 |
| target /nclex-rn-prep/pakistan | 1 | BreadcrumbList | valid | - | - | E018 |
| target /nclex-rn-prep/pakistan | 1 | FAQPage | valid | - | - | E018 |

## 5. AI-search readiness (target)

AI crawler access to `https://remotenurse.org/` from robots.txt [E015, E021]:

| Crawler | Operator | Purpose | Access | Rule |
|---|---|---|---|---|
| GPTBot | OpenAI | model training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| OAI-SearchBot | OpenAI | ChatGPT search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| ChatGPT-User | OpenAI | user-initiated fetches | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| ClaudeBot | Anthropic | model training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Claude-SearchBot | Anthropic | search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| PerplexityBot | Perplexity | search index | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Google-Extended | Google | Gemini training and grounding (not Search) | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| Applebot-Extended | Apple | Apple Intelligence training | **partial** | own group: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |
| CCBot | Common Crawl | open crawl used for training | **partial** | falls back to *: Disallow /app/, Disallow /api/, Disallow /sign-in, Disallow /verify, Disallow /reset-password, Disallow /forgot-password, Disallow /desk-plan, Disallow /coming-soon |

- /llms.txt: valid - title "RemoteNurse", summary present, 10 section(s), 91 link(s) [E019]
  - warning: list item is not "- [name](url): notes": - Product: remotenurse.org. The iOS companion Medical VA Coach: RemoteNurse is p
  - warning: list item is not "- [name](url): notes": - Audience: US bedside RNs moving into review work; nurses and healthcare BPO st
  - warning: list item is not "- [name](url): notes": - NCLEX-RN prep: an original 2,600-question NCLEX-style bank written to the 2026
  - warning: list item is not "- [name](url): notes": - Scope: sixteen remote healthcare desks, not a single role. Fifteen of the sixt
  - warning: list item is not "- [name](url): notes": - Grading: the Case Judge is deterministic and is the only verdict; AI coaches a
- /llms-full.txt: valid - 80663 bytes, title "RemoteNurse" [E020]

| Source | Strategy | Performance | Accessibility | Best practices | SEO | Lab metrics | Field (CrUX) | Evidence |
|---|---|---|---|---|---|---|---|---|
| psi | mobile | skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key | | | | | | E022 |

## 6. Keyword gap (top 30)

Phrases used by ranking pages and absent from 10 crawled remotenurse.org pages. Ranked by competitors using them, then TF-IDF weighted by phrase length (title/meta/headings count 3x). No search volume on the free tier.

| # | Phrase | Competitors using | TF-IDF | Weighted count |
|---|---|---|---|---|
| 1 | remote nursing jobs | 4 | 0.02648 | 61 |
| 2 | jobs remote | 4 | 0.01831 | 40 |
| 3 | case management | 4 | 0.0132 | 61 |
| 4 | utilization management | 4 | 0.01147 | 42 |
| 5 | curated | 4 | 0.02253 | 8 |
| 6 | acute care | 4 | 0.00679 | 17 |
| 7 | management utilization | 4 | 0.00627 | 16 |
| 8 | nurse case manager | 4 | 0.00356 | 13 |
| 9 | specialty | 4 | 0.0093 | 56 |
| 10 | np | 4 | 0.0091 | 22 |
| 11 | hybrid | 4 | 0.00774 | 33 |
| 12 | triage | 4 | 0.00719 | 33 |
| 13 | nurse case | 4 | 0.00356 | 13 |
| 14 | management utilization review | 4 | 0.00236 | 8 |
| 15 | acute | 4 | 0.00679 | 17 |
| 16 | case manager utilization | 4 | 0.00222 | 8 |
| 17 | senior | 4 | 0.00602 | 30 |
| 18 | telephonic | 4 | 0.00571 | 17 |
| 19 | manager utilization | 4 | 0.00222 | 8 |
| 20 | cvs health | 4 | 0.00139 | 4 |
| 21 | service | 4 | 0.00241 | 11 |
| 22 | cvs | 4 | 0.00139 | 4 |
| 23 | remote nurse | 3 | 0.05104 | 8 |
| 24 | jobs nurse | 3 | 0.02626 | 6 |
| 25 | posts | 3 | 0.02626 | 5 |
| 26 | remote rn | 3 | 0.01266 | 32 |
| 27 | rn jobs | 3 | 0.01197 | 28 |
| 28 | remote rn jobs | 3 | 0.00698 | 18 |
| 29 | nurse practitioner | 3 | 0.00971 | 29 |
| 30 | care manager | 3 | 0.00957 | 25 |

## 7. AI-citation table

No AI answers recorded yet. Ask each engine and log the cited URLs, for example:

```sh
seo-rea cite --out <this dir> --engine chatgpt --prompt "what is the best remote nursing jobs" --urls "https://a.com/x,https://b.com/y"
```

## 8. Ads

SERP ads observed: 0. Ad libraries:

| Advertiser | Platform | Status | Visible count | Note | Lookup | Evidence |
|---|---|---|---|---|---|---|
| remotenurse.org | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=remotenurse.org | E024 |
| remotenurse.org | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=remotenurse&search_type=keyword_unordered&media_type=all | E025 |
| remotenurse.org | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=remotenurse | E026 |
| app.nursefern.com | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=app.nursefern.com | E027 |
| app.nursefern.com | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=nursefern&search_type=keyword_unordered&media_type=all | E028 |
| app.nursefern.com | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=nursefern | E029 |
| indeed.com | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=indeed.com | E030 |
| indeed.com | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=indeed&search_type=keyword_unordered&media_type=all | E031 |
| indeed.com | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=indeed | E032 |
| nurseremotely.com | Google Ads Transparency Center | manual-check | - | open in a browser; not fetched | https://adstransparency.google.com/?region=anywhere&domain=nurseremotely.com | E033 |
| nurseremotely.com | Meta Ad Library | manual-check | - | open in a browser; not fetched | https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=nurseremotely&search_type=keyword_unordered&media_type=all | E034 |
| nurseremotely.com | LinkedIn Ad Library | manual-check | - | open in a browser; not fetched | https://www.linkedin.com/ad-library/search?keyword=nurseremotely | E035 |

Record what you find (count, run dates, hooks, offers, landing pages) as notes next to the evidence ID.

## 9. Playbook

1. Get listed in the roundups that already rank (remotenursingjobs.com, nurse.org, remoternjobs.com): draft a short pitch with what the product does differently. Do not send from this tool. Most results are third-party roundups, so inclusion is the fastest way onto this SERP. [E001, E003]
2. Put "remote nursing jobs" (or close wording) in the title and H1 of the page meant to rank. Ranking pages carry the keyword terms in their title; the target homepage does not. [E007, E008, E010, E012, E013, E017, E018]
3. Fix JSON-LD errors on the target: SoftwareApplication: needs one of: aggregateRating, review; WebApplication: needs one of: aggregateRating, review. Invalid structured data is ignored for rich results. [E017, E018]
4. Fix /llms.txt: list item is not "- [name](url): notes": - Product: remotenurse.org. The iOS companion Medical VA Coach: RemoteNurse is p; list item is not "- [name](url): notes": - Audience: US bedside RNs moving into review work; nurses and healthcare BPO st; list item is not "- [name](url): notes": - NCLEX-RN prep: an original 2,600-question NCLEX-style bank written to the 2026. The file exists but does not fully follow the llmstxt.org format. [E019]
5. Cover these competitor phrases in H2s and copy where they fit the product: remote nursing jobs, jobs remote, case management, utilization management, curated, acute care, management utilization, nurse case manager, specialty, np. Used by two or more ranking pages, missing from the target crawl. [E007, E008, E010, E012, E013, E017, E018]
6. Ask ChatGPT, Perplexity, Gemini and Grok "remote nursing jobs" style prompts and log answers with `seo-rea cite`. AI-answer citations have not been recorded yet.
7. Open the ad-library links and note competitor ad hooks, offers and landing pages. Ad libraries need a browser; counts alone do not show the creative. [E024, E025, E026, E027, E028, E029, E030, E031, E032, E033, E034, E035]

Drafts only: this tool never sends outreach, buys ads or publishes changes.

## 10. Unknowns and cost

- Google (headless Chromium) rankings not observed
- Personalised and other-location results not observed
- On-page facts for indeed.com
- On-page facts for nurse.org
- Server or CDN bot blocking not tested
- Ads shown to logged-in or other-location users
- Ad counts, run dates, creatives
- Referring domains, link velocity
- PageSpeed Insights skipped: PSI quota exceeded (HTTP 429); set PSI_API_KEY for a free key
- Paid keyword data (volume, ranked keywords) skipped: budget is 0

Paid API spend this run: 0.0000 USD (budget 0 USD).
