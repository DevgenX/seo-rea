// A tiny fake site served through a fetch stub, for crawler tests.

const html = (title: string, body: string, head = ""): string =>
  `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${title} description">${head}</head><body><h1>${title}</h1>${body}</body></html>`;
const words = (n: number): string => `<p>${Array.from({ length: n }, (_, i) => `word${i}`).join(" ")}</p>`;

export const SITE: Record<string, { status?: number; body?: string; type?: string; redirect?: string }> = {
  "https://example.com/robots.txt": {
    type: "text/plain",
    body: "User-agent: *\nDisallow: /private\nSitemap: https://example.com/sitemap.xml\n",
  },
  "https://example.com/sitemap.xml": {
    type: "application/xml",
    body: `<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/orphan</loc></url><url><loc>https://example.com/noidx</loc></url><url><loc>https://example.com/old</loc></url></urlset>`,
  },
  "https://example.com/": {
    body: html(
      "Home",
      `${words(300)}<a href="/a">A</a> <a href="/b?utm_source=x">B</a> <a href="/old">Old</a> <a href="/missing">Missing</a> <a href="/private/x">Private</a> <a href="/d1">Deep</a> <a href="/logo.png">img</a> <a href="https://other.com/">out</a>`,
    ),
  },
  "https://example.com/a": { body: html("Same", `${words(300)}<a href="/">Home</a>`) },
  "https://example.com/b": { body: html("Same", `${words(50)}<a href="/">Home</a>`) },
  "https://example.com/old": { redirect: "https://example.com/a" },
  "https://example.com/missing": { status: 404, body: "not found" },
  "https://example.com/orphan": { body: html("Orphan", words(300)) },
  "https://example.com/noidx": { body: html("No index", words(300), '<meta name="robots" content="noindex">') },
  "https://example.com/d1": { body: html("D1", `${words(300)}<a href="/d2">next</a>`) },
  "https://example.com/d2": { body: html("D2", `${words(300)}<a href="/d3">next</a>`) },
  "https://example.com/d3": { body: html("D3", `${words(300)}<a href="/d4">next</a>`) },
  "https://example.com/d4": { body: html("D4", words(300)) },
};

export function fakeFetch(calls: string[] = []): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    const hit = SITE[url];
    let final = url;
    let page = hit;
    if (hit?.redirect) {
      final = hit.redirect;
      page = SITE[final];
    }
    const res = new Response(page?.body ?? "not found", {
      status: page ? (page.status ?? 200) : 404,
      headers: { "content-type": page?.type ?? "text/html; charset=utf-8" },
    });
    Object.defineProperty(res, "url", { value: final });
    return res;
  }) as typeof fetch;
}
