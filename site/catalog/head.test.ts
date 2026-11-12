import { expect, test } from "bun:test";

// Scaffolding's shell draws a state alone in the day theme because its <html> carries no
// data-hw-night. The repository's catalog head runs on every catalog page, so it must not set it.
test("the catalog head leaves data-hw-night to the shell", async () => {
  const head = await Bun.file(`${import.meta.dir}/Head.astro`).text();
  const scripts = [...head.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
  const attributes = new Set<string>();
  const document = {
    documentElement: {
      setAttribute: (name: string) => attributes.add(name),
      classList: { add: () => {} },
    },
  };
  for (const script of scripts) new Function("document", script)(document);
  expect(attributes.has("data-hw-night")).toBe(false);
});
