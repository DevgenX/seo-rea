# MCP server

`seo-rea mcp` starts a Model Context Protocol server on stdio. Logs go to
stderr; stdout carries the protocol. Inputs are validated with zod. Every tool
returns JSON both as text and as `structuredContent`, with evidence IDs where
files were written. Errors come back as tool results with `isError: true`.

Registry name: `io.github.devgenx/seo-rea` ([server.json](../server.json)).

When a tool takes an optional `out` and none is given, files go to
`./seo-rea-runs/<name>` under the server's working directory.

## Tools

### seo_teardown

Full teardown for a keyword and target domain.

| Input          | Type                                  | Default                             |
| -------------- | ------------------------------------- | ----------------------------------- |
| `keyword`      | string                                | required                            |
| `target`       | string                                | required                            |
| `out`          | string                                | `./seo-rea-runs/<keyword>-<target>` |
| `budgetUsd`    | number 0-50                           | 0                                   |
| `top`          | integer 1-20                          | 8                                   |
| `crawl`        | integer 1-50                          | 10                                  |
| `serpUrls`     | URL[]                                 | none                                |
| `engines`      | `google` \| `bing` \| `duckduckgo` [] | all three                           |
| `browser`      | boolean                               | true                                |
| `psi`          | boolean                               | true                                |
| `adlibCapture` | boolean                               | false                               |

Returns `reportPath`, `evidenceIndex`, `runId`, `spentUsd`, `serp` (primary,
attempts, organic), `competitors`, `aiReadiness`, `keywordGap` (top 15),
`claims` (finding ledger) and `unknowns`. Replaces a previous run in `out`.

### seo_audit_page

`{ url, out? }`. Fetches one URL without JavaScript. Returns `evidenceId`,
HTTP `status`, and the page summary including `schema` (blocks, parse errors,
per-node errors and warnings).

### seo_check_ai_readiness

`{ domain, out?, psi? }`. AI-crawler access, `/llms.txt`, `/llms-full.txt`,
homepage schema, PageSpeed Insights. Writes `report/audit.md`. Returns
`aiReadiness`, `schema`, `pageEvidenceId`, `unknowns`.

### seo_keyword_gap

`{ competitors, targets, limit? }`. Each list item is a URL to fetch or
`{ url, text, title? }` to use as-is. Returns ranked phrases with
`competitors`, `tfidf`, `score`, `words`, `urls`.

### seo_log_citation

`{ out, engine, prompt, urls, note? }`. Records an AI answer's cited URLs as
evidence; re-renders the teardown in `out` if present. Returns `evidenceId`,
`citation`, `reportUpdated`.

### seo_adlib_lookup

`{ domain?, brand?, url? }`. Lookup URLs for Google Ads Transparency Center,
Meta Ad Library and LinkedIn Ad Library. App Store and Google Play URLs resolve
to the app's brand.

### seo_read_evidence

`{ out, id?, maxChars? }`. Without `id`, lists the evidence index. With `id`
(`E001`..), returns the item and its content (text, truncated to `maxChars`).

## Testing it

```sh
npx @modelcontextprotocol/inspector npx -y seo-rea mcp
```
