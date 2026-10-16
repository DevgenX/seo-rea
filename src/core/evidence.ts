import { SeoReaError } from "./errors.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Evidence, EvidenceInput } from "./types.js";
import { cell, slug } from "./util.js";

const ID_RE = /^E\d{3,}$/;

export function formatEvidenceId(n: number): string {
  return `E${String(n).padStart(3, "0")}`;
}

/**
 * Evidence store: evidence/E###-<source>.<ext>, evidence/index.json (machine)
 * and evidence/index.md (human). IDs continue from what is already on disk.
 */
export class EvidenceStore {
  readonly dir: string;
  items: Evidence[] = [];
  private readonly now: () => Date;

  constructor(outDir: string, opts: { now?: () => Date } = {}) {
    this.dir = join(outDir, "evidence");
    this.now = opts.now ?? (() => new Date());
  }

  async load(): Promise<this> {
    await mkdir(this.dir, { recursive: true });
    try {
      const raw: unknown = JSON.parse(await readFile(join(this.dir, "index.json"), "utf8"));
      this.items = Array.isArray(raw) ? (raw as Evidence[]) : [];
    } catch {
      this.items = [];
    }
    return this;
  }

  nextId(): string {
    const max = this.items.reduce((m, e) => Math.max(m, Number(e.id.slice(1)) || 0), 0);
    return formatEvidenceId(max + 1);
  }

  /** Save one artifact. `content` is written as-is (string or Buffer) or as JSON. */
  async add(input: EvidenceInput): Promise<Evidence> {
    const id = this.nextId();
    const file = `${id}-${slug(input.source)}.${input.ext ?? "json"}`;
    const c = input.content;
    const body = typeof c === "string" || Buffer.isBuffer(c) ? c : JSON.stringify(c ?? {}, null, 2);
    await writeFile(join(this.dir, file), body);
    const item: Evidence = {
      id,
      source: input.source,
      kind: input.kind ?? "observed",
      url: input.url ?? "",
      note: input.note ?? "",
      file,
      costUsd: input.costUsd ?? 0,
      fetchedAt: input.fetchedAt ?? this.now().toISOString(),
      fromCache: input.fromCache ?? false,
    };
    this.items.push(item);
    await this.flush();
    return item;
  }

  get(id: string): Evidence | undefined {
    return this.items.find((e) => e.id === id);
  }

  /** Read an item and its content. Text is truncated to `maxChars`. */
  async read(id: string, maxChars = 20000): Promise<{ item: Evidence; content: string; truncated: boolean }> {
    if (!ID_RE.test(id)) throw new Error(`invalid evidence id "${id}"`);
    const item = this.get(id);
    if (!item) throw new SeoReaError("NOT_FOUND", `evidence ${id} not found in ${this.dir}`);
    if (/\.(png|jpe?g|webp)$/i.test(item.file)) {
      return {
        item,
        content: `(binary image: ${item.file})`,
        truncated: false,
      };
    }
    const text = await readFile(join(this.dir, item.file), "utf8");
    return {
      item,
      content: text.slice(0, maxChars),
      truncated: text.length > maxChars,
    };
  }

  async flush(): Promise<void> {
    await writeFile(join(this.dir, "index.json"), JSON.stringify(this.items, null, 2));
    await writeFile(join(this.dir, "index.md"), renderEvidenceIndex(this.items));
  }
}

export function renderEvidenceIndex(items: Evidence[]): string {
  const rows = items.map(
    (e) =>
      `| ${e.id} | ${cell(e.source)} | ${e.kind}${e.fromCache ? " (cache)" : ""} | ${cell(e.url)} | ${e.fetchedAt} | ${Number(e.costUsd).toFixed(4)} | [${e.file}](${e.file}) | ${cell(e.note)} |`,
  );
  return [
    "# Evidence index",
    "",
    "| ID | Source | Kind | URL | Timestamp (UTC) | Cost USD | File | Note |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}
