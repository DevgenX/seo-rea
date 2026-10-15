// Small pure helpers shared across modules.

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeDomain(input: string): string {
  return String(input)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
}

export function sameSite(a: string, b: string): boolean {
  const ha = domainOf(a);
  const hb = domainOf(b);
  return Boolean(ha) && (ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`));
}

export function isDomainOrSub(domain: string, root: string): boolean {
  return domain === root || domain.endsWith(`.${root}`);
}

export function median(nums: number[]): number | null {
  const a = nums.filter((n) => Number.isFinite(n)).toSorted((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? (a[mid] as number) : Math.round(((a[mid - 1] as number) + (a[mid] as number)) / 2);
}

/** Escape a value for a Markdown table cell. */
export function cell(s: unknown): string {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

/** Join unique, non-empty evidence ids. */
export function ids(list: Array<string | undefined>): string {
  return [...new Set(list.filter(Boolean))].join(", ");
}

export function slug(s: string, max = 40): string {
  return (
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, max) || "item"
  );
}

/** Split a list given on the command line on commas, whitespace or newlines; keep http(s) URLs. */
export function parseUrlList(s: string | undefined): string[] {
  return String(s ?? "")
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) && domainOf(u));
}

export function runIdFrom(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
