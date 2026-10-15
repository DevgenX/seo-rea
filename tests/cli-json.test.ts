import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDossier } from "../src/core/dossier.js";
import { deriveTopActions } from "../src/core/report/actions.js";
import { main, parseCli } from "../src/cli.js";
import { findings } from "./dossier-fixture.js";

const dossier = (() => {
  const f = findings();
  return validateDossier({ ...f, topActions: deriveTopActions(f) });
})();

vi.mock("../src/services/audit.js", () => ({
  runAudit: (o: { log?: (m: string) => void }) => {
    o.log?.("audit: https://getcardlab.app/");
    return Promise.resolve({ run: {}, reportPath: "/x/report/audit.md", dossier });
  },
}));
vi.mock("../src/services/teardown.js", () => ({
  runTeardown: (o: { log?: (m: string) => void }) => {
    o.log?.("page: https://a.com/");
    return Promise.resolve({ run: {}, claims: [], playbook: [], dossier });
  },
}));

function capture(): { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((s) => (out.push(String(s)), true));
  vi.spyOn(process.stderr, "write").mockImplementation((s) => (err.push(String(s)), true));
  return { out, err };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("--json", () => {
  it("parses on teardown and audit", () => {
    const t = parseCli(["teardown", "--keyword", "k", "--target", "t.com", "--out", "o", "--json"]);
    expect(t.command === "teardown" && t.options.json).toBe(true);
    expect(parseCli(["audit", "t.com", "--json"])).toMatchObject({ json: true });
  });

  it("audit prints only the dossier on stdout; progress goes to stderr", async () => {
    const io = capture();
    expect(await main(["audit", "getcardlab.app", "--json", "--no-psi"])).toBe(0);
    const printed = validateDossier(JSON.parse(io.out.join("")));
    expect(printed).toEqual(dossier);
    expect(io.err.join("")).toContain("audit: https://getcardlab.app/");
  });

  it("teardown prints only the dossier on stdout", async () => {
    const io = capture();
    expect(await main(["teardown", "--keyword", "k", "--target", "t.com", "--out", "/tmp/x", "--json"])).toBe(0);
    expect(JSON.parse(io.out.join(""))).toEqual(dossier);
    expect(io.err.join("")).toContain("page: https://a.com/");
  });
});
