import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { EvidenceStore } from "../src/core/evidence.js";
import { createServer } from "../src/mcp/server.js";
import { tmp } from "./helpers.js";

async function connect() {
  const server = createServer({ runsDir: await tmp(), runtime: { browser: false } });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe("MCP server", () => {
  it("lists every tool with an input schema", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).toSorted()).toEqual([
      "seo_adlib_lookup",
      "seo_audit_page",
      "seo_check_ai_readiness",
      "seo_crawl",
      "seo_diff",
      "seo_keyword_gap",
      "seo_log_citation",
      "seo_read_evidence",
      "seo_strategy",
      "seo_teardown",
    ]);
    const td = tools.find((t) => t.name === "seo_teardown");
    expect(td?.inputSchema.required).toEqual(expect.arrayContaining(["keyword", "target"]));
    expect(JSON.stringify(td?.inputSchema)).toContain("budgetUsd");
    await client.close();
  });

  it("returns structured JSON from offline tools", async () => {
    const client = await connect();
    const r = await client.callTool({
      name: "seo_adlib_lookup",
      arguments: { url: "https://apps.apple.com/us/app/maxrewards-credit-card-rewards/id1435710443" },
    });
    const data = r.structuredContent as { advertiser: { brand: string }; lookups: unknown[] };
    expect(data.advertiser.brand).toBe("maxrewards");
    expect(data.lookups).toHaveLength(3);

    const gap = await client.callTool({
      name: "seo_keyword_gap",
      arguments: {
        competitors: [
          { url: "a", text: "points tracking app" },
          { url: "b", text: "points tracking tool" },
        ],
        targets: [{ url: "t", text: "cards" }],
      },
    });
    expect((gap.structuredContent as { gap: Array<{ phrase: string }> }).gap[0]?.phrase).toBe("points tracking");

    const out = await tmp();
    const cite = await client.callTool({
      name: "seo_log_citation",
      arguments: { out, engine: "perplexity", prompt: "best app", urls: ["https://a.com/x"] },
    });
    expect((cite.structuredContent as { evidenceId: string }).evidenceId).toBe("E001");
    const ev = await client.callTool({ name: "seo_read_evidence", arguments: { out, id: "E001" } });
    expect((ev.structuredContent as { content: string }).content).toContain("perplexity");
    const list = await client.callTool({ name: "seo_read_evidence", arguments: { out } });
    expect((list.structuredContent as { count: number }).count).toBe(1);
    expect((await new EvidenceStore(out).load()).items).toHaveLength(1);
    await client.close();
  });

  it("reports errors as tool errors and validates input", async () => {
    const client = await connect();
    const bad = await client.callTool({ name: "seo_read_evidence", arguments: { out: await tmp(), id: "E999" } });
    expect(bad.isError).toBe(true);
    const invalid = await client.callTool({
      name: "seo_log_citation",
      arguments: { out: "x", engine: "bard", prompt: "p", urls: [] },
    });
    expect(invalid.isError).toBe(true);
    await client.close();
  });
});
