# Client configuration

All clients start the same stdio server: `npx -y seo-rea mcp`.

To enable the headless-browser SERP path and ad-library screenshots, run
`npx playwright install chromium` once and start the server with
`playwright-core` available:

```
npx -y -p seo-rea -p playwright-core seo-rea mcp
```

Optional environment variables: `PSI_API_KEY` (free PageSpeed Insights key),
`DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` (paid; only used when a tool call
sets `budgetUsd` above 0). Set them in your shell or in the client's `env`
block. Never put them in a file you commit.

## Claude Code

```sh
claude mcp add seo-rea -- npx -y seo-rea mcp
# with the browser path and a PageSpeed key from your shell:
claude mcp add seo-rea -e PSI_API_KEY="$PSI_API_KEY" -- npx -y -p seo-rea -p playwright-core seo-rea mcp
```

## Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seo-rea": { "command": "npx", "args": ["-y", "seo-rea", "mcp"] }
  }
}
```

## Cursor

`.cursor/mcp.json` in the project (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "seo-rea": { "command": "npx", "args": ["-y", "seo-rea", "mcp"] }
  }
}
```

## Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.seo-rea]
command = "npx"
args = ["-y", "seo-rea", "mcp"]
```

## VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "seo-rea": { "type": "stdio", "command": "npx", "args": ["-y", "seo-rea", "mcp"] }
  }
}
```

## Grok Bot

Add a custom MCP server in Grok Bot's settings (connectors) with:

- Transport: stdio
- Command: `npx`
- Arguments: `-y seo-rea mcp`

Menu names differ between versions; any client that can launch a stdio MCP
server works the same way.

## Troubleshooting

- `seo-rea doctor` lists which adapters can run in the current environment.
- The server writes logs to stderr. If a client shows nothing, run
  `npx -y seo-rea mcp` in a terminal; it should print
  `seo-rea: MCP server 0.2.0 ready on stdio` and wait.
- Output folders are relative to the server's working directory unless a tool
  call passes `out`.
