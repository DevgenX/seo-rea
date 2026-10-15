// JSON-LD extraction and required-property checks for common schema.org types.
// The rule set follows the documented required/recommended properties for
// Google rich results and schema.org; it is a lint, not a full validator.

import * as cheerio from "cheerio";

type Json = Record<string, unknown>;

export interface SchemaNodeResult {
  type: string;
  /** The rule set applied (for subtypes, e.g. BlogPosting -> Article). */
  checkedAs: string;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

export interface SchemaReport {
  blocks: number;
  parseErrors: string[];
  types: string[];
  nodes: SchemaNodeResult[];
}

interface Rule {
  required: string[];
  /** At least one of these must be present. */
  oneOf?: string[];
  recommended: string[];
  check?: (node: Json, errors: string[], warnings: string[]) => void;
}

const has = (node: Json, key: string): boolean => {
  const v = node[key];
  if (v === undefined || v === null || v === "") return false;
  return !(Array.isArray(v) && v.length === 0);
};

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

const isObj = (v: unknown): v is Json => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function typesOf(node: Json): string[] {
  return asArray(node["@type"])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^https?:\/\/schema\.org\//, ""));
}

const checkFaq = (node: Json, errors: string[]): void => {
  const qs = asArray(node.mainEntity);
  qs.forEach((q, i) => {
    if (!isObj(q) || !typesOf(q).includes("Question")) {
      errors.push(`mainEntity[${i}] is not a Question`);
      return;
    }
    if (!has(q, "name")) errors.push(`mainEntity[${i}] Question missing name`);
    const a = asArray(q.acceptedAnswer)[0];
    if (!isObj(a) || !has(a, "text")) {
      errors.push(`mainEntity[${i}] missing acceptedAnswer.text`);
    }
  });
};

const checkBreadcrumbs = (node: Json, errors: string[]): void => {
  const items = asArray(node.itemListElement);
  items.forEach((it, i) => {
    if (!isObj(it)) {
      errors.push(`itemListElement[${i}] is not a ListItem`);
      return;
    }
    if (!has(it, "position")) errors.push(`itemListElement[${i}] missing position`);
    const item = it.item;
    const name = has(it, "name") || (isObj(item) && has(item, "name"));
    if (!name) errors.push(`itemListElement[${i}] missing name`);
    if (i < items.length - 1 && !has(it, "item")) {
      errors.push(`itemListElement[${i}] missing item (URL)`);
    }
  });
};

const checkOffers = (node: Json, errors: string[]): void => {
  for (const o of asArray(node.offers)) {
    if (!isObj(o)) continue;
    const t = typesOf(o);
    if (t.includes("AggregateOffer")) {
      if (!has(o, "lowPrice")) errors.push("AggregateOffer missing lowPrice");
    } else if (!has(o, "price")) errors.push("offers missing price");
  }
};

const checkHowTo = (node: Json, errors: string[]): void => {
  asArray(node.step).forEach((s, i) => {
    if (typeof s === "string") return;
    if (!isObj(s) || !(has(s, "text") || has(s, "itemListElement") || has(s, "name"))) {
      errors.push(`step[${i}] has no text`);
    }
  });
};

export const SCHEMA_RULES: Record<string, Rule> = {
  Article: {
    required: ["headline"],
    recommended: ["author", "datePublished", "dateModified", "image", "publisher"],
  },
  FAQPage: { required: ["mainEntity"], recommended: [], check: checkFaq },
  Product: {
    required: ["name"],
    oneOf: ["offers", "review", "aggregateRating"],
    recommended: ["image", "description", "brand", "sku"],
    check: checkOffers,
  },
  SoftwareApplication: {
    required: ["name", "offers"],
    oneOf: ["aggregateRating", "review"],
    recommended: ["operatingSystem", "applicationCategory"],
    check: checkOffers,
  },
  Organization: {
    required: ["name"],
    recommended: ["url", "logo", "sameAs"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
    check: checkBreadcrumbs,
  },
  HowTo: {
    required: ["name", "step"],
    recommended: ["image", "totalTime", "supply", "tool"],
    check: checkHowTo,
  },
  LocalBusiness: {
    required: ["name", "address"],
    recommended: ["telephone", "openingHoursSpecification", "geo", "url", "priceRange"],
  },
};

/** Map subtypes to the rule set that applies. */
const ALIASES: Record<string, string> = {
  NewsArticle: "Article",
  BlogPosting: "Article",
  TechArticle: "Article",
  Report: "Article",
  MobileApplication: "SoftwareApplication",
  WebApplication: "SoftwareApplication",
  VideoGame: "SoftwareApplication",
  Corporation: "Organization",
  NGO: "Organization",
  OnlineBusiness: "Organization",
  OnlineStore: "Organization",
  Restaurant: "LocalBusiness",
  Store: "LocalBusiness",
  ProfessionalService: "LocalBusiness",
  FinancialService: "LocalBusiness",
  ProductGroup: "Product",
};

export function ruleFor(type: string): string | undefined {
  if (SCHEMA_RULES[type]) return type;
  return ALIASES[type];
}

/** Validate one JSON-LD node against its rule set. */
export function validateNode(node: Json): SchemaNodeResult[] {
  const out: SchemaNodeResult[] = [];
  for (const type of typesOf(node)) {
    const checkedAs = ruleFor(type);
    if (!checkedAs) continue;
    const rule = SCHEMA_RULES[checkedAs] as Rule;
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const k of rule.required) if (!has(node, k)) errors.push(`missing required "${k}"`);
    if (rule.oneOf && !rule.oneOf.some((k) => has(node, k))) {
      errors.push(`needs one of: ${rule.oneOf.join(", ")}`);
    }
    for (const k of rule.recommended) if (!has(node, k)) warnings.push(`missing recommended "${k}"`);
    rule.check?.(node, errors, warnings);
    out.push({ type, checkedAs, errors, warnings, valid: errors.length === 0 });
  }
  return out;
}

/** Top-level nodes and @graph members (nested values are properties, not entities). */
export function topLevelNodes(value: unknown): Json[] {
  const out: Json[] = [];
  for (const v of asArray(value)) {
    if (!isObj(v)) continue;
    if (Array.isArray(v["@graph"])) out.push(...topLevelNodes(v["@graph"]));
    if (v["@type"]) out.push(v);
  }
  return out;
}

/** Every @type anywhere in a JSON-LD value. */
export function allTypes(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) allTypes(v, out);
  } else if (isObj(value)) {
    for (const t of typesOf(value)) out.add(t);
    for (const [k, v] of Object.entries(value)) {
      if (k !== "@type" && typeof v === "object") allTypes(v, out);
    }
  }
  return out;
}

/** Extract every JSON-LD block from HTML, parse it and validate known types. */
export function extractSchema(html: string): SchemaReport {
  const $ = cheerio.load(html);
  const report: SchemaReport = { blocks: 0, parseErrors: [], types: [], nodes: [] };
  const types = new Set<string>();
  $('script[type="application/ld+json" i]').each((i, el) => {
    report.blocks++;
    const raw = $(el).text().trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      report.parseErrors.push(`block ${i + 1}: ${(err as Error).message}`);
      return;
    }
    allTypes(parsed, types);
    for (const node of topLevelNodes(parsed)) report.nodes.push(...validateNode(node));
  });
  report.types = [...types].toSorted();
  return report;
}

export function summarizeSchema(r: SchemaReport): string {
  if (!r.blocks) return "no JSON-LD";
  const bad = r.nodes.filter((n) => !n.valid).length;
  const parts = [`${r.blocks} block(s)`, `${r.nodes.length} checked node(s)`];
  if (bad) parts.push(`${bad} with errors`);
  if (r.parseErrors.length) parts.push(`${r.parseErrors.length} unparseable`);
  return parts.join(", ");
}
