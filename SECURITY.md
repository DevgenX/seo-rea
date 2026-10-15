# Security policy

## Supported versions

Only the latest minor release gets fixes.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | yes       |
| < 0.2   | no        |

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability
reporting on this repository (Security tab, "Report a vulnerability"). Include
the version, steps to reproduce and the impact. You should get a reply within
7 days.

## What seo-rea does with data

- It reads credentials only from environment variables (`PSI_API_KEY`,
  `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`). It never writes them to evidence,
  cache files, logs or reports. `doctor` reports whether a key is set, not its
  value. The PageSpeed key is sent as a request header, not in the URL.
- Evidence, cache and ledger files are written only under the folders you
  pass (`--out`, `--cache-dir`, `--ledger`) or `./.seo-rea` and
  `./seo-rea-runs` by default.
- When a results page redirects to a block page, the requested URL is
  recorded instead of the redirect, because block-page URLs can contain tokens
  derived from the caller's IP address.
- The MCP server runs on stdio only and opens no ports.
- `seo_read_evidence` only reads IDs that match `E` followed by digits from the
  run's evidence index.

## Scope

In scope: secret leakage, path traversal through tool inputs, code execution
from fetched content, budget-guard bypasses that cause paid calls at 0 USD.

Out of scope: sites blocking seo-rea, captchas, rate limits by search engines.
