// Ad-library lookups: Google Ads Transparency Center, Meta Ad Library and
// LinkedIn Ad Library. Always builds the lookup URL; with a browser it can
// also take one screenshot and read a visible result count. Anything not
// visible stays a manual check.

import type { AdapterContext, SourceAdapter } from "../core/types.js";
import type { RateLimiter } from "../core/http.js";
import { errorMessage, normalizeDomain } from "../core/util.js";
import { browserAvailability, dismissConsent, type BrowserSession } from "./browser.js";

export type AdPlatform = "Google Ads Transparency Center" | "Meta Ad Library" | "LinkedIn Ad Library";

export interface AdLookup {
  domain: string;
  brand: string;
  platform: AdPlatform;
  url: string;
}

export interface AdCapture extends AdLookup {
  status: "manual-check" | "captured" | "error";
  visibleCount: number | null;
  countText: string;
  note: string;
  screenshot?: Buffer;
  capturedAt: string;
}

/** Second-level labels that sit under a country code (example.co.uk). */
const SLD = new Set(["co", "com", "net", "org", "gov", "ac", "edu"]);

export function brandFromDomain(domain: string): string {
  const labels = normalizeDomain(domain).split(".");
  // Registrable label: money.usnews.com -> usnews, shop.example.co.uk -> example
  let i = Math.max(0, labels.length - 2);
  if (labels.length > 2 && SLD.has(labels[i] as string) && (labels.at(-1) as string).length === 2) i--;
  const label = labels[i] ?? labels[0] ?? "";
  return label.replace(/^(get|try|use|go)(?=[a-z]{3,})/, "");
}

export interface Advertiser {
  /** Advertiser web domain; "" when only an app-store listing is known. */
  domain: string;
  brand: string;
}

/**
 * Advertiser behind a ranking URL. App-store listings name the app, not the
 * advertiser's domain, so only the brand is derived for them.
 */
export function advertiserFromUrl(url: string): Advertiser {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { domain: normalizeDomain(url), brand: brandFromDomain(url) };
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "apps.apple.com") {
    const slug = /\/app\/([^/]+)\/id\d+/.exec(u.pathname)?.[1] ?? "";
    return { domain: "", brand: slug.split("-")[0] ?? slug };
  }
  if (host === "play.google.com") {
    const id = u.searchParams.get("id") ?? "";
    const parts = id.split(".");
    return { domain: "", brand: parts[1] ?? parts[0] ?? id };
  }
  return { domain: host, brand: brandFromDomain(host) };
}

function isHomepage(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\/$/, "") === "";
  } catch {
    return false;
  }
}

/** Product sites (homepages, app listings) advertise; publishers' articles mostly do not. */
const isProduct = (url: string): boolean => isHomepage(url) || advertiserFromUrl(url).domain === "";

/** Target first, then product sites before publishers, unique by brand. */
export function pickAdvertisers(targetDomain: string, rankingUrls: string[], max = 4): Advertiser[] {
  const list: Advertiser[] = [{ domain: normalizeDomain(targetDomain), brand: brandFromDomain(targetDomain) }];
  const ordered = [...rankingUrls.filter(isProduct), ...rankingUrls.filter((u) => !isProduct(u))];
  for (const u of ordered) {
    const a = advertiserFromUrl(u);
    if (a.brand && !list.some((x) => x.brand === a.brand)) list.push(a);
  }
  return list.slice(0, max);
}

export function adLibraryLookups(domain: string, brand = brandFromDomain(domain)): AdLookup[] {
  const host = domain ? normalizeDomain(domain) : "";
  const q = encodeURIComponent(brand);
  return [
    {
      domain: host,
      brand,
      platform: "Google Ads Transparency Center",
      url: host
        ? `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(host)}`
        : "https://adstransparency.google.com/?region=anywhere",
    },
    {
      domain: host,
      brand,
      platform: "Meta Ad Library",
      url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${q}&search_type=keyword_unordered&media_type=all`,
    },
    {
      domain: host,
      brand,
      platform: "LinkedIn Ad Library",
      url: `https://www.linkedin.com/ad-library/search?keyword=${q}`,
    },
  ];
}

