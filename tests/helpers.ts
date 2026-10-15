import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFetcher } from "../src/core/http.js";
import type { AdapterContext } from "../src/core/types.js";

export const fx = (name: string): string => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

export const tmp = (): Promise<string> => mkdtemp(join(tmpdir(), "seo-rea-test-"));

export const html = (body: string, status = 200, type = "text/html"): Response =>
  new Response(body, { status, headers: { "content-type": type } });

/** Adapter context backed by a fake fetch, no cache, no rate limit. */
export function fakeCtx(fetchImpl: typeof fetch, env: NodeJS.ProcessEnv = {}): AdapterContext {
  return {
    fetch: createFetcher({ fetchImpl }),
    log: () => undefined,
    env,
    now: () => new Date("2026-10-14T12:00:00Z"),
  };
}

export const noNetwork: typeof fetch = () => {
  throw new Error("network must not be called");
};
