import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DataForSEO } from "../src/adapters/dataforseo.js";
import { BudgetError, BudgetGuard, appendLedger, readLedger, splitCsvLine } from "../src/core/budget.js";
import { Cache, DAY_MS, cacheKey } from "../src/core/cache.js";
import { EvidenceStore, formatEvidenceId } from "../src/core/evidence.js";
import { RateLimiter, createFetcher, isHtml } from "../src/core/http.js";
import { median } from "../src/core/util.js";
import { html, noNetwork, tmp } from "./helpers.js";

describe("cache", () => {
  it("honours TTL and spans month boundaries", async () => {
    const dir = await tmp();
    let now = new Date("2026-01-31T12:00:00Z");
    const c = new Cache(dir, { now: () => now });
    await c.set("serp", "q", { body: "x" });
    now = new Date("2026-02-03T12:00:00Z");
    expect(await c.get<{ body: string }>("serp", "q", 7 * DAY_MS)).toEqual({ body: "x" });
    now = new Date("2026-02-09T12:00:00Z");
    expect(await c.get("serp", "q", 7 * DAY_MS)).toBeNull();
    expect(await c.get("serp", "other", 7 * DAY_MS)).toBeNull();
    expect(await new Cache(dir, { disabled: true }).get("serp", "q", 99 * DAY_MS)).toBeNull();
    expect(cacheKey("a", "b")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("does not write when disabled", async () => {
    const dir = await tmp();
    const c = new Cache(dir, { disabled: true });
    await c.set("s", "q", 1);
    expect(await new Cache(dir).get("s", "q", DAY_MS)).toBeNull();
  });
});

describe("evidence store", () => {
  it("numbers items E001.. and continues from disk", async () => {
    const dir = await tmp();
    const ev = await new EvidenceStore(dir, { now: () => new Date("2026-10-14T00:00:00Z") }).load();
    const a = await ev.add({ source: "SERP Bing", url: "https://bing.com", ext: "html", content: "<html></html>" });
    const b = await ev.add({ source: "adlib", kind: "manual-check", content: { x: 1 } });
    expect([a.id, a.file, b.id]).toEqual(["E001", "E001-serp-bing.html", "E002"]);
    expect(a.fetchedAt).toBe("2026-10-14T00:00:00.000Z");
    const again = await new EvidenceStore(dir).load();
    expect(again.nextId()).toBe("E003");
    const md = await readFile(join(dir, "evidence", "index.md"), "utf8");
    expect(md).toMatch(/\| E002 \| adlib \| manual-check \|/);
    expect(formatEvidenceId(1234)).toBe("E1234");
  });

  it("reads items back and rejects bad ids", async () => {
    const dir = await tmp();
    const ev = await new EvidenceStore(dir).load();
    await ev.add({ source: "a", ext: "txt", content: "x".repeat(50) });
    await ev.add({ source: "shot", ext: "png", content: Buffer.from([1, 2, 3]) });
    expect(await ev.read("E001", 10)).toMatchObject({ content: "x".repeat(10), truncated: true });
    expect((await ev.read("E002")).content).toMatch(/binary image/);
    await expect(ev.read("../etc")).rejects.toThrow(/invalid evidence id/);
    await expect(ev.read("E009")).rejects.toThrow(/not found/);
  });
});

const OCT14 = (): Date => new Date("2026-10-14T00:00:00Z");

describe("budget", () => {
  it("round-trips the ledger CSV with quoted queries", async () => {
    const path = join(await tmp(), "ledger.csv");
    await appendLedger(path, {
      date: "2026-10-01T00:00:00Z",
      runId: "r1",
      source: "serp",
      query: '{"keyword":"a, \\"b\\""}',
      usd: 0.002,
    });
    await appendLedger(path, { date: "2026-10-02T00:00:00Z", runId: "r2", source: "serp", query: "x", usd: 0.01 });
    const rows = await readLedger(path);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.query).toBe('{"keyword":"a, \\"b\\""}');
    expect(rows[1]?.usd).toBe(0.01);
    expect(splitCsvLine('"a,b",c,"d""e"')).toEqual(["a,b", "c", 'd"e']);
    expect(await readLedger(join(await tmp(), "missing.csv"))).toEqual([]);
  });

  it("refuses every paid call when the cap is 0", async () => {
    const g = new BudgetGuard({ runCapUsd: 0, monthlyCapUsd: Infinity }, join(await tmp(), "l.csv"), "r");
    expect(g.enabled).toBe(false);
    await expect(g.check("dataforseo", 0.001)).rejects.toBeInstanceOf(BudgetError);
    await expect(g.check("dataforseo", 0)).rejects.toThrow(/budget is 0/);
  });

  it("refuses calls that would exceed run or monthly caps", async () => {
    const path = join(await tmp(), "l.csv");
    await appendLedger(path, { date: "2026-10-01T00:00:00Z", runId: "old", source: "s", query: "q", usd: 0.9 });
    await appendLedger(path, { date: "2026-10-14T00:00:00Z", runId: "r", source: "s", query: "q", usd: 0.05 });
    const g = new BudgetGuard({ runCapUsd: 0.06, monthlyCapUsd: 10 }, path, "r", OCT14);
    await expect(g.check("s", 0.02)).rejects.toThrow(/run budget/);
    const m = new BudgetGuard({ runCapUsd: 5, monthlyCapUsd: 1 }, path, "r", OCT14);
    await expect(m.check("s", 0.1)).rejects.toThrow(/monthly cap/);
    await expect(m.check("s", 0.01)).resolves.toBeUndefined();
    const spent = await m.spent();
    expect(spent.run).toBeCloseTo(0.05);
    expect(spent.month).toBeCloseTo(0.95);
  });

  it("DataForSEO never touches the network at budget 0 or without creds", async () => {
    const ledger = join(await tmp(), "l.csv");
    const creds = { DATAFORSEO_LOGIN: "user", DATAFORSEO_PASSWORD: "pass" };
    const zero = new DataForSEO(
      new BudgetGuard({ runCapUsd: 0, monthlyCapUsd: Infinity }, ledger, "r"),
      undefined,
      creds,
      noNetwork,
    );
    expect(zero.enabled).toBe(false);
    await expect(zero.serp("kw")).rejects.toBeInstanceOf(BudgetError);
    const noCreds = new DataForSEO(
      new BudgetGuard({ runCapUsd: 1, monthlyCapUsd: Infinity }, ledger, "r"),
      undefined,
      {},
      noNetwork,
    );
    expect(noCreds.enabled).toBe(false);
    await expect(noCreds.serp("kw")).rejects.toThrow(/not set/);
    expect(await readLedger(ledger)).toEqual([]);
  });

  it("DataForSEO logs cost, caches and parses results", async () => {
    const dir = await tmp();
    const ledger = join(dir, "l.csv");
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls++;
      const items = [
        { type: "paid", url: "https://ad.com", title: "Ad" },
        { type: "organic", url: "https://a.com", title: "A", description: "d" },
        { type: "people_also_ask" },
      ];
      return new Response(JSON.stringify({ status_code: 20000, cost: 0.002, tasks: [{ result: [{ items }] }] }));
    };
    const dfs = new DataForSEO(
      new BudgetGuard({ runCapUsd: 1, monthlyCapUsd: Infinity }, ledger, "r"),
      new Cache(join(dir, "c")),
      { DATAFORSEO_LOGIN: "u", DATAFORSEO_PASSWORD: "p" },
      fetchImpl,
    );
    const r = await dfs.serp("kw");
    expect(r.organic).toEqual([{ position: 1, url: "https://a.com", title: "A", snippet: "d" }]);
    expect(r.ads[0]?.url).toBe("https://ad.com");
    expect(r.features).toEqual(["paid", "people_also_ask"]);
    expect((await dfs.serp("kw")).fromCache).toBe(true);
    expect(calls).toBe(1);
    expect((await readLedger(ledger)).map((x) => x.usd)).toEqual([0.002]);
  });
});

describe("http", () => {
  it("rate limits per host", async () => {
    let t = 0;
    const waits: number[] = [];
    const lim = new RateLimiter(
      3000,
      {
        now: () => t,
        wait: async (ms) => {
          waits.push(ms);
          t += ms;
        },
      },
      (h) => (h === "slow" ? 5000 : 0),
    );
    await lim.schedule("a", async () => (t += 100));
    await lim.schedule("a", async () => undefined);
    await lim.schedule("b", async () => undefined);
    expect(waits).toEqual([3000]);
    expect(lim.intervalFor("slow")).toBe(5000);
  });

  it("fetcher never throws, caches only accepted 2xx", async () => {
    const dir = await tmp();
    const cache = new Cache(dir);
    let n = 0;
    const f = createFetcher({
      cache,
      fetchImpl: async (u) => {
        n++;
        if (String(u).includes("boom")) throw new Error("ECONNRESET");
        return html("<html>ok</html>", String(u).includes("404") ? 404 : 200);
      },
    });
    expect(await f("not a url")).toMatchObject({ ok: false, error: "invalid url" });
    expect(await f("https://x.com/boom")).toMatchObject({ ok: false, status: 0, error: "ECONNRESET" });
    expect(await f("https://x.com/404", { ttlMs: DAY_MS })).toMatchObject({ ok: false, status: 404 });
    const a = await f("https://x.com/a", { ttlMs: DAY_MS });
    expect(isHtml(a)).toBe(true);
    expect((await f("https://x.com/a", { ttlMs: DAY_MS })).fromCache).toBe(true);
    await f("https://x.com/b", { ttlMs: DAY_MS, cacheIf: () => false });
    expect((await f("https://x.com/b", { ttlMs: DAY_MS })).fromCache).toBe(false);
    expect(n).toBe(5);
  });

  it("computes medians", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });
});
