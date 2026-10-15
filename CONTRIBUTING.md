# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

## Setup

```sh
nvm use            # Node 22, see .nvmrc
npm ci
npm run typecheck && npm run lint && npm test && npm run build
```

Optional, for the browser paths: `npx playwright install chromium`.

## Layout

| Folder                   | What lives there                                             |
| ------------------------ | ------------------------------------------------------------ |
| `src/core`               | Types, evidence store, cache, budget, HTTP, report rendering |
| `src/adapters`           | One file per data source (`SourceAdapter`) and parsers       |
| `src/services`           | Commands that combine adapters and write evidence            |
| `src/mcp`                | MCP server and tool schemas                                  |
| `src/cli.ts`             | Argument parsing and command dispatch                        |
| `tests`                  | vitest suites and `fixtures/`                                |
| `.agents/skills/seo-rea` | The agent skill shipped in the package                       |

## Rules

- Tests never touch the network. Use fixtures and a fake fetcher (see
  `tests/helpers.ts`).
- New behaviour needs a test; bug fixes need a regression test.
- Every claim in a report must cite evidence IDs. If you cannot back a claim,
  add it to the unknowns instead.
- Free sources first. Paid sources must go through `BudgetGuard` and must
  refuse at a budget of 0.
- Be polite to sites: keep the rate limiter and robots.txt checks; do not add
  captcha solving or ways around bot protection.
- No secrets in code, tests, fixtures or examples.
- Write original code. Do not copy code from GPL or other copyleft projects.
  If you adapt MIT or Apache-2.0 code, add it to `THIRD_PARTY_NOTICES.md`.
- Format with `npm run format` before committing.

## Commits and pull requests

- Short, verb-first commit messages (`add ...`, `fix ...`, `update ...`).
- Fill in the pull request template, including how you tested.
- Add a line under "Unreleased" in `CHANGELOG.md` for user-visible changes.

## Adding a data source

See [docs/sources.md](docs/sources.md#adding-an-adapter).
