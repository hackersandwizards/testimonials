import base from "@hackersandwizards/scaffolding/stryker";

export default {
  ...base,
  mutate: [
    "src/index.js",
    "scripts/mark-scale.ts",
    "scripts/marks.ts",
    "scripts/portrait-math.ts",
    "scripts/retouch-args.ts",
    "scripts/retouch-portrait.ts",
  ],
  ignoreStatic: false,
  incremental: false,
  vitest: {
    ...base.vitest,
    configFile: "vitest.mutation.config.mjs",
    related: true,
  },
};
