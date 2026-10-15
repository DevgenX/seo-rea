import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HELP, UsageError, parseCli, parseEngines } from "../src/cli.js";
import { VERSION } from "../src/version.js";

describe("CLI parsing", () => {
  it("parses teardown with v0.1 flags and defaults", () => {
    const c = parseCli([
      "teardown",
      "--keyword",
      "credit card rewards app",
      "--target",
      "getcardlab.app",
      "--out",
      "examples/x",
      "--budget-usd",
      "0",
      "--top",
      "5",
      "--crawl",
      "3",
      "--engines",
      "bing,duckduckgo",
      "--serp-urls",
      "https://a.com/x,https://b.com/y",
      "--serp-html",
      "a.html",
      "--serp-html",
      "b.html",
      "--force",
    ]);
    expect(c.command).toBe("teardown");
    if (c.command !== "teardown") return;
    expect(c.options).toMatchObject({
      keyword: "credit card rewards app",
      budgetUsd: 0,
      top: 5,
      crawl: 3,
      engines: ["bing", "duckduckgo"],
      serpUrls: ["https://a.com/x", "https://b.com/y"],
      browser: true,
      psi: true,
      adlibCapture: false,
      delayMs: 3000,
      force: true,
      monthlyCapUsd: Infinity,
    });
    expect(c.options.serpHtml).toHaveLength(2);
  });

  it("parses switches and other commands", () => {
    const c = parseCli([
      "teardown",
      "--keyword",
      "k",
      "--target",
      "t.com",
      "--out",
      "o",
      "--no-browser",
      "--no-psi",
      "--adlib-capture",
      "--engines",
      "none",
    ]);
    expect(
      c.command === "teardown" && [c.options.browser, c.options.psi, c.options.adlibCapture, c.options.engines],
    ).toEqual([false, false, true, []]);
    expect(parseCli(["audit", "https://www.a.com/x", "--no-psi"])).toMatchObject({
      command: "audit",
      target: "https://www.a.com/x",
      psi: false,
    });
    expect(parseCli(["cite", "--out", "o", "--engine", "chatgpt", "--prompt", "p"])).toMatchObject({
      command: "cite",
      urls: "",
    });
    expect(parseCli(["mcp"])).toEqual({ command: "mcp" });
    expect(parseCli(["doctor", "--json"])).toEqual({ command: "doctor", json: true });
    expect(parseCli([])).toEqual({ command: "help" });
    expect(parseCli(["--version"])).toEqual({ command: "version" });
  });

  it("rejects bad input", () => {
    expect(() => parseCli(["teardown", "--keyword", "k"])).toThrow(UsageError);
    expect(() => parseCli(["teardown", "--keyword", "k", "--target", "t", "--out", "o", "--top=-1"])).toThrow(
      /non-negative/,
    );
    expect(() =>
      parseCli(["teardown", "--keyword", "k", "--target", "t", "--out", "o", "--serp-urls", "nope"]),
    ).toThrow(/no valid/);
    expect(() => parseCli(["teardown", "--bogus"])).toThrow();
    expect(() => parseCli(["audit"])).toThrow(/domain or URL/);
    expect(() => parseCli(["cite", "--out", "o"])).toThrow(/cite needs/);
    expect(() => parseCli(["frobnicate"])).toThrow(/unknown command/);
    expect(() => parseEngines("google,yahoo")).toThrow(/unknown engine "yahoo"/);
  });

  it("documents every command", () => {
    for (const c of ["teardown", "audit", "cite", "mcp", "doctor", "strategy", "<domain>"])
      expect(HELP).toContain(`seo-rea ${c}`);
  });

  it("routes a bare domain to strategy with defaults", () => {
    const c = parseCli(["cardpointers.com"]);
    expect(c.command).toBe("strategy");
    if (c.command !== "strategy") return;
    expect(c.options).toMatchObject({
      domain: "cardpointers.com",
      vs: null,
      budgetUsd: 0,
      crawl: 30,
      terms: 10,
      browser: true,
      json: false,
    });
    expect(c.options.out).toMatch(/seo-rea-runs\/strategy-cardpointers\.com$/);
  });

  it("parses strategy flags, --vs and the explicit subcommand", () => {
    const c = parseCli([
      "https://www.getcardlab.app/",
      "--vs",
      "cardpointers.com",
      "--out",
      "o",
      "--force",
      "--json",
      "--budget-usd",
      "0",
      "--crawl",
      "12",
      "--terms",
      "6",
      "--engines",
      "bing",
    ]);
    expect(c.command === "strategy" && c.options).toMatchObject({
      domain: "getcardlab.app",
      vs: "cardpointers.com",
      force: true,
      json: true,
      crawl: 12,
      terms: 6,
      engines: ["bing"],
    });
    const d = parseCli(["strategy", "nerdwallet.com", "--vs", "www.bankrate.com"]);
    expect(d.command === "strategy" && d.options.out).toMatch(/strategy-nerdwallet\.com-vs-bankrate\.com$/);
  });

  it("rejects bad strategy input", () => {
    expect(() => parseCli(["strategy"])).toThrow(/needs a domain/);
    expect(() => parseCli(["a.com", "--vs", "a.com"])).toThrow(/different domain/);
    expect(() => parseCli(["a.com", "b.com"])).toThrow(/unexpected argument/);
    expect(() => parseCli(["a.com", "--keyword", "x"])).toThrow();
    expect(() => parseCli(["a.com", "--vs", "nodot"])).toThrow(/--vs needs a domain/);
  });
});

describe("package metadata", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as Record<string, unknown>;
  const server = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8")) as {
    name: string;
    version: string;
    packages: Array<{
      identifier: string;
      version: string;
      transport: { type: string };
      packageArguments: Array<{ value: string }>;
    }>;
  };

  it("keeps version, mcpName and server.json in sync", () => {
    expect(pkg.version).toBe(VERSION);
    expect(server.name).toBe(pkg.mcpName);
    expect(server.version).toBe(VERSION);
    expect(server.packages[0]).toMatchObject({ identifier: pkg.name, version: VERSION, transport: { type: "stdio" } });
    expect(server.packages[0]?.packageArguments[0]?.value).toBe("mcp");
  });
});
