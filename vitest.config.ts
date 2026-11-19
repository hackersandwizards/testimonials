import base from "@hackersandwizards/scaffolding/vitest";
import { mergeConfig } from "vitest/config";

export default mergeConfig(base, {
  // Vite's module runner provides dirname, but not Bun's dir alias.
  environments: {
    ssr: { define: { "import.meta.dir": "import.meta.dirname" } },
  },
});
