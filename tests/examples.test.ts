import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDossier } from "../src/core/dossier.js";
import { validateCrawl } from "../src/core/crawl/schema.js";
import { validateStrategy } from "../src/core/strategy/schema.js";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk("examples").filter((f) => /report[/\\](dossier|strategy|crawl)\.json$/.test(f));

describe("committed examples match the published schemas", () => {
  it("finds examples", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files)
    it(f, () => {
      const data: unknown = JSON.parse(readFileSync(f, "utf8"));
      const validate = f.endsWith("dossier.json")
        ? validateDossier
        : f.endsWith("crawl.json")
          ? validateCrawl
          : validateStrategy;
      expect(() => validate(data)).not.toThrow();
    });
});
