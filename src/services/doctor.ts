// `doctor`: which adapters can run here. Reports whether keys are set, never their values.

import type { AdapterContext, Availability } from "../core/types.js";
import { browserAvailability } from "../adapters/browser.js";
import { credentialsFromEnv } from "../adapters/dataforseo.js";
import { lighthouseAvailability } from "../adapters/performance.js";
import { VERSION } from "../version.js";

export interface DoctorRow {
  id: string;
  label: string;
  paid: boolean;
  available: boolean;
  reason: string;
}

const builtIn: Availability = { available: true, reason: "built in" };

export async function runDoctor(
  ctx: Pick<AdapterContext, "env">,
): Promise<{ version: string; node: string; adapters: DoctorRow[] }> {
  const browser = await browserAvailability();
  const lighthouse = await lighthouseAvailability();
  const dfs = credentialsFromEnv(ctx.env);
  const rows: Array<[string, string, boolean, Availability]> = [
    ["serp-playwright", "SERP via headless Chromium (Google, Bing, DuckDuckGo)", false, browser],
    ["serp-html", "SERP via plain HTML (DuckDuckGo HTML, Bing)", false, builtIn],
    ["serp-urls / serp-file", "SERP from an operator URL list or saved browser HTML", false, builtIn],
    ["page-fetch", "Page fetch + on-page parse (cheerio)", false, builtIn],
    ["schema", "JSON-LD extraction + required-property checks", false, builtIn],
    ["robots-sitemap", "robots.txt + sitemap.xml", false, builtIn],
    ["ai-readiness", "AI-crawler robots check + llms.txt / llms-full.txt", false, builtIn],
    [
      "pagespeed-insights",
      "PageSpeed Insights API",
      false,
      {
        available: true,
        reason: ctx.env.PSI_API_KEY ? "PSI_API_KEY set" : "anonymous quota (set PSI_API_KEY for a free key)",
      },
    ],
    ["lighthouse-local", "Local Lighthouse", false, lighthouse],
    ["adlib-urls", "Ad-library lookup URLs", false, builtIn],
    ["adlib-playwright", "Ad-library screenshot + visible count", false, browser],
    ["keyword-gap", "Keyword extraction + gap (n-grams, TF-IDF)", false, builtIn],
    ["cite", "AI-answer citation log", false, builtIn],
    [
      "dataforseo",
      "DataForSEO SERP + ranked keywords (paid, budget-capped)",
      true,
      dfs
        ? { available: true, reason: "credentials set; runs only with --budget-usd > 0" }
        : { available: false, reason: "DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD not set" },
    ],
  ];
  return {
    version: VERSION,
    node: process.version,
    adapters: rows.map(([id, label, paid, a]) => ({ id, label, paid, available: a.available, reason: a.reason })),
  };
}

export function renderDoctor(d: Awaited<ReturnType<typeof runDoctor>>): string {
  const lines = [`seo-rea ${d.version} on Node ${d.node}`, ""];
  for (const a of d.adapters)
    lines.push(
      `${a.available ? "ok  " : "--  "} ${a.id.padEnd(22)} ${a.paid ? "[paid] " : ""}${a.label} - ${a.reason}`,
    );
  return `${lines.join("\n")}\n`;
}
