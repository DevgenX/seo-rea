# Third-party notices

seo-rea is MIT licensed. All seo-rea source code is original. The projects
below informed its design or are used as dependencies. No code from GPL or
other copyleft projects is included.

## Design references (no code copied)

| Project                                                                               | License | What it informed                                                                                    |
| ------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| [morluto/rea](https://github.com/morluto/rea)                                         | MIT     | Evidence-first workflow, unknowns, CLI + MCP + skill layout, repository structure and quality gates |
| [Rachit8484/geoseo-mcp](https://github.com/Rachit8484/geoseo-mcp)                     | MIT     | LLM-citation logging and llms.txt tooling ideas                                                     |
| [maxaeo/maxaeo-ai-visibility-mcp](https://github.com/maxaeo/maxaeo-ai-visibility-mcp) | MIT     | AI-crawler check list                                                                               |
| [maxaeo/llms-txt-validator](https://github.com/maxaeo/llms-txt-validator)             | MIT     | llms.txt validation checks                                                                          |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)                 | MIT     | Splitting SEO work into agent skill steps                                                           |

## Runtime dependencies

| Package                                                                             | License |
| ----------------------------------------------------------------------------------- | ------- |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) | MIT     |
| [cheerio](https://github.com/cheeriojs/cheerio)                                     | MIT     |
| [zod](https://github.com/colinhacks/zod)                                            | MIT     |

## Optional dependencies (not bundled; installed by the user)

| Package                                                            | License    |
| ------------------------------------------------------------------ | ---------- |
| [playwright-core](https://github.com/microsoft/playwright)         | Apache-2.0 |
| [lighthouse](https://github.com/GoogleChrome/lighthouse)           | Apache-2.0 |
| [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher) | Apache-2.0 |

## Specifications

- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) Robots Exclusion Protocol
- [llmstxt.org](https://llmstxt.org/) llms.txt proposal
- [schema.org](https://schema.org/) vocabulary and Google Search Central
  structured data guidelines

Each dependency's full license text ships in its package under
`node_modules/<package>/LICENSE`.
