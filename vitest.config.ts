import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite's module runner provides dirname, but not Bun's dir alias.
  environments: {
    ssr: { define: { "import.meta.dir": "import.meta.dirname" } },
  },
  test: {
    testTimeout: Number(process.env.SCAFFOLDING_TEST_TIMEOUT_MS || 5000),
  },
});
