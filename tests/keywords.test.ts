import { describe, expect, it } from "vitest";
import {
  docTerms,
  idf,
  keywordGap,
  keywordGapAdapter,
  ngrams,
  tokenize,
  topKeywords,
} from "../src/adapters/keywords.js";
import { fakeCtx, noNetwork } from "./helpers.js";

const comp = (url: string, text: string, title = "") => ({ url, title, text });

describe("n-grams", () => {
  it("tokenizes and drops possessives", () => {
    expect(tokenize("CardLab's Best-in-class app, 2026!")).toEqual(["cardlab", "best-in-class", "app", "2026"]);
  });

  it("skips grams that start or end with stopwords or are numbers", () => {
    const g = ngrams("the points tracking app for travel 2026");
    expect(g.get("points tracking")).toBe(1);
    expect(g.get("points tracking app")).toBe(1);
    expect(g.has("the points")).toBe(false);
    expect(g.has("app for")).toBe(false);
    expect(g.has("2026")).toBe(false);
    expect(ngrams("helps twitter options").size).toBe(0);
    expect(ngrams("cards best cards").has("cards best cards")).toBe(false);
  });

  it("weighs title and headings 3x", () => {
    const t = docTerms({ url: "u", title: "cashback", text: "cashback" });
    expect(t.get("cashback")).toBe(4);
  });
});

describe("keyword gap", () => {
  const competitors = [
    comp("https://a.com", "points tracking cashback categories annual fee alerts"),
    comp("https://b.com", "points tracking and cashback categories for travel"),
    comp("https://c.com", "travel insurance"),
  ];
  const targets = [comp("https://t.com", "cashback app")];

  it("lists phrases used by 2+ competitors and absent from the target", () => {
    const gap = keywordGap(competitors, targets);
    const phrases = gap.map((g) => g.phrase);
    expect(phrases).toContain("points tracking");
    expect(phrases).toContain("cashback categories");
    expect(phrases).toContain("travel");
    expect(phrases).not.toContain("cashback");
    expect(phrases).not.toContain("annual fee alerts");
    const pt = gap.find((g) => g.phrase === "points tracking");
    expect(pt).toMatchObject({ competitors: 2, words: 2, urls: ["https://a.com", "https://b.com"] });
    expect(pt?.tfidf).toBeGreaterThan(0);
  });

  it("ranks by competitor count then TF-IDF x length and respects limit", () => {
    const gap = keywordGap(competitors, targets, { limit: 3 });
    expect(gap).toHaveLength(3);
    const all = keywordGap(competitors, targets);
    for (let i = 1; i < all.length; i++) {
      const [a, b] = [all[i - 1], all[i]] as [(typeof all)[0], (typeof all)[0]];
      expect(a.competitors > b.competitors || a.tfidf * a.words >= b.tfidf * b.words).toBe(true);
    }
    expect(idf(1, 3)).toBeGreaterThan(idf(3, 3));
  });

  it("falls back to 1 competitor when only one doc is given", () => {
    expect(keywordGap([comp("https://a.com", "rewards tracker")], []).map((g) => g.phrase)).toContain(
      "rewards tracker",
    );
  });

  it("profiles top phrases and runs as an adapter", async () => {
    expect(topKeywords([comp("u", "points tracking app")], 1)[0]?.phrase).toBe("points tracking app");
    const r = await keywordGapAdapter.run({ competitors, targets, limit: 2 }, fakeCtx(noNetwork));
    expect(r).toHaveLength(2);
  });
});
