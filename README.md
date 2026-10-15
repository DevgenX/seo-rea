# seo-rea

Reverse engineer why pages rank. `seo-rea` is an agent skill plus a small CLI
that builds an evidence-first SEO teardown for a keyword and a target domain:
who ranks, what their pages have in common, which phrases the target is
missing, where to check competitor ads, and which pages AI answers cite.

Free sources come first. Paid data (DataForSEO) is optional, capped and off by
default.

## Requirements

Node 22 or later. No runtime dependencies.

```sh
git clone <this repo> && cd seo-rea
npm link            # optional: puts `seo-rea` on your PATH
npm test            # offline unit tests
```

## Usage

```sh
seo-rea teardown --keyword "credit card rewards app" --target getcardlab.app \
  --out ./examples/cardlab-teardown --budget-usd 0
```

What it does:

1. Fetches the SERP from DuckDuckGo HTML, Bing HTML and Google, in that order,
   with an honest user agent and at most one request per host every 1.5 s.
   Blocked pages (captcha, JavaScript wall) and bot-degraded results are
   detected, recorded and not used.
2. Fetches the top ranking pages (robots.txt respected) and parses title, meta
   description, H1-H3, word count, JSON-LD types, canonical, hreflang, internal
   links and anchors.
3. Reads the target's robots.txt and sitemap, and crawls up to 10 pages.
4. Computes a keyword gap: phrases used by 2+ ranking pages and absent from the
   target.
5. Records Google Ads Transparency, Meta Ad Library and LinkedIn Ad Library
   lookups as manual-check evidence.
6. Writes `evidence/` (E001.. + `index.md`), `report/questions.md`,
   `report/ledger.md` and `report/teardown.md`.

If no free SERP is usable, search in a browser and feed it in:

```sh
seo-rea teardown ... --serp-html ~/Downloads/google-serp.html
seo-rea teardown ... --serp-urls "https://a.com/x,https://b.com/y"
```

Log AI-answer citations (no network calls; the report updates):

```sh
seo-rea cite --out ./examples/cardlab-teardown --engine chatgpt \
  --prompt "best credit card rewards app" --urls "https://a.com/x,https://b.com/y"
```

Run `seo-rea help` for all options.

## Paid data (optional)

Set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` in your environment and pass
`--budget-usd` above 0. Every call is cached and logged to
`.seo-rea/ledger.csv`; calls that would exceed the run budget or
`--monthly-cap-usd` are refused before any money is spent. At budget 0 no paid
call is made. Never commit credentials; `.env`, the cache and the ledger are
git-ignored.

## Agent skill

The skill lives in [.agents/skills/seo-rea/SKILL.md](.agents/skills/seo-rea/SKILL.md)
with references for [sources](.agents/skills/seo-rea/references/sources.md),
the [evidence workflow](.agents/skills/seo-rea/references/evidence-workflow.md)
and [budget and cache](.agents/skills/seo-rea/references/budget-and-cache.md).
Copy or symlink the folder into your agent's skills directory.

## Limits

- Pages are parsed without running JavaScript.
- Free SERP engines rate limit or degrade automated requests; results vary by
  IP, time and locale. The SERP map states what was actually used.
- No search volume, backlinks or AI Overview data on the free tier.
- The tool writes drafts only. It never sends outreach, buys ads or publishes
  changes.

## Example

[examples/cardlab-teardown](examples/cardlab-teardown/report/teardown.md) is a
real run. Raw third-party HTML is not committed; parsed evidence and the
reports are.

## Credits

The structure (an agent skill with references, plus a CLI that produces
evidence with IDs, a finding ledger and stated search boundaries) is modelled
on [morluto/rea](https://github.com/morluto/rea), the reverse-engineer-anything
skill and toolkit, released under the MIT License. seo-rea reuses the workflow
pattern only, not its code.

## License

MIT. Copyright (c) 2026 DevgenX. See [LICENSE](LICENSE).
