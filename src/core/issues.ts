// Stable issue ids. An issue id names the rule that fired plus, when the
// rule can fire more than once, a short hash of its subject (a URL, a term).
// Ids never contain run-specific data, so the same problem keeps the same id
// from one run to the next and `seo-rea diff` can match them.

import { createHash } from "node:crypto";

/** Rule codes: UPPER-KEBAB, grouped by area prefix. */
export const ISSUE_ID_RE = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+(?::[a-f0-9]{8})?$/;

/** 8 hex chars of sha1 over the normalised subject. */
export function subjectHash(subject: string): string {
  const norm = subject.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha1").update(norm).digest("hex").slice(0, 8);
}

/** Build an issue id from a rule code and an optional subject. */
export function issueId(rule: string, subject?: string): string {
  const code = rule
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = code.includes("-") ? code : `X-${code || "ISSUE"}`;
  const id = subject ? `${base}:${subjectHash(subject)}` : base;
  if (!ISSUE_ID_RE.test(id)) throw new Error(`cannot build issue id from "${rule}"`);
  return id;
}

/** Rule code of an id (the part before ':'). */
export const ruleOf = (id: string): string => id.split(":")[0] ?? id;
