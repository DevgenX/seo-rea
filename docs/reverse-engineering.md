# Reverse engineering a domain's SEO / AEO strategy

Status: design + first working command (`seo-rea reverse`, schema v1).

## Goal

`rea` reverse engineers an app. `seo-rea reverse <domain>` does the same for a
website, a competitor's or our own: from public data only, infer **what the
site is trying to rank and get cited for, and how it goes about it**, with
every statement tied to saved evidence, at a default cost of $0.

Questions it answers:

| Question                                | Signal (v1)                                                                                                       | Source                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Which keywords / topics does it target? | Terms repeated across titles, H1s and URL slugs of hand-made pages (bigrams first, brand words dropped)           | crawl                       |
| How is content organised?               | Clusters by first path segment, share of pages, dominant template, hub page per cluster                           | crawl + link graph          |
| Which page templates carry it?          | Page type per URL: article, comparison, tool, product, entity, category, help, legal                              | URL, title, JSON-LD         |
| Is it doing programmatic SEO?           | 10+ pages under one prefix with a shared title skeleton or uniform layout                                         | crawl                       |
| How does it link internally?            | Sitewide (nav/footer) links, average links per page, internal PageRank hubs, orphans, click depth                 | crawl graph                 |
| How strong is it off-site?              | Tranco rank, Wikipedia articles linking, Wikipedia mentions, Common Crawl footprint, most-linked outbound domains | free public APIs            |
| How does it use structured data?        | Share of indexable pages per JSON-LD type                                                                         | crawl                       |
| What AEO tactics does it use?           | llms.txt / llms-full.txt, AI crawler robots rules, FAQPage / HowTo, question-style titles, raw-HTML readability   | robots.txt, llms.txt, crawl |
| How often does it publish?              | Published / modified dates per month, last 90 / 365 days, median gap                                              | article meta, JSON-LD       |
| What is it built with?                  | Generator meta and framework / platform fingerprints                                                              | crawl                       |

## Pipeline

```
crawl (seo-rea crawl, resumable)  ──►  report/crawl.json
robots.txt, llms.txt, llms-full.txt ──►  evidence E00x
Tranco / Wikipedia / Common Crawl   ──►  evidence E00x   (skip with --no-offpage)
                    │
                    ▼
        core/reverse/infer.ts (pure)  ──►  report/reverse.json + reverse.md
```

- **Crawl first.** Everything page-level comes from the crawler (robots.txt
  respected, polite delay, resumable). `--from-crawl <run>` reuses a crawl so
  the same data can be re-analysed for free; a weekly crawl can feed both
  `diff` and `reverse`.
- **Inference is pure.** `inferStrategy()` takes the crawl, AI-readiness
  results, off-page numbers and evidence ids, and returns the report. No I/O,
  so it is unit tested with synthetic pages.
- **Evidence.** E001 is a compact page table derived from the crawl (URL,
  template, title, H1, words, schema, date, stack); robots.txt, llms.txt,
  llms-full.txt and the off-page lookups are saved raw. Each summary line and
  playbook step lists the ids it rests on and is labelled `observed`
  (counted) or `inferred` (a reading of the counts), with a confidence.
- **Cost.** v1 calls no paid adapter: `cost.usd` is always 0. The DataForSEO
  budget (about $1.50/month) is reserved for v2 (below), opt-in with
  `--budget-usd` like the other commands.

## Heuristics and their limits

- Templates come from URL patterns first, JSON-LD second. A site with
  opaque URLs and no schema lands in `other`.
- Programmatic detection needs 10+ pages under one prefix. It strips the
  trailing `| Brand` before comparing titles. Entity pages (merchants, cards,
  locations) are left out of the topic list so entity names do not drown
  out real topics.
- Topics are what the site _writes about_, not what it ranks for. Rankings
  need SERP data (v2).
- Off-page proxies are weak: Tranco is a popularity rank, Wikipedia links
  are rare, Common Crawl counts index blocks. They are reported as such;
  there is no backlink index in free mode.
- Raw HTML only. JavaScript-only content is invisible, which is also what
  most AI crawlers see, and the report says so.
- A partial crawl (page limit) is flagged in `coverage` and `unknowns`, and
  confidence drops.

## Output

`report/reverse.json` (schema [reverse-schema.json](reverse-schema.json),
`npm run reverse-schema`), `report/reverse.md` with ten sections (strategy in
brief, topics, architecture, linking, authority, schema, AEO, cadence, stack,
playbook) plus unknowns, and `evidence/`. Sample:
[examples/reverse-cardpointers](../examples/reverse-cardpointers/report/reverse.md).

## CLI and MCP

```
seo-rea reverse <domain> [--out <dir>] [--max-pages 300] [--delay-ms 500]
                [--from-crawl <run>] [--no-offpage] [--force] [--json]
```

MCP tool `seo_reverse` takes the same inputs and returns the summary,
playbook and coverage.

## Roadmap

v2 (cheap, opt-in budget):

1. **Rankings per cluster.** For each cluster's top terms, one SERP check on
   the free engines (already in `strategy`) and, within budget, DataForSEO
   `ranked_keywords` for the domain (one call, about $0.01-0.02) to replace
   inferred topics with observed rankings.
2. **Sitemap `lastmod`** for cadence when pages carry no dates.
3. **Answer formatting.** Store H2/H3 text per page to measure question
   headings, definition-first paragraphs, lists and tables (AEO answer
   shapes).
4. **Two-domain mode** (`reverse a.com --vs b.com`): cluster-by-cluster gaps,
   reusing the `strategy` comparison renderer.
5. **History.** `diff` two reverse runs to see strategy shifts (new clusters,
   cadence change, new schema types). Needs stable ids on clusters and
   playbook steps, as `topActions` already have.
6. Optional rendered crawl (playwright-core) for JavaScript sites.
