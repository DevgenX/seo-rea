// Optional headless Chromium via playwright-core (an optional peer dependency).
// Nothing here runs unless playwright-core is installed and a Chromium build
// is present (`npx playwright install chromium`).

import { SeoReaError } from "../core/errors.js";
import { existsSync } from "node:fs";
import type * as PW from "playwright-core";
import type { Availability } from "../core/types.js";
import { errorMessage } from "../core/util.js";

type PlaywrightModule = typeof PW;

let cached: PlaywrightModule | null | undefined;

export async function loadPlaywright(): Promise<PlaywrightModule | null> {
  if (cached !== undefined) return cached;
  try {
    const name = "playwright-core";
    cached = (await import(name)) as PlaywrightModule;
  } catch {
    cached = null;
  }
  return cached;
}

export async function browserAvailability(): Promise<Availability> {
  const pw = await loadPlaywright();
  if (!pw) return { available: false, reason: "playwright-core not installed (optional: npm i playwright-core)" };
  let path = "";
  try {
    path = pw.chromium.executablePath();
  } catch (err) {
    return { available: false, reason: errorMessage(err) };
  }
  if (!path || !existsSync(path)) {
    return { available: false, reason: "Chromium not downloaded (run: npx playwright install chromium)" };
  }
  return { available: true, reason: `Chromium at ${path}` };
}

/** Lazily launched browser shared by the SERP and ad-library adapters. Always close(). */
export class BrowserSession {
  private browser: PW.Browser | null = null;
  private context: PW.BrowserContext | null = null;
  userAgent = "";

  async page(): Promise<PW.Page> {
    if (!this.context) {
      const pw = await loadPlaywright();
      if (!pw) throw new SeoReaError("DEPENDENCY_MISSING", "playwright-core not installed");
      // The full Chromium build in new headless mode, with the browser's own
      // version in a normal desktop user agent (no "HeadlessChrome" token).
      this.browser = await pw.chromium.launch({ headless: true, channel: "chromium" });
      const version = this.browser.version();
      this.userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        locale: "en-US",
        timezoneId: "America/New_York",
        viewport: { width: 1366, height: 900 },
      });
    }
    return this.context.newPage();
  }

  async close(): Promise<void> {
    try {
      await this.context?.close();
    } finally {
      await this.browser?.close();
      this.browser = null;
      this.context = null;
    }
  }
}

/** Click the first visible consent button among `selectors`. Returns its label or "". */
export async function dismissConsent(page: PW.Page, selectors: string[]): Promise<string> {
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    try {
      if (await btn.isVisible({ timeout: 1500 })) {
        const label = ((await btn.innerText({ timeout: 1000 })) || sel).trim();
        await btn.click({ timeout: 3000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => undefined);
        return label;
      }
    } catch {
      // try the next selector
    }
  }
  return "";
}
