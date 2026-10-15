import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import { BudgetError } from "../src/core/budget.js";
import { ERROR_CODES, SeoReaError, errorContractJsonSchema, isErrorCode, toErrorPayload } from "../src/core/errors.js";
import { ISSUE_ID_RE, issueId, ruleOf, subjectHash } from "../src/core/issues.js";

describe("error contract", () => {
  it("maps SeoReaError to its code, hint and exit code", () => {
    const p = toErrorPayload(new SeoReaError("RUN_EXISTS", "x has a run"));
    expect(p).toEqual({
      error: { code: "RUN_EXISTS", message: "x has a run", hint: ERROR_CODES.RUN_EXISTS.hint, exitCode: 1 },
    });
  });

  it("treats unknown errors as INTERNAL", () => {
    expect(toErrorPayload(new Error("boom")).error).toMatchObject({ code: "INTERNAL", exitCode: 1 });
    expect(toErrorPayload("str").error.message).toBe("str");
  });

  it("gives budget refusals a stable code", () => {
    const e = new BudgetError("refused");
    expect(e).toBeInstanceOf(SeoReaError);
    expect(e.code).toBe("BUDGET_REFUSED");
  });

  it("recognises codes", () => {
    expect(isErrorCode("USAGE")).toBe(true);
    expect(isErrorCode("toString")).toBe(false);
  });

  it("keeps docs/error-contract.schema.json and docs/error-codes.md in sync", () => {
    const onDisk = JSON.parse(readFileSync("docs/error-contract.schema.json", "utf8"));
    expect(onDisk).toEqual(errorContractJsonSchema());
    const md = readFileSync("docs/error-codes.md", "utf8").replace(/ +/g, " ");
    for (const [code, info] of Object.entries(ERROR_CODES)) {
      expect(md, code).toContain(`| \`${code}\` | ${info.exitCode} |`);
    }
  });
});

describe("CLI failures follow the contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prints a JSON error payload with --json and exits 2 on usage errors", async () => {
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((s) => (out.push(String(s)), true));
    vi.spyOn(process.stderr, "write").mockImplementation((s) => (err.push(String(s)), true));
    expect(await main(["audit", "--json"])).toBe(2);
    const payload = JSON.parse(out.join(""));
    expect(payload.error.code).toBe("USAGE");
    expect(err.join("")).toContain("seo-rea: [USAGE]");
  });

  it("does not print JSON without --json", async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((s) => (out.push(String(s)), true));
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await main(["nope-command"])).toBe(2);
    expect(out.join("")).toBe("");
  });
});

describe("issue ids", () => {
  it("are stable and match the published pattern", () => {
    expect(issueId("TECH-ROBOTS-BLOCKS-ALL")).toBe("TECH-ROBOTS-BLOCKS-ALL");
    const a = issueId("perf-score-low", "Mobile");
    expect(a).toBe(issueId("PERF-SCORE-LOW", "  mobile "));
    expect(a).toMatch(ISSUE_ID_RE);
    expect(a).toBe(`PERF-SCORE-LOW:${subjectHash("mobile")}`);
    expect(ruleOf(a)).toBe("PERF-SCORE-LOW");
  });

  it("differ by subject and normalise single-word rules", () => {
    expect(issueId("CRAWL-BROKEN-LINK", "https://a.com/x")).not.toBe(issueId("CRAWL-BROKEN-LINK", "https://a.com/y"));
    expect(issueId("odd")).toBe("X-ODD");
  });
});
