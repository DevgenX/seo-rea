import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');

/**
 * Evidence store: evidence/E###-<source>.<ext>, evidence/index.json (machine)
 * and evidence/index.md (human). IDs continue from what is already on disk.
 */
export class EvidenceStore {
  constructor(outDir, { now = () => new Date() } = {}) {
    this.dir = join(outDir, 'evidence');
    this.now = now;
    this.items = [];
  }

  async load() {
    await mkdir(this.dir, { recursive: true });
    try {
      this.items = JSON.parse(await readFile(join(this.dir, 'index.json'), 'utf8'));
    } catch {
      this.items = [];
    }
    return this;
  }

  nextId() {
    const max = this.items.reduce((m, e) => Math.max(m, Number(e.id.slice(1))), 0);
    return `E${String(max + 1).padStart(3, '0')}`;
  }

  /**
   * Save one artifact. `content` is written as-is (string) or as JSON.
   * kind: 'observed' (fetched/parsed), 'manual-check' (URL a human must open), 'api', 'citation'.
   */
  async add({ source, kind = 'observed', url = '', note = '', ext = 'json', content, costUsd = 0, fetchedAt, fromCache = false }) {
    const id = this.nextId();
    const file = `${id}-${slug(source)}.${ext}`;
    const body = typeof content === 'string' ? content : JSON.stringify(content ?? {}, null, 2);
    await writeFile(join(this.dir, file), body);
    const item = { id, source, kind, url, note, file, costUsd, fetchedAt: fetchedAt ?? this.now().toISOString(), fromCache };
    this.items.push(item);
    await this.flush();
    return item;
  }

  async flush() {
    await writeFile(join(this.dir, 'index.json'), JSON.stringify(this.items, null, 2));
    const rows = this.items.map((e) => `| ${e.id} | ${cell(e.source)} | ${e.kind}${e.fromCache ? ' (cache)' : ''} | ${cell(e.url)} | ${e.fetchedAt} | ${Number(e.costUsd).toFixed(4)} | [${e.file}](${e.file}) | ${cell(e.note)} |`);
    const md = ['# Evidence index', '', '| ID | Source | Kind | URL | Timestamp (UTC) | Cost USD | File | Note |', '|---|---|---|---|---|---|---|---|', ...rows, ''].join('\n');
    await writeFile(join(this.dir, 'index.md'), md);
  }
}
