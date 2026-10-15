// URL normalisation and scope rules for the crawler.

const TRACKING = /^(utm_[a-z]+|gclid|fbclid|msclkid|mc_[a-z]+|ref|ref_src|_ga|igshid)$/i;
const SKIP_EXT =
  /\.(?:jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|zip|gz|rar|7z|mp[34]|m4a|mov|avi|webm|wav|ogg|woff2?|ttf|otf|eot|css|js|mjs|json|xml|rss|atom|txt|csv|xlsx?|docx?|pptx?|dmg|exe|apk|ipa)$/i;

/** Host without a leading www., lower case. */
export const bareHost = (host: string): string => host.toLowerCase().replace(/^www\./, "");

/**
 * Canonical form used as the crawl key: http(s) only, no fragment, no
 * tracking parameters, sorted query, lower-case host, default port dropped.
 * Returns null for anything the crawler should not queue.
 */
export function normalizeUrl(raw: string, base?: string): string | null {
  let u: URL;
  try {
    u = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.hash = "";
  u.username = "";
  u.password = "";
  u.hostname = u.hostname.toLowerCase();
  const keep = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING.test(k))
    .toSorted(([a], [b]) => a.localeCompare(b));
  u.search = "";
  for (const [k, v] of keep) u.searchParams.append(k, v);
  if (!u.pathname) u.pathname = "/";
  return u.toString();
}

/** Same site: identical host, ignoring a leading www. */
export function inScope(url: string, rootHost: string): boolean {
  try {
    return bareHost(new URL(url).hostname) === bareHost(rootHost);
  } catch {
    return false;
  }
}

/** Assets and downloads are not crawled as pages. */
export const isAssetUrl = (url: string): boolean => {
  try {
    return SKIP_EXT.test(new URL(url).pathname);
  } catch {
    return true;
  }
};