/** Read a result count from the visible page text, per platform. */
export function visibleAdCount(platform: AdPlatform, text: string): { count: number | null; text: string } {
  const t = text.replace(/\s+/g, " ");
  const patterns: Record<AdPlatform, RegExp[]> = {
    "Meta Ad Library": [/~?\s?([\d,.]+K?)\s+results?\b/i],
    "LinkedIn Ad Library": [/([\d,]+)\s+ads?\s+(?:match|found|results?)/i, /\b([\d,]+)\s+results?\b/i],
    "Google Ads Transparency Center": [/\b([\d,]+)\s+ads?\b/i],
  };
  if (/no ads? (?:match|found)|didn't find any ads|no results/i.test(t)) return { count: 0, text: "no ads shown" };
  for (const re of patterns[platform]) {
    const m = re.exec(t);
    if (!m) continue;
    const raw = (m[1] as string).replace(/,/g, "");
    const n = /k$/i.test(raw) ? Math.round(parseFloat(raw) * 1000) : Number(raw);
    if (Number.isFinite(n)) return { count: n, text: m[0].trim() };
  }
  return { count: null, text: "" };
}

function noteFor(l: AdLookup, fallback: string): string {
  if (!l.domain && l.platform === "Google Ads Transparency Center") {
    return `advertiser domain unknown (app-store listing); search the advertiser name "${l.brand}"`;
  }
  return fallback;
}

function manual(l: AdLookup, now: Date, note: string): AdCapture {
  return { ...l, status: "manual-check", visibleCount: null, countText: "", note, capturedAt: now.toISOString() };
}

/** URL-only adapter: every lookup is manual-check evidence. */
export const adLibraryUrlAdapter: SourceAdapter<{ advertisers: Advertiser[] }, AdCapture[]> = {
  id: "adlib-urls",
  label: "Ad-library lookup URLs (Google, Meta, LinkedIn)",
  category: "ads",
  paid: false,
  available: () => Promise.resolve({ available: true, reason: "built in" }),
  run: ({ advertisers }, ctx) =>
    Promise.resolve(
      advertisers
        .flatMap((a) => adLibraryLookups(a.domain, a.brand))
        .map((l) => manual(l, ctx.now(), noteFor(l, "open in a browser; not fetched"))),
    ),
};

/** Browser adapter: one screenshot and a visible count per lookup, rate limited per host. */
export function createAdLibraryCaptureAdapter(
  session: BrowserSession,
  limiter: RateLimiter,
): SourceAdapter<{ advertisers: Advertiser[] }, AdCapture[]> {
  return {
    id: "adlib-playwright",
    label: "Ad-library screenshot + visible count (headless Chromium)",
    category: "ads",
    paid: false,
    available: () => browserAvailability(),
    async run({ advertisers }, ctx: AdapterContext): Promise<AdCapture[]> {
      const out: AdCapture[] = [];
      for (const l of advertisers.flatMap((a) => adLibraryLookups(a.domain, a.brand))) {
        if (!l.domain && l.platform === "Google Ads Transparency Center") {
          out.push(manual(l, ctx.now(), noteFor(l, "")));
          continue;
        }
        ctx.log(`adlib: ${l.platform} ${l.domain || l.brand}`);
        out.push(await limiter.schedule(new URL(l.url).host, () => capture(session, l, ctx)));
      }
      return out;
    },
  };
}

async function capture(session: BrowserSession, l: AdLookup, ctx: AdapterContext): Promise<AdCapture> {
  let page;
  try {
    page = await session.page();
    await page.goto(l.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await dismissConsent(page, [
      'button:has-text("Decline optional cookies")',
      'button:has-text("Only allow essential cookies")',
      'button:has-text("Reject all")',
    ]);
    await page.waitForTimeout(4000);
    const text = await page
      .locator("body")
      .innerText({ timeout: 5000 })
      .catch(() => "");
    const screenshot = await page.screenshot({ fullPage: false });
    const loginWall = /log in|sign in|join now/i.test(text.slice(0, 2000)) && text.length < 4000;
    const { count, text: countText } = visibleAdCount(l.platform, text);
    const note =
      count !== null
        ? `visible count: ${countText}`
        : loginWall
          ? "login or consent wall; check manually"
          : "no count visible; check the screenshot or open manually";
    return {
      ...l,
      status: count !== null ? "captured" : "manual-check",
      visibleCount: count,
      countText,
      note,
      screenshot,
      capturedAt: ctx.now().toISOString(),
    };
  } catch (err) {
    return { ...manual(l, ctx.now(), `capture failed: ${errorMessage(err).split("\n")[0]}`), status: "error" };
  } finally {
    await page?.close().catch(() => undefined);
  }
}
