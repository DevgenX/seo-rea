# AGENTS.md

Instructions for coding agents working in this repository.

## Gates

Run before you finish:

```sh
npm run typecheck && npm run lint && npm test && npm run build
```

`npm run format` fixes formatting. `npm pack --dry-run` must list only `dist/`,
`.agents/skills/seo-rea/`, `server.json`, `llms.txt`, `README.md`,
`CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `LICENSE` and
`package.json`.

## Code

- TypeScript strict with `exactOptionalPropertyTypes` and
  `noUncheckedIndexedAccess`. ESM, NodeNext imports with `.js` suffixes.
- Keep files under 500 lines (oxlint warns).
- Network goes through `ctx.fetch` (`src/core/http.ts`): rate limited per host,
  cached, never throws. Browser work goes through `BrowserSession`.
- Adapters return data. Services write evidence. Reports only render what is
  in the run data.
- Every report claim carries evidence IDs; anything unproven goes to unknowns.
- Paid calls must pass `BudgetGuard.check` first.
- The MCP server must never write to stdout except through the transport.

## Tests

- vitest, no network. Use `tests/fixtures/` and the fake fetcher in
  `tests/helpers.ts`.
- Add a regression test with every bug fix.

## Do not

- Commit secrets, raw HTML or screenshots from `examples/` (gitignored).
- Add captcha solving or bot-protection workarounds.
- Copy code from GPL or other copyleft projects.
- Edit `dist/` by hand.

## Using seo-rea as a tool

See `.agents/skills/seo-rea/SKILL.md`.
