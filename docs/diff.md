# Run diff

```
seo-rea diff <older-run> <newer-run> [--out <dir>] [--json]
```

Compares two runs of the same command for the same domain and says what
changed. Works for `crawl`, `audit`, `teardown` and `strategy` runs. Pass run
folders (the `report/<kind>.json` inside is found) or the JSON files. Without
`--out` the Markdown goes to stdout; with `--out` it writes
`report/diff.md` and `report/diff.json` (schema
[diff-schema.json](diff-schema.json), `npm run diff-schema`).

Findings are matched by their stable issue id (see
[error-codes.md](error-codes.md#issue-ids)), never by wording.

| Status          | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `fixed`         | in the older run, gone from the newer one                                                        |
| `new`           | only in the newer run                                                                            |
| `regressed`     | in both, and the severity went up or more pages are involved (e.g. a duplicate-title group grew) |
| `improved`      | in both, severity down or fewer pages involved                                                   |
| `unchanged`     | in both, same severity and size                                                                  |
| `not-rechecked` | crawl only: the issue's pages were not crawled in the newer run, so it is not counted as fixed   |

Also reported: metric deltas (pages crawled, indexable pages, issues by
severity; PageSpeed scores, blocked AI crawlers and schema errors for
dossiers) and per-rule count changes.

Caveat for `audit`, `teardown` and `strategy`: those reports keep only the
top 10 actions, so an action that left the list may have been pushed out by
a bigger one. The diff says so in its notes.

Errors: different kinds or domains fail with `DIFF_INCOMPATIBLE` (exit 2);
a missing run with `NOT_FOUND`.

Weekly use (the Desk's Monday audit):

```sh
seo-rea crawl example.com --out runs/2026-10-19 --max-pages 2000
seo-rea diff runs/2026-10-12 runs/2026-10-19 --out runs/diff-2026-10-19
```

Sample: [examples/cardlab-diff](../examples/cardlab-diff/report/diff.md).
