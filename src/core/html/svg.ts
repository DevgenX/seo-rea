// Dependency-free inline SVG charts for the HTML reports. Pure functions
// returning markup; every label is escaped. Nothing is fetched at view time.

export const PALETTE: readonly [string, string, string, string, string, string, string, string, string, string] = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];
export const SEVERITY_COLORS: Readonly<Record<"high" | "medium" | "low", string>> = {
  high: "#dc2626",
  medium: "#f59e0b",
  low: "#2563eb",
};

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface Datum {
  label: string;
  value: number;
  /** Text shown after the bar; defaults to the value. */
  note?: string;
  color?: string;
}

const fmt = (n: number): string =>
  Math.abs(n) >= 10000 ? `${Math.round(n / 1000)}k` : Number.isInteger(n) ? String(n) : n.toFixed(1);
const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const empty = (title: string): string => `<p class="empty">${esc(title)}: no data.</p>`;

/** Horizontal bar chart, one row per datum. */
export function barChart(
  title: string,
  data: Datum[],
  opts: { width?: number; labelWidth?: number; color?: string } = {},
): string {
  if (!data.length) return empty(title);
  const width = opts.width ?? 640;
  const lw = opts.labelWidth ?? 200;
  const row = 26;
  const height = data.length * row + 34;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const plot = width - lw - 70;
  const bars = data
    .map((d, i) => {
      const w = Math.max(1, (Math.abs(d.value) / max) * plot);
      const y = 28 + i * row;
      const color = d.color ?? opts.color ?? PALETTE[0];
      return `<g><title>${esc(d.label)}: ${esc(d.note ?? fmt(d.value))}</title><text x="${lw - 8}" y="${y + 14}" text-anchor="end" class="lbl">${esc(clip(d.label, 32))}</text><rect x="${lw}" y="${y}" width="${w.toFixed(1)}" height="${row - 8}" rx="3" fill="${color}"/><text x="${(lw + w + 6).toFixed(1)}" y="${y + 14}" class="val">${esc(d.note ?? fmt(d.value))}</text></g>`;
    })
    .join("");
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><text x="0" y="16" class="ttl">${esc(title)}</text>${bars}</svg></figure>`;
}

/** Vertical column chart (histograms: click depth, position buckets). */
export function columnChart(
  title: string,
  data: Datum[],
  opts: { width?: number; height?: number; color?: string } = {},
): string {
  if (!data.length) return empty(title);
  const width = opts.width ?? 640;
  const height = opts.height ?? 260;
  const top = 30;
  const bottom = 40;
  const plotH = height - top - bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (width - 20) / data.length;
  const bw = Math.min(70, slot * 0.7);
  const cols = data
    .map((d, i) => {
      const h = (d.value / max) * plotH;
      const x = 10 + i * slot + (slot - bw) / 2;
      const y = top + plotH - h;
      return `<g><title>${esc(d.label)}: ${esc(d.note ?? fmt(d.value))}</title><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="${d.color ?? opts.color ?? PALETTE[0]}"/><text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" class="val">${esc(d.note ?? fmt(d.value))}</text><text x="${(x + bw / 2).toFixed(1)}" y="${height - bottom + 18}" text-anchor="middle" class="lbl">${esc(clip(d.label, 14))}</text></g>`;
    })
    .join("");
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><text x="0" y="16" class="ttl">${esc(title)}</text><line x1="10" y1="${top + plotH}" x2="${width - 10}" y2="${top + plotH}" class="axis"/>${cols}</svg></figure>`;
}

/** Donut chart with a legend. */
export function donutChart(title: string, data: Datum[], opts: { size?: number } = {}): string {
  const items = data.filter((d) => d.value > 0);
  if (!items.length) return empty(title);
  const size = opts.size ?? 200;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const total = items.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const arcs = items
    .map((d, i) => {
      const len = (d.value / total) * c;
      const seg = `<circle cx="${size / 2}" cy="${size / 2 + 24}" r="${r}" fill="none" stroke="${d.color ?? PALETTE[i % PALETTE.length] ?? PALETTE[0]}" stroke-width="26" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2 + 24})"><title>${esc(d.label)}: ${esc(d.note ?? fmt(d.value))}</title></circle>`;
      offset += len;
      return seg;
    })
    .join("");
  const legend = items
    .map((d, i) => {
      const y = 44 + i * 22;
      return `<rect x="${size + 20}" y="${y - 11}" width="12" height="12" rx="2" fill="${d.color ?? PALETTE[i % PALETTE.length] ?? PALETTE[0]}"/><text x="${size + 38}" y="${y}" class="lbl">${esc(clip(d.label, 28))} — ${esc(d.note ?? fmt(d.value))} (${Math.round((d.value / total) * 100)}%)</text>`;
    })
    .join("");
  const width = size + 300;
  const height = Math.max(size + 34, 44 + items.length * 22);
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><text x="0" y="16" class="ttl">${esc(title)}</text>${arcs}<text x="${size / 2}" y="${size / 2 + 30}" text-anchor="middle" class="big">${esc(fmt(total))}</text>${legend}</svg></figure>`;
}

/** Paired before/after bars per metric (diff trends). */
export function pairedBars(
  title: string,
  rows: Array<{ label: string; before: number; after: number }>,
  opts: { width?: number } = {},
): string {
  if (!rows.length) return empty(title);
  const width = opts.width ?? 640;
  const lw = 200;
  const row = 40;
  const height = rows.length * row + 50;
  const max = Math.max(...rows.flatMap((r) => [r.before, r.after]), 1);
  const plot = width - lw - 80;
  const body = rows
    .map((r, i) => {
      const y = 30 + i * row;
      const wb = Math.max(1, (r.before / max) * plot);
      const wa = Math.max(1, (r.after / max) * plot);
      const d = r.after - r.before;
      return `<g><title>${esc(r.label)}: ${fmt(r.before)} → ${fmt(r.after)}</title><text x="${lw - 8}" y="${y + 17}" text-anchor="end" class="lbl">${esc(clip(r.label, 30))}</text><rect x="${lw}" y="${y}" width="${wb.toFixed(1)}" height="14" rx="2" fill="#94a3b8"/><rect x="${lw}" y="${y + 16}" width="${wa.toFixed(1)}" height="14" rx="2" fill="${PALETTE[0]}"/><text x="${(lw + Math.max(wa, wb) + 6).toFixed(1)}" y="${y + 20}" class="val">${fmt(r.before)} → ${fmt(r.after)} (${d > 0 ? "+" : ""}${fmt(d)})</text></g>`;
    })
    .join("");
  const legend = `<rect x="${lw}" y="${height - 14}" width="12" height="10" fill="#94a3b8"/><text x="${lw + 16}" y="${height - 5}" class="lbl">before</text><rect x="${lw + 70}" y="${height - 14}" width="12" height="10" fill="${PALETTE[0]}"/><text x="${lw + 86}" y="${height - 5}" class="lbl">after</text>`;
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><text x="0" y="16" class="ttl">${esc(title)}</text>${body}${legend}</svg></figure>`;
}
