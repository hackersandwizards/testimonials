import { expect, test } from "bun:test";

// Scaffolding's shell draws a state alone in the day theme because its <html> carries no
// data-hw-night. The repository's catalog head runs on every catalog page, so it must not set it.
test("the catalog head leaves data-hw-night to the shell", async () => {
  expect(await Bun.file(`${import.meta.dir}/Head.astro`).text()).not.toContain("data-hw-night");
});
