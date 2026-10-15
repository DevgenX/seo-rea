// Turns a run (data/run.json) into claims, ledger.md, questions.md and teardown.md.

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const ids = (list) => [...new Set(list.filter(Boolean))].join(', ');

export function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function titleHasKeyword(title, keyword) {
  const t = String(title ?? '').toLowerCase();
  return String(keyword).toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w.replace(/s$/, '')));
}

const INTENT_RE = /\b(best|top|\d+\s+(?:best|top)?|review|reviews|vs|compare|comparison|20\d\d)\b/i;

function serpBoundary(run) {
  const engines = run.serp.engines.filter((e) => e.organicCount > 0).map((e) => e.label);
  return `top ${run.serp.organic.length} organic results from ${engines.join(' + ') || 'no engine'} (en-US, logged-out bot request) on ${run.createdAt.slice(0, 10)}`;
}

/** Build the finding ledger rows from run data. */
export function buildClaims(run) {
  const claims = [];
  const add = (c) => claims.push({ confidence: 'medium', unknowns: '', ...c });
  const serpIds = run.serp.engines.map((e) => e.evidenceId);
  const boundary = serpBoundary(run);
  const comps = run.competitors.filter((c) => c.page);
  const compIds = comps.map((c) => c.evidenceId);
  const tHome = run.target.pages[0];
  const tIds = [run.target.homeEvidenceId, run.target.crawlEvidenceId];

  for (const e of run.serp.engines.filter((x) => x.blocked)) {
    add({ claim: `${e.label} was not used: ${e.blocked}`, evidence: [e.evidenceId], type: 'observed', confidence: 'high', boundary: 'single request', unknowns: `${e.label} rankings not observed` });
  }
  if (run.serp.organic.length) {
    add({ claim: `Top results: ${run.serp.organic.slice(0, 5).map((r) => `#${r.position} ${r.domain}`).join(', ')}`, evidence: serpIds, type: 'observed', confidence: 'high', boundary });
    const hit = run.serp.organic.find((r) => r.domain === run.target.domain || r.domain.endsWith(`.${run.target.domain}`));
    add({
      claim: hit ? `${run.target.domain} ranks #${hit.position}` : `${run.target.domain} does not appear in the observed results`,
      evidence: serpIds,
      type: 'observed',
      confidence: 'high',
      boundary,
      unknowns: 'Google positions and personalised results not observed',
    });
    const intent = run.serp.organic.filter((r) => INTENT_RE.test(r.title)).length;
    if (intent >= Math.ceil(run.serp.organic.length / 2)) {
      add({ claim: `Search intent is comparison/roundup: ${intent}/${run.serp.organic.length} titles use "best", "top", a year or review wording`, evidence: serpIds, type: 'inferred', boundary });
    }
  } else {
    add({ claim: 'No SERP results were collected', evidence: serpIds, type: 'observed', confidence: 'high', boundary: 'all configured engines', unknowns: 'Who ranks for the keyword' });
  }

  if (comps.length) {
    const wc = comps.map((c) => c.page.wordCount);
    add({ claim: `Ranking pages median ${median(wc)} words (range ${Math.min(...wc)}-${Math.max(...wc)}); ${run.target.domain} homepage ${tHome?.wordCount ?? 'n/a'} words`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'high', boundary: `${comps.length} fetched ranking pages, raw HTML without JavaScript` });
    const inTitle = comps.filter((c) => titleHasKeyword(c.page.title, run.keyword)).length;
    add({ claim: `${inTitle}/${comps.length} ranking pages contain every keyword term in <title>; target homepage: ${tHome && titleHasKeyword(tHome.title, run.keyword) ? 'yes' : 'no'}`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'high', boundary: `${comps.length} fetched ranking pages` });
    const h2 = comps.map((c) => c.page.headings.h2.length);
    add({ claim: `Ranking pages median ${median(h2)} H2 headings; target homepage ${tHome?.headings.h2.length ?? 'n/a'}`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'high', boundary: `${comps.length} fetched ranking pages` });
    const types = schemaFrequency(comps);
    if (types.length) {
      add({ claim: `Common schema types among ranking pages: ${types.slice(0, 6).map((t) => `${t.type} (${t.count}/${comps.length})`).join(', ')}; target: ${run.target.schemaTypes.join(', ') || 'none'}`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'high', boundary: `JSON-LD on ${comps.length} ranking pages and ${run.target.pages.length} target pages` });
    }
    const il = comps.map((c) => c.page.internalLinkCount);
    add({ claim: `Ranking pages median ${median(il)} internal links per page; target homepage ${tHome?.internalLinkCount ?? 'n/a'}`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'high', boundary: 'links in raw HTML' });
    if (tHome && tHome.wordCount < 150 && median(wc) > 500) {
      add({ claim: `${run.target.domain} serves little text in raw HTML; crawlers that do not run JavaScript may see a thin page`, evidence: tIds, type: 'inferred', boundary: 'target homepage raw HTML', unknowns: 'Rendered DOM not checked' });
    }
  }
  for (const c of run.competitors.filter((x) => !x.page)) {
    add({ claim: `Could not analyse ${c.url}: ${c.error}`, evidence: [c.evidenceId], type: 'observed', confidence: 'high', boundary: 'single request', unknowns: 'On-page facts for this result' });
  }

  if (run.keywordGap.length) {
    add({ claim: `Phrases used by ranking pages but absent from the ${run.target.pages.length} crawled target pages: ${run.keywordGap.slice(0, 8).map((k) => k.phrase).join(', ')}`, evidence: [...compIds, ...tIds], type: 'observed', confidence: 'medium', boundary: `phrases in ${comps.length} ranking pages vs ${run.target.pages.length} target pages`, unknowns: 'Search volume and difficulty' });
  }

  const sm = run.target.sitemap;
  add({ claim: sm.urlCount ? `${run.target.domain} sitemap lists ${sm.urlCount} URLs` : `No sitemap found for ${run.target.domain}`, evidence: [run.target.robotsEvidenceId, sm.evidenceId], type: 'observed', confidence: 'high', boundary: 'robots.txt Sitemap lines and /sitemap.xml' });
  if (run.target.robotsBlocksRoot) add({ claim: `${run.target.domain} robots.txt disallows / for all agents`, evidence: [run.target.robotsEvidenceId], type: 'observed', confidence: 'high', boundary: 'robots.txt' });

  const serpAds = run.serp.ads.length;
  add({ claim: `${serpAds} search ads observed on the SERP`, evidence: serpIds, type: 'observed', confidence: 'medium', boundary, unknowns: 'Ads shown to logged-in or other-location users' });
  add({ claim: 'Ad-library activity for the target and top competitors needs a manual check', evidence: run.ads.map((a) => a.evidenceId), type: 'observed', confidence: 'high', boundary: 'lookup URLs only, not fetched', unknowns: 'Ad counts, run dates, creatives' });

  const cites = run.citations ?? [];
  if (cites.length) {
    const targetCited = cites.filter((c) => c.targetCited).length;
    add({ claim: `${run.target.domain} cited in ${targetCited}/${cites.length} recorded AI answers`, evidence: cites.map((c) => c.evidenceId), type: 'observed', confidence: 'high', boundary: 'answers recorded with `seo-rea cite`' });
  }
  add({ claim: 'Backlink profiles were not collected', evidence: [], type: 'observed', confidence: 'high', boundary: 'free automated pipeline', unknowns: 'Referring domains, link velocity' });
  return claims;
}

export function schemaFrequency(comps) {
  const counts = new Map();
  for (const c of comps) for (const t of c.page.schemaTypes) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/** Prioritised actions for the target, each tied to evidence. Drafts only. */
export function buildPlaybook(run) {
  const actions = [];
  const comps = run.competitors.filter((c) => c.page);
  const compIds = comps.map((c) => c.evidenceId);
  const tHome = run.target.pages[0];
  const tIds = [run.target.homeEvidenceId, run.target.crawlEvidenceId];
  const serpIds = run.serp.engines.map((e) => e.evidenceId);
  const ranks = run.serp.organic.some((r) => r.domain === run.target.domain);
  const roundup = run.serp.organic.filter((r) => INTENT_RE.test(r.title));

  if (!ranks && roundup.length) {
    const domains = [...new Set(roundup.map((r) => r.domain))].slice(0, 5);
    actions.push({ action: `Get listed in the roundups that already rank (${domains.join(', ')}): draft a short pitch with what the app does differently. Do not send from this tool.`, evidence: serpIds, why: 'The results are mostly third-party roundups, so being included in them is the fastest way onto this SERP.' });
  }
  if (comps.length && tHome) {
    const med = median(comps.map((c) => c.page.wordCount));
    if (med && tHome.wordCount < med / 2) {
      actions.push({ action: `Publish a dedicated page for "${run.keyword}" (about ${med} words, comparison or guide format) on ${run.target.domain}`, evidence: [...compIds, ...tIds], why: `Ranking pages median ${med} words vs ${tHome.wordCount} on the target homepage.` });
    }
    if (!titleHasKeyword(tHome.title, run.keyword)) {
      actions.push({ action: `Put "${run.keyword}" (or close wording) in the title and H1 of the page meant to rank`, evidence: [...compIds, ...tIds], why: 'Most ranking pages carry the keyword terms in their title; the target homepage does not.' });
    }
    const missing = schemaFrequency(comps).filter((t) => t.count >= Math.max(2, Math.ceil(comps.length / 3)) && !run.target.schemaTypes.includes(t.type));
    if (missing.length) {
      actions.push({ action: `Add JSON-LD types used by ranking pages that the target lacks: ${missing.slice(0, 5).map((t) => t.type).join(', ')}`, evidence: [...compIds, ...tIds], why: 'Shared structured data among winners; also helps rich results.' });
    }
    if (!run.target.schemaTypes.some((t) => /Application$/.test(t))) {
      actions.push({ action: 'Add MobileApplication or SoftwareApplication JSON-LD (name, operatingSystem, offers, aggregateRating if real)', evidence: tIds, why: 'Lets search engines and AI answers identify the site as an app.' });
    }
  }
  if (run.keywordGap.length) {
    actions.push({ action: `Cover these competitor phrases in H2s and copy where they fit the product: ${run.keywordGap.slice(0, 10).map((k) => k.phrase).join(', ')}`, evidence: [...compIds, ...tIds], why: 'Used by two or more ranking pages, missing from the target crawl.' });
  }
  if (!run.target.sitemap.urlCount) actions.push({ action: `Publish /sitemap.xml and reference it in robots.txt`, evidence: [run.target.robotsEvidenceId, run.target.sitemap.evidenceId], why: 'No sitemap was found.' });
  const cites = run.citations ?? [];
  if (!cites.length) actions.push({ action: `Ask ChatGPT, Perplexity and Gemini "${run.keyword}" style prompts and log answers with \`seo-rea cite\``, evidence: [], why: 'AI-answer citations have not been recorded yet.' });
  else if (!cites.some((c) => c.targetCited)) actions.push({ action: 'Target the pages AI answers cite (see AI-citation table) with inclusion pitches and a citable comparison page', evidence: cites.map((c) => c.evidenceId), why: 'The target was not cited in any recorded AI answer.' });
  actions.push({ action: 'Open the ad-library links and note competitor ad hooks, offers and landing pages', evidence: run.ads.map((a) => a.evidenceId), why: 'Ad libraries need a browser and were recorded as manual checks.' });
  return actions;
}

export function renderLedger(run, claims) {
  const rows = claims.map((c, i) => `| C${String(i + 1).padStart(2, '0')} | ${cell(c.claim)} | ${ids(c.evidence) || '-'} | ${c.type} | ${c.confidence} | ${cell(c.boundary)} | ${cell(c.unknowns) || '-'} |`);
  return [`# Finding ledger: "${run.keyword}" vs ${run.target.domain}`, '', `Run ${run.runId}. Evidence IDs refer to [../evidence/index.md](../evidence/index.md).`, '', '| # | Claim | Evidence | Observed/inferred | Confidence | Search boundary | Open unknowns |', '|---|---|---|---|---|---|---|', ...rows, ''].join('\n');
}

export function questionList(run) {
  return [
    `Who ranks for "${run.keyword}" and why do they win?`,
    `Does ${run.target.domain} rank for "${run.keyword}"?`,
    'What on-page, schema and structure patterns do the winners share?',
    `Which competitor keywords is ${run.target.domain} missing?`,
    'What ads do the target and competitors run?',
    'Which pages get cited by AI answers?',
  ];
}

export function questionStatus(run) {
  const comps = run.competitors.filter((c) => c.page).length;
  const cites = (run.citations ?? []).length;
  return [
    run.serp.organic.length && comps ? 'partial (backlinks not collected)' : 'unresolved',
    run.serp.organic.length ? 'answered within the search boundary' : 'unresolved',
    comps ? 'answered' : 'unresolved',
    run.keywordGap.length ? 'partial (no volume data on free tier)' : 'unresolved',
    run.serp.ads.length ? 'partial (SERP ads only; ad libraries need manual check)' : 'unresolved (ad libraries need manual check)',
    cites ? 'partial (recorded prompts only)' : 'unresolved (no answers recorded yet)',
  ];
}

export function renderQuestions(run) {
  const status = run.finished ? questionStatus(run) : [];
  return [`# Questions: "${run.keyword}" vs ${run.target.domain}`, '', ...questionList(run).map((q, i) => `${i + 1}. ${q}${status[i] ? ` - **${status[i]}**` : ''}`), ''].join('\n');
}

export function renderTeardown(run, claims = buildClaims(run), playbook = buildPlaybook(run)) {
  const L = [];
  const comps = run.competitors.filter((c) => c.page);
  const tHome = run.target.pages[0];
  const claimRef = (pred) => claims.findIndex(pred);

  L.push(`# SEO teardown: "${run.keyword}" vs ${run.target.domain}`, '');
  L.push(`Run ${run.runId} on ${run.createdAt}. Paid budget ${run.budgetUsd} USD, spent ${run.spentUsd.toFixed(4)} USD. Evidence: [evidence/index.md](../evidence/index.md). Ledger: [ledger.md](ledger.md).`, '');
  L.push('Observed facts cite Evidence IDs. Lines marked *(inferred)* are interpretations.', '');

  L.push('## 1. Summary: why the winners win', '');
  const summary = [];
  const intent = claimRef((c) => c.claim.startsWith('Search intent'));
  if (intent >= 0) summary.push(`*(inferred)* ${claims[intent].claim}. Google-style results for this query reward roundup and comparison content, not product homepages. [${ids(claims[intent].evidence)}]`);
  if (comps.length) {
    const wc = median(comps.map((c) => c.page.wordCount));
    summary.push(`Depth: ranking pages run a median ${wc} words vs ${tHome?.wordCount ?? 'n/a'} on the ${run.target.domain} homepage. [${ids(comps.map((c) => c.evidenceId))}]`);
    const inTitle = comps.filter((c) => titleHasKeyword(c.page.title, run.keyword)).length;
    summary.push(`Relevance: ${inTitle}/${comps.length} ranking pages put every keyword term in the title. [${ids(comps.map((c) => c.evidenceId))}]`);
    const types = schemaFrequency(comps).slice(0, 3);
    if (types.length) summary.push(`Structured data: most common types are ${types.map((t) => `${t.type} (${t.count}/${comps.length})`).join(', ')}. [${ids(comps.map((c) => c.evidenceId))}]`);
  }
  const ranked = claimRef((c) => c.claim.includes(run.target.domain) && /ranks #|does not appear/.test(c.claim));
  if (ranked >= 0) summary.push(`${claims[ranked].claim} (${claims[ranked].boundary}). [${ids(claims[ranked].evidence)}]`);
  L.push(...(summary.length ? summary.slice(0, 5).map((s) => `- ${s}`) : ['- Not enough data collected to explain rankings.']), '');

  L.push('## 2. SERP map', '');
  L.push('| Engine | Status | Organic | Ads | Evidence |', '|---|---|---|---|---|');
  for (const e of run.serp.engines) L.push(`| ${e.label} | ${e.blocked ? `not used: ${cell(e.blocked)}` : `used (HTTP ${e.status}${e.fromCache ? ', cache' : ''}, relevance ${Math.round((e.relevance ?? 1) * 100)}%)`} | ${e.organicCount} | ${e.adCount} | ${e.evidenceId} |`);
  L.push('', `Primary ranking list from **${run.serp.primaryLabel || 'none'}**:`, '');
  if (run.serp.organic.length) {
    L.push('| # | Domain | Title | URL |', '|---|---|---|---|');
    for (const r of run.serp.organic) L.push(`| ${r.position} | ${r.domain}${r.domain === run.target.domain ? ' **(target)**' : ''} | ${cell(r.title)} | ${r.url} |`);
  } else L.push('No organic results collected.');
  if (run.serp.ads.length) {
    L.push('', 'Search ads observed:', '');
    for (const a of run.serp.ads) L.push(`- ${a.engine}: ${cell(a.title)} - ${a.url}`);
  }
  if (run.serp.features?.length) L.push('', `SERP features (paid API): ${run.serp.features.join(', ')}`);
  L.push('', 'AI Overview: not observable without a browser session; see section 5.', '');

  L.push('## 3. Competitor cards', '');
  for (const c of run.competitors) {
    L.push(`### #${c.position} ${c.domain}`, '', `URL: ${c.url} | Evidence: ${c.evidenceId}`, '');
    if (!c.page) {
      L.push(`Not analysed: ${c.error}`, '');
      continue;
    }
    const p = c.page;
    L.push(
      `- Title: ${cell(p.title) || '(none)'} (${p.title.length} chars)`,
      `- Meta description: ${cell(p.metaDescription) || '(none)'}`,
      `- H1: ${cell(p.headings.h1.join(' / ')) || '(none)'}`,
      `- Structure: ${p.headings.h2.length} H2, ${p.headings.h3.length} H3, ${p.wordCount} words`,
      `- Top H2s: ${cell(p.headings.h2.slice(0, 6).join(' / ')) || '(none)'}`,
      `- Schema (JSON-LD): ${p.schemaTypes.join(', ') || 'none'}${p.jsonLdErrors ? ` (${p.jsonLdErrors} invalid blocks)` : ''}`,
      `- Canonical: ${p.canonical || '(none)'}${p.canonical && p.canonical.replace(/\/$/, '') !== c.url.replace(/\/$/, '') ? ' (differs from URL)' : ''}`,
      `- Internal links: ${p.internalLinkCount}; external links: ${p.externalLinkCount}`,
      `- Top internal anchors: ${cell(p.topAnchors.slice(0, 6).map((a) => `"${a.anchor}" x${a.count}`).join(', ')) || '(none)'}`,
      `- robots.txt: ${c.robots ? `${c.robots.sitemaps.length} sitemap(s) declared` : 'not fetched'}`,
      '- Backlinks: not collected (see unknowns)',
      '',
    );
  }
  L.push(`### Target: ${run.target.domain}`, '');
  if (tHome) {
    L.push(
      `- Homepage title: ${cell(tHome.title) || '(none)'}`,
      `- Meta description: ${cell(tHome.metaDescription) || '(none)'}`,
      `- H1: ${cell(tHome.headings.h1.join(' / ')) || '(none)'}; ${tHome.headings.h2.length} H2; ${tHome.wordCount} words`,
      `- Schema (all crawled pages): ${run.target.schemaTypes.join(', ') || 'none'}`,
      `- Pages crawled: ${run.target.pages.length}; sitemap URLs: ${run.target.sitemap.urlCount}`,
      `- Most-linked internal pages: ${cell(run.target.inlinks.slice(0, 5).map((l) => `${l.path} (${l.count})`).join(', ')) || '(none)'}`,
      `- Top phrases: ${run.target.topKeywords.slice(0, 10).map((k) => k.phrase).join(', ')}`,
      `- Evidence: ${ids([run.target.homeEvidenceId, run.target.crawlEvidenceId, run.target.robotsEvidenceId, run.target.sitemap.evidenceId])}`,
      '',
    );
  } else L.push(`Target homepage could not be fetched: ${run.target.error ?? 'unknown error'}`, '');

  L.push('## 4. Keyword gap (top 30)', '');
  L.push(`Phrases used by ranking pages and absent from ${run.target.pages.length} crawled ${run.target.domain} pages. Ranked by number of competitors using them, then prominence (title/meta/headings weigh 3x). No search volume on the free tier.`, '');
  if (run.paidKeywords?.length) L.push(`Paid ranked-keyword data: ${run.paidKeywords.map((p) => `${p.domain} (${p.keywords.length} keywords, ${p.evidenceId})`).join(', ')}`, '');
  if (run.keywordGap.length) {
    L.push('| # | Phrase | Competitors using | Prominence score |', '|---|---|---|---|');
    run.keywordGap.slice(0, 30).forEach((k, i) => L.push(`| ${i + 1} | ${k.phrase} | ${k.competitors} | ${k.score} |`));
  } else L.push('No gap computed (needs fetched competitor and target pages).');
  L.push('');

  L.push('## 5. AI-citation table', '');
  const cites = run.citations ?? [];
  if (cites.length) {
    L.push('| Engine | Prompt | Cited domains | Target cited | Evidence |', '|---|---|---|---|---|');
    for (const c of cites) L.push(`| ${c.engine} | ${cell(c.prompt)} | ${c.domains.join(', ') || '(none)'} | ${c.targetCited ? 'yes' : 'no'} | ${c.evidenceId} |`);
  } else {
    L.push(`No AI answers recorded yet. Ask each engine and log the cited URLs, for example:`, '', '```sh', `seo-rea cite --out <this dir> --engine chatgpt --prompt "what is the best ${run.keyword}" --urls "https://a.com/x,https://b.com/y"`, '```');
  }
  L.push('');

  L.push('## 6. Ads', '');
  L.push(`SERP ads observed: ${run.serp.ads.length}. Ad libraries (manual check, open in a browser):`, '');
  L.push('| Advertiser | Platform | Lookup | Evidence |', '|---|---|---|---|');
  for (const a of run.ads) L.push(`| ${a.domain} | ${a.platform} | ${a.url} | ${a.evidenceId} |`);
  L.push('', 'Record what you find (count, run dates, hooks, offers, landing pages) as notes next to the evidence ID.', '');

  L.push('## 7. Playbook', '');
  playbook.forEach((p, i) => L.push(`${i + 1}. ${p.action}. ${p.why}${p.evidence.filter(Boolean).length ? ` [${ids(p.evidence)}]` : ''}`));
  L.push('', 'Drafts only: this tool never sends outreach, buys ads or publishes changes.', '');

  L.push('## 8. Unknowns and cost', '');
  const unknowns = [...new Set([...claims.map((c) => c.unknowns).filter(Boolean), ...run.unknowns])];
  for (const u of unknowns) L.push(`- ${u}`);
  L.push('', `Paid API spend this run: ${run.spentUsd.toFixed(4)} USD (budget ${run.budgetUsd} USD).`, '');
  return L.join('\n');
}
