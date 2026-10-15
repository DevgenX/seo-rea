// Paid-call budget. Every paid call is checked before spending and logged to
// ledger.csv (date,run_id,source,query,usd). A cap of 0 refuses every call.

import { SeoReaError } from "./errors.js";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Budget, BudgetRow } from "./types.js";

export class BudgetError extends SeoReaError {
  override name = "BudgetError";
  constructor(message: string) {
    super("BUDGET_REFUSED", message);
  }
}

const csvCell = (s: unknown): string => `"${String(s ?? "").replace(/"/g, '""')}"`;

export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else cur += c;
  }
  cells.push(cur);
  return cells;
}

export async function readLedger(path: string): Promise<BudgetRow[]> {
  let txt = "";
  try {
    txt = await readFile(path, "utf8");
  } catch {
    return [];
  }
  return txt
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [date = "", runId = "", source = "", query = "", usd = "0"] = splitCsvLine(line);
      return { date, runId, source, query, usd: Number(usd) || 0 };
    });
}

export async function appendLedger(path: string, row: BudgetRow): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  let exists = true;
  try {
    await readFile(path);
  } catch {
    exists = false;
  }
  const header = exists ? "" : "date,run_id,source,query,usd\n";
  const cells = [row.date, row.runId, row.source, row.query].map(csvCell);
  await appendFile(path, `${header}${cells.join(",")},${Number(row.usd).toFixed(4)}\n`);
}

const sum = (list: BudgetRow[]): number => list.reduce((s, r) => s + r.usd, 0);

/** Guards paid calls for one run. */
export class BudgetGuard {
  constructor(
    readonly budget: Budget,
    readonly ledgerPath: string,
    readonly runId: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get enabled(): boolean {
    return this.budget.runCapUsd > 0;
  }

  async spent(): Promise<{ run: number; month: number }> {
    const rows = await readLedger(this.ledgerPath);
    const month = this.now().toISOString().slice(0, 7);
    return {
      run: sum(rows.filter((r) => r.runId === this.runId)),
      month: sum(rows.filter((r) => r.date.startsWith(month))),
    };
  }

  /** Throws BudgetError if a call estimated at `estimateUsd` is not allowed. */
  async check(source: string, estimateUsd: number): Promise<void> {
    if (this.budget.runCapUsd <= 0) {
      throw new BudgetError(`paid call to ${source} refused: budget is 0 USD`);
    }
    const { run, month } = await this.spent();
    if (run + estimateUsd > this.budget.runCapUsd) {
      throw new BudgetError(
        `run budget would be exceeded (${run.toFixed(4)} + ~${estimateUsd} > ${this.budget.runCapUsd})`,
      );
    }
    if (month + estimateUsd > this.budget.monthlyCapUsd) {
      throw new BudgetError(
        `monthly cap would be exceeded (${month.toFixed(4)} + ~${estimateUsd} > ${this.budget.monthlyCapUsd})`,
      );
    }
  }

  async record(source: string, query: string, usd: number): Promise<void> {
    await appendLedger(this.ledgerPath, {
      date: this.now().toISOString(),
      runId: this.runId,
      source,
      query,
      usd,
    });
  }
}
