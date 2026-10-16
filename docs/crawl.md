# Site crawl

```
seo-rea crawl <domain> [--out <dir>] [--max-pages 500] [--max-depth 10] [--delay-ms 500] [--force] [--json]
```

Crawls a whole site, free, from your machine, and writes
`report/crawl.md` and `report/crawl.json` (schema
[crawl-schema.json](crawl-schema.json), `npm run crawl-schema` regenerates it).
It is the foundation the `diff` and `reverse` commands build on.

## How it crawls

- Starts at `https://<domain>/`, then queues every URL from the sitemaps
  listed in robots.txt (or `/sitemap.xml`, sitemap indexes followed, up to 50
  files). Links found while crawling are queued breadth-first.
- Scope: the same host, with or without `www.`. Assets and downloads (images,
  PDFs, CSS, JS, feeds) are skipped. Tracking parameters (`utm_*`, `gclid`,
  `fbclid`, ...) are stripped and query strings sorted, so one page is one URL.
  `rel="nofollow"` links are not followed.
- Obeys robots.txt for the `seo-rea` product token (falling back to `*`),
  with RFC 9309 longest-match rules. Blocked URLs are counted, never fetched.
- Polite: one request at a time per host, at least `--delay-ms` apart
  (default 500 ms), honest user agent, 20 s timeout, 3 MB body cap.
- Raw HTML only (no JavaScript), which is what most AI crawlers see.

## Resume

State lives in `<out>/data/`:

- `crawl-state.json`: queue, seen set, sitemap URLs, settings. Written
  atomically every 25 pages and at the end.
- `pages.jsonl`: one page record per line, appended as pages are fetched.

Rerunning the same command resumes where it stopped: fetched pages are not
fetched again. Ctrl-C stops after the current page and saves. A larger
`--max-pages` continues a crawl that hit the limit. `--force` starts over.
A state for another domain, from an incompatible version, or corrupt, fails
with `CRAWL_STATE_INVALID`. A torn last line in `pages.jsonl` is dropped and
that URL is fetched again.

## What it reports

Per page: status, final URL, depth, title, meta description, meta robots,
canonical, H1s, word count, lang, hreflang, JSON-LD types, internal links,
external domains, published/modified dates, stack fingerprints and a body
hash.

Site-wide: internal inlinks, click depth from the home page, internal
PageRank, and these rules. Every issue has a stable id
(`<RULE>:<hash of the URL or duplicate key>`), so `seo-rea diff` can match
issues between runs.

| Rule                                            | Severity | Fires when                                   |
| ----------------------------------------------- | -------- | -------------------------------------------- |
| `CRAWL-HTTP-4XX` / `CRAWL-HTTP-5XX`             | high     | an internal URL returns 4xx / 5xx            |
| `CRAWL-FETCH-ERROR`                             | medium   | the fetch failed (DNS, TLS, timeout)         |
| `CRAWL-REDIRECTED-LINK`                         | low      | internal links point to a URL that redirects |
| `CRAWL-NOINDEX-IN-SITEMAP`                      | high     | a sitemap URL is noindex                     |
| `CRAWL-SITEMAP-NOT-OK`                          | medium   | a sitemap URL redirects or is not 200        |
| `CRAWL-NOINDEX`                                 | low      | a page is noindex                            |
| `CRAWL-CANONICAL-ELSEWHERE`                     | low      | the canonical points to another URL          |
| `CRAWL-TITLE-MISSING`                           | high     | indexable page without a title               |
| `CRAWL-TITLE-DUPLICATE`                         | medium   | the same title on several indexable pages    |
| `CRAWL-TITLE-LONG`                              | low      | title over 65 characters                     |
| `CRAWL-META-DESCRIPTION-MISSING` / `-DUPLICATE` | low      | missing / repeated description               |
| `CRAWL-H1-MISSING`                              | medium   | no H1                                        |
| `CRAWL-H1-MULTIPLE`                             | low      | more than one H1                             |
| `CRAWL-THIN-CONTENT`                            | medium   | under 200 words in raw HTML                  |
| `CRAWL-DUPLICATE-CONTENT`                       | medium   | identical body text on several URLs          |
| `CRAWL-DEEP-PAGE`                               | low      | more than 3 clicks from the home page        |
| `CRAWL-ORPHAN`                                  | medium   | indexable page no crawled page links to      |
| `CRAWL-NOT-IN-SITEMAP`                          | low      | indexable page missing from the sitemap      |
| `CRAWL-BLOCKED-LINKED`                          | low      | a robots-blocked URL is linked internally    |
| `CRAWL-LANG-MISSING`                            | low      | `<html>` without `lang`                      |

Content rules only run on indexable pages (200 HTML, not noindex, canonical
absent or self).

Sample: [examples/cardlab-crawl](../examples/cardlab-crawl/report/crawl.md).
