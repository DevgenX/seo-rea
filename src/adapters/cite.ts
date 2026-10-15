// AI-answer citation log. No network calls: the operator asks an AI engine
// and records which URLs the answer cited.

import type { EvidenceStore } from "../core/evidence.js";
import type { Evidence } from "../core/types.js";
import { domainOf, parseUrlList } from "../core/util.js";

export const AI_ENGINES = [
  "chatgpt",
  "perplexity",
  "gemini",
  "claude",
  "copilot",
  "google-ai-overview",
  "grok",
  "other",
] as const;
export type AiEngine = (typeof AI_ENGINES)[number];

export function isAiEngine(s: string): s is AiEngine {
  return (AI_ENGINES as readonly string[]).includes(s);
}

export interface Citation {
  engine: AiEngine;
  prompt: string;
  urls: string[];
  domains: string[];
  recordedAt: string;
  method: string;
  note: string;
}

export function buildCitation(input: {
  engine: string;
  prompt: string;
  urls: string | string[];
  note?: string;
  now?: Date;
}): Citation {
  if (!isAiEngine(input.engine)) throw new Error(`engine must be one of: ${AI_ENGINES.join(", ")}`);
  if (!input.prompt.trim()) throw new Error("prompt is required");
  const list = Array.isArray(input.urls) ? parseUrlList(input.urls.join(",")) : parseUrlList(input.urls);
  return {
    engine: input.engine,
    prompt: input.prompt.trim(),
    urls: list,
    domains: [...new Set(list.map(domainOf))],
    recordedAt: (input.now ?? new Date()).toISOString(),
    method: "manual entry by operator",
    note: input.note ?? "",
  };
}

export async function logCitation(ev: EvidenceStore, c: Citation): Promise<Evidence> {
  return ev.add({
    source: `cite-${c.engine}`,
    kind: "citation",
    note: `${c.urls.length} cited URL(s): ${c.prompt.slice(0, 60)}`,
    content: c,
  });
}
