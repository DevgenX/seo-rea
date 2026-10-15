// Diff report schema (report/diff.json, kind "diff").

import { z } from "zod";
import { ISSUE_ID_RE } from "../issues.js";

export const DIFF_SCHEMA_VERSION = "1";

const severity = z.enum(["high", "medium", "low"]);

export const DiffStatus = z.enum(["fixed", "new", "regressed", "improved", "unchanged", "not-rechecked"]);

export const DiffItemSchema = z.object({
  status: DiffStatus,
  id: z.string().regex(ISSUE_ID_RE),
  rule: z.string(),
  severity: severity.describe("Severity in the newer run (older run for fixed / not-rechecked)"),
  previousSeverity: severity.nullable(),
  title: z.string(),
  url: z.string(),
  detail: z.string().describe("What changed, in words"),
});

const RunRefSchema = z.object({ runId: z.string(), path: z.string(), at: z.string() });

export const DiffReportSchema = z.object({
  schemaVersion: z.literal(DIFF_SCHEMA_VERSION),
  tool: z.literal("seo-rea"),
  toolVersion: z.string(),
  kind: z.literal("diff"),
  sourceKind: z.enum(["crawl", "audit", "teardown", "strategy"]),
  domain: z.string(),
  old: RunRefSchema,
  new: RunRefSchema,
  counts: z.object({
    fixed: z.number().int(),
    new: z.number().int(),
    regressed: z.number().int(),
    improved: z.number().int(),
    unchanged: z.number().int(),
    notRechecked: z.number().int(),
  }),
  metrics: z.array(z.object({ name: z.string(), old: z.number(), new: z.number(), delta: z.number() })),
  ruleDeltas: z.array(
    z.object({ rule: z.string(), old: z.number().int(), new: z.number().int(), delta: z.number().int() }),
  ),
  items: z.array(DiffItemSchema),
  notes: z.array(z.string()),
});

export type DiffItem = z.infer<typeof DiffItemSchema>;
export type DiffReport = z.infer<typeof DiffReportSchema>;

export function diffJsonSchema(): Record<string, unknown> {
  return {
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/diff-schema.json",
    title: `seo-rea diff v${DIFF_SCHEMA_VERSION}`,
    ...z.toJSONSchema(DiffReportSchema),
  };
}
