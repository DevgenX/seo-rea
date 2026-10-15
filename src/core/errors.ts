// Published error contract: every failure the CLI or MCP server reports
// carries a stable code from ERROR_CODES. See docs/error-codes.md.

export interface ErrorCodeInfo {
  /** Process exit code used by the CLI. */
  exitCode: 1 | 2;
  /** One line for docs and --json output. */
  summary: string;
  /** What the caller can do about it. */
  hint: string;
}

/** Stable error codes. Never rename or reuse a code; add new ones at the end. */
export const ERROR_CODES = {
  USAGE: { exitCode: 2, summary: "Bad command line arguments.", hint: "Run `seo-rea help` for the syntax." },
  INVALID_INPUT: {
    exitCode: 2,
    summary: "An input file or value is malformed (sites file, domain, run folder).",
    hint: "Fix the input named in the message and run again.",
  },
  RUN_EXISTS: {
    exitCode: 1,
    summary: "The output folder already holds a run.",
    hint: "Pass --force to replace it, or choose another --out.",
  },
  BUDGET_REFUSED: {
    exitCode: 1,
    summary: "A paid call was refused by the run or monthly budget.",
    hint: "Raise --budget-usd / --monthly-cap-usd, or rely on the free sources.",
  },
  SCHEMA_INVALID: {
    exitCode: 1,
    summary: "A report or data file does not match its published JSON Schema.",
    hint: "The file was edited by hand or written by an incompatible version; regenerate it.",
  },
  NOT_FOUND: {
    exitCode: 1,
    summary: "A referenced file, run or evidence item does not exist.",
    hint: "Check the path or id in the message.",
  },
  FETCH_FAILED: {
    exitCode: 1,
    summary: "The target could not be fetched at all (DNS, TLS, timeout, blocked).",
    hint: "Check the domain is reachable from this machine; retry later.",
  },
  CRAWL_STATE_INVALID: {
    exitCode: 1,
    summary: "A saved crawl state cannot be resumed (other domain, other version, corrupt).",
    hint: "Start a fresh crawl with --force.",
  },
  DIFF_INCOMPATIBLE: {
    exitCode: 2,
    summary: "The two runs cannot be compared (different kinds or domains).",
    hint: "Diff two runs of the same command for the same domain.",
  },
  DEPENDENCY_MISSING: {
    exitCode: 1,
    summary: "An optional dependency or credential is missing (playwright-core, API keys).",
    hint: "Run `seo-rea doctor` to see what is available.",
  },
  INTERNAL: {
    exitCode: 1,
    summary: "Unexpected internal error.",
    hint: "Please open an issue with the command and the message.",
  },
} as const satisfies Record<string, ErrorCodeInfo>;

export type ErrorCode = keyof typeof ERROR_CODES;

export const isErrorCode = (v: unknown): v is ErrorCode => typeof v === "string" && Object.hasOwn(ERROR_CODES, v);

/** An error with a stable, documented code. */
export class SeoReaError extends Error {
  override name = "SeoReaError";
  readonly code: ErrorCode;
  readonly hint: string;

  constructor(code: ErrorCode, message: string, options: { hint?: string; cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.code = code;
    this.hint = options.hint ?? ERROR_CODES[code].hint;
  }

  get exitCode(): 1 | 2 {
    return ERROR_CODES[this.code].exitCode;
  }
}

/** The JSON shape printed by `--json` on failure (docs/error-contract.schema.json). */
export interface ErrorPayload {
  error: { code: ErrorCode; message: string; hint: string; exitCode: 1 | 2 };
}

/** Map any thrown value to the contract; unknown errors become INTERNAL. */
export function toErrorPayload(err: unknown): ErrorPayload {
  if (err instanceof SeoReaError)
    return { error: { code: err.code, message: err.message, hint: err.hint, exitCode: err.exitCode } };
  const message = err instanceof Error ? err.message : String(err);
  return { error: { code: "INTERNAL", message, hint: ERROR_CODES.INTERNAL.hint, exitCode: 1 } };
}

/** JSON Schema (draft 2020-12) for the error payload; written to docs/error-contract.schema.json. */
export function errorContractJsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/DevgenX/seo-rea/blob/main/docs/error-contract.schema.json",
    title: "seo-rea error payload",
    type: "object",
    required: ["error"],
    additionalProperties: false,
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "hint", "exitCode"],
        additionalProperties: false,
        properties: {
          code: { enum: Object.keys(ERROR_CODES) },
          message: { type: "string" },
          hint: { type: "string" },
          exitCode: { enum: [1, 2] },
        },
      },
    },
  };
}
