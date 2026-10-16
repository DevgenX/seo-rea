// Self-contained HTML page shell: inline CSS, no scripts, no external URLs
// loaded at view time (links in tables are plain anchors).

import { esc } from "./svg.js";

export interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
}

const CSS = `
:root{--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--card:#fff;--accent:#2563eb}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
header{background:#0f172a;color:#fff;padding:28px 40px}header h1{margin:0 0 4px;font-size:24px}header p{margin:0;color:#cbd5e1}
main{max-width:1180px;margin:0 auto;padding:24px 40px 60px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:20px 24px;margin:0 0 20px}
h2{font-size:17px;margin:0 0 14px}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:0 0 20px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}.kpi b{display:block;font-size:24px}.kpi span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}.kpi small{display:block;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:20px}
ul.summary{margin:0;padding-left:18px}ul.summary li{margin:0 0 8px}.tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:9px;background:#e0e7ff;color:#3730a3;margin-right:6px}
.chart{margin:0}.chart svg{width:100%;height:auto;font-family:inherit}.ttl{font-size:13px;font-weight:600;fill:var(--fg)}.lbl{font-size:11px;fill:#334155}.val{font-size:11px;fill:var(--muted)}.big{font-size:22px;font-weight:700;fill:var(--fg)}.axis{stroke:var(--line)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600;font-size:12px}td.n{text-align:right;font-variant-numeric:tabular-nums}
code{font-size:12px;background:#f1f5f9;padding:1px 4px;border-radius:4px}.empty{color:var(--muted)}footer{color:var(--muted);font-size:12px;text-align:center;padding:20px}
a{color:var(--accent);text-decoration:none;word-break:break-all}
`;

export function kpis(list: Kpi[]): string {
  return `<div class="kpis">${list
    .map(
      (k) =>
        `<div class="kpi"><span>${esc(k.label)}</span><b>${esc(k.value)}</b>${k.hint ? `<small>${esc(k.hint)}</small>` : ""}</div>`,
    )
    .join("")}</div>`;
}

export function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

export const grid = (...items: string[]): string => `<div class="grid">${items.join("")}</div>`;

/** Table; cells are escaped unless wrapped with raw(). */
export interface Raw {
  raw: string;
}
export const raw = (html: string): Raw => ({ raw: html });
export const link = (url: string): Raw =>
  raw(`<a href="${esc(url)}">${esc(url.replace(/^https?:\/\/(www\.)?/, ""))}</a>`);

export function table(
  head: string[],
  rows: Array<Array<string | number | null | Raw>>,
  numeric: number[] = [],
): string {
  if (!rows.length) return `<p class="empty">None.</p>`;
  const cellHtml = (v: string | number | null | Raw): string => (v && typeof v === "object" ? v.raw : esc(v ?? "-"));
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr>${r.map((c, i) => `<td${numeric.includes(i) ? ' class="n"' : ""}>${cellHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

export function page(title: string, subtitle: string, body: string, footer: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><header><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header><main>${body}</main><footer>${esc(footer)}</footer></body></html>
`;
}
