import { mergeConfig } from "vitest/config";
import base from "./vitest.config.ts";

export default mergeConfig(base, {
  test: {
    include: ["src/index.test.ts", "scripts/*.test.ts"],
    server: { deps: { inline: ["@hackersandwizards/scaffolding", "@fast-check/vitest"] } },
    testTimeout: 15_000,
  },
});
