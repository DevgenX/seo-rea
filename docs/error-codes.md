# Error codes

Every failure carries a stable code. Codes are never renamed or reused; new
ones are added at the end. Source of truth: `src/core/errors.ts`.

- **CLI**: stderr gets `seo-rea: [CODE] message` and a `hint:` line. With
  `--json`, stdout gets the payload below. The exit code is in the table.
- **MCP**: failed tool calls return `isError: true` with
  `{ "error": "<message>", "code": "<CODE>", "hint": "<hint>" }`.

```json
{ "error": { "code": "RUN_EXISTS", "message": "...", "hint": "...", "exitCode": 1 } }
```

JSON Schema: [error-contract.schema.json](error-contract.schema.json)
(`npm run error-schema` regenerates it).

| Code                  | Exit | Meaning                                                               | What to do                                                               |
| --------------------- | ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `USAGE`               | 2    | Bad command line arguments.                                           | Run `seo-rea help` for the syntax.                                       |
| `INVALID_INPUT`       | 2    | An input file or value is malformed (sites file, domain, run folder). | Fix the input named in the message and run again.                        |
| `RUN_EXISTS`          | 1    | The output folder already holds a run.                                | Pass `--force` to replace it, or choose another `--out`.                 |
| `BUDGET_REFUSED`      | 1    | A paid call was refused by the run or monthly budget.                 | Raise `--budget-usd` / `--monthly-cap-usd`, or rely on the free sources. |
| `SCHEMA_INVALID`      | 1    | A report or data file does not match its published JSON Schema.       | Regenerate the file.                                                     |
| `NOT_FOUND`           | 1    | A referenced file, run or evidence item does not exist.               | Check the path or id in the message.                                     |
| `FETCH_FAILED`        | 1    | The target could not be fetched at all.                               | Check the domain is reachable; retry later.                              |
| `CRAWL_STATE_INVALID` | 1    | A saved crawl state cannot be resumed.                                | Start a fresh crawl with `--force`.                                      |
| `DIFF_INCOMPATIBLE`   | 2    | The two runs cannot be compared.                                      | Diff two runs of the same command for the same domain.                   |
| `DEPENDENCY_MISSING`  | 1    | An optional dependency or credential is missing.                      | Run `seo-rea doctor`.                                                    |
| `INTERNAL`            | 1    | Unexpected internal error.                                            | Open an issue with the command and the message.                          |

# Issue ids

Every action in `topActions` (and every crawl issue) has an `id` such as
`TECH-ROBOTS-BLOCKS-ALL` or `PERF-SCORE-LOW:3f2a9c1e`. The part before `:`
is the rule code; the optional 8-hex suffix is a hash of the rule's subject
(a URL, a term, a form factor). Ids contain no run-specific data, so the same
problem keeps the same id across runs. Pattern:
`^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+(:[a-f0-9]{8})?$`.

| Prefix      | Area                                                   |
| ----------- | ------------------------------------------------------ |
| `TECH-`     | Crawlability, robots, sitemaps, rendering              |
| `ONPAGE-`   | Titles, meta, headings                                 |
| `SCHEMA-`   | Structured data                                        |
| `AEO-`      | AI search readiness (llms.txt, AI crawlers, citations) |
| `PERF-`     | PageSpeed / Core Web Vitals                            |
| `CONTENT-`  | Depth and coverage vs ranking pages                    |
| `PAID-`     | Ads                                                    |
| `STRATEGY-` | Strategy dossier steps                                 |
| `CRAWL-`    | Site crawl issues (`seo-rea crawl`)                    |
