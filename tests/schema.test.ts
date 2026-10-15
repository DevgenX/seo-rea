import { describe, expect, it } from "vitest";
import { extractSchema, ruleFor, summarizeSchema, topLevelNodes, validateNode } from "../src/adapters/schema.js";
import { fx } from "./helpers.js";

describe("schema validation", () => {
  const r = extractSchema(fx("schema-mixed.html"));
  const byType = (t: string) => r.nodes.find((n) => n.type === t);

  it("parses all blocks and @graph members", () => {
    expect(r.blocks).toBe(5);
    expect(r.parseErrors).toEqual([]);
    expect(r.nodes.map((n) => n.type)).toEqual([
      "Organization",
      "MobileApplication",
      "BreadcrumbList",
      "Product",
      "HowTo",
      "LocalBusiness",
      "BlogPosting",
      "FAQPage",
    ]);
  });

  it("accepts complete nodes", () => {
    expect(byType("Organization")?.valid).toBe(true);
    expect(byType("Organization")?.warnings).toEqual([]);
    expect(byType("MobileApplication")).toMatchObject({ checkedAs: "SoftwareApplication", valid: true });
    expect(byType("BlogPosting")).toMatchObject({ checkedAs: "Article", valid: true, warnings: [] });
    expect(byType("FAQPage")?.valid).toBe(true);
  });

  it("reports missing required properties", () => {
    expect(byType("Product")?.errors).toEqual(["needs one of: offers, review, aggregateRating"]);
    expect(byType("Product")?.warnings).toContain('missing recommended "brand"');
    expect(byType("LocalBusiness")?.errors).toEqual(['missing required "address"']);
    expect(byType("BreadcrumbList")?.errors).toEqual(["itemListElement[1] missing position"]);
    expect(byType("HowTo")?.errors).toEqual(["step[1] has no text"]);
  });

  it("checks FAQ answers and breadcrumb items", () => {
    const faq = validateNode({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Q?" }, { "@type": "Thing" }],
    });
    expect(faq[0]?.errors).toEqual(["mainEntity[0] missing acceptedAnswer.text", "mainEntity[1] is not a Question"]);
    const bc = validateNode({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", name: "Home" },
        { position: 2, name: "End" },
      ],
    });
    expect(bc[0]?.errors).toEqual(["itemListElement[0] missing position", "itemListElement[0] missing item (URL)"]);
  });

  it("checks offers prices", () => {
    const app = validateNode({ "@type": "SoftwareApplication", name: "A", offers: { "@type": "Offer" }, review: {} });
    expect(app[0]?.errors).toEqual(["offers missing price"]);
    const agg = validateNode({ "@type": "Product", name: "P", offers: { "@type": "AggregateOffer" } });
    expect(agg[0]?.errors).toEqual(["AggregateOffer missing lowPrice"]);
  });

  it("handles unknown types, schema.org URLs and parse errors", () => {
    expect(validateNode({ "@type": "Thing", name: "x" })).toEqual([]);
    expect(validateNode({ "@type": "https://schema.org/Organization" })[0]?.errors).toEqual([
      'missing required "name"',
    ]);
    expect(ruleFor("NewsArticle")).toBe("Article");
    expect(ruleFor("Thing")).toBeUndefined();
    expect(topLevelNodes([{ "@graph": [{ "@type": "A" }] }, "x", { "@type": "B" }])).toHaveLength(2);
    const bad = extractSchema(fx("article.html"));
    expect(bad.parseErrors).toHaveLength(1);
    expect(bad.nodes.find((n) => n.type === "Article")?.errors).toEqual(['missing required "headline"']);
    expect(summarizeSchema(bad)).toMatch(/3 block\(s\).*with errors.*1 unparseable/);
    expect(summarizeSchema(extractSchema("<html></html>"))).toBe("no JSON-LD");
  });
});
