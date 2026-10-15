// Ad-library lookups. These sites need a browser and often a login, so we
// record the lookup URL as manual-check evidence instead of scraping them.

export function brandFromDomain(domain) {
  const host = String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const label = host.split('.')[0] ?? host;
  return label.replace(/^(get|try|use|go)(?=[a-z]{3,})/, '');
}

export function adLibraryLookups(domain, brand = brandFromDomain(domain)) {
  const host = String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const q = encodeURIComponent(brand);
  return [
    { platform: 'Google Ads Transparency Center', url: `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(host)}` },
    { platform: 'Meta Ad Library', url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${q}&search_type=keyword_unordered&media_type=all` },
    { platform: 'LinkedIn Ad Library', url: `https://www.linkedin.com/ad-library/search?keyword=${q}` },
  ];
}
