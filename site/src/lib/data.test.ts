import { describe, expect, test } from "vitest";
import { markSvg, markUrl, portraitUrl, type Mark, type Testimonial } from "./data";

const syntheticMark = (file: string): Mark => ({
  slug: "example",
  name: "Example",
  file,
  surface: "allowed",
  scale: 1,
  size: { width: 100, height: 50 },
});

const syntheticTestimonial = (portrait: string): Testimonial => ({
  id: "example",
  person: {
    name: "Example Person",
    role: "Engineer",
    portrait,
    url: "https://example.com",
  },
  company: { slug: "example", name: "Example" },
  quote: { en: "Quote", de: "Zitat" },
  source: "testimonial",
});

describe("site data asset lookups", () => {
  test("markUrl throws naming the missing file", () => {
    expect(() => markUrl(syntheticMark("no-such-mark.svg"))).toThrow(
      "Missing marks file: marks/no-such-mark.svg",
    );
  });

  test("portraitUrl throws naming the missing file", () => {
    expect(() => portraitUrl(syntheticTestimonial("no-such-portrait.webp"))).toThrow(
      "Missing portraits file: portraits/no-such-portrait.webp",
    );
  });

  test("markSvg returns undefined for a mark without an inlined SVG", () => {
    expect(markSvg(syntheticMark("no-such-mark.svg"))).toBeUndefined();
  });
});
