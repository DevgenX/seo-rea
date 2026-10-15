# Sources and adapters

Every data source is an adapter that implements `SourceAdapter` (see
`src/core/types.ts`): an id, a category, whether it is paid, an
`available()` check and a `run()` method. Free adapters run first. Paid
adapters go through the budget guard before any request.

| Adapter                  | Category     | Paid | Needs                                                     |
| ------------------------ | ------------ | ---- | --------------------------------------------------------- |
| `serp-playwright`        | SERP         | no   | `playwright-core` + Chromium                              |
| `serp-html`              | SERP         | no   | -                                                         |
| `serp-urls`, `serp-file` | SERP         | no   | operator input                                            |
| `page-fetch`             | page         | no   | -                                                         |
| `schema`                 | schema       | no   | -                                                         |
| `robots-sitemap`         | site         | no   | -                                                         |
| `ai-readiness`           | AI readiness | no   | -                                                         |
| `pagespeed-insights`     | performance  | no   | optional `PSI_API_KEY`                                    |
| `lighthouse-local`       | performance  | no   | `lighthouse` + `chrome-launcher`                          |
| `adlib-urls`             | ads          | no   | -                                                         |
| `adlib-playwright`       | ads          | no   | `playwright-core` + Chromium                              |
| `keyword-gap`            | keywords     | no   | -                                                         |
| `cite`                   | citations    | no   | operator input                                            |
| `dataforseo`             | paid         | yes  | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, budget above 0 |

Run `seo-rea doctor` to see which are available.

Detailed behaviour, limits and the schema rule table live in the skill
reference: [.agents/skills/seo-rea/references/sources.md](../.agents/skills/seo-rea/references/sources.md).

## Politeness

- One request at a time per host, at least `--delay-ms` apart (default 3 s;
  search engines and ad libraries never under 3 s).
- Pages: honest user agent `seo-rea/<version> (+https://github.com/DevgenX/seo-rea; polite research bot)`;
  robots.txt checked for the `seo-rea` token before fetching.
- Browser: the real Chromium version in a desktop user agent; one navigation
  per engine or ad library; cookie banners rejected where a reject button
  exists; captchas are never solved, only recorded.
- Responses over 3 MB are truncated; requests time out after 15 s.

## Adding an adapter

1. Create `src/adapters/<name>.ts` exporting an object or factory that
   implements `SourceAdapter<Input, Output>`.
2. Keep network access behind `ctx.fetch` (rate limited, cached, never throws)
   or the shared `BrowserSession`.
3. Write evidence in the service that calls it (`src/services/`), not in the
   adapter.
4. Add fixtures under `tests/fixtures/` and tests that run without network.
5. List it in `src/services/doctor.ts` and in this table.
