import { expect, test } from "bun:test";
import { basename, join } from "node:path";
import { Glob } from "bun";

const site = join(import.meta.dir, "..");
const names = (pattern: string, ext: string) =>
  [...new Glob(pattern).scanSync(site)].map((f) => basename(f, ext)).sort();

test("every component in src/components has a story", () => {
  const components = names("src/components/*.astro", ".astro");
  expect(components.length).toBeGreaterThan(0);
  expect(names("catalog/stories/**/*.stories.ts", ".stories.ts")).toEqual(components);
});
