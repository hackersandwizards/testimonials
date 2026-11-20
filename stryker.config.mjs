import base from "@hackersandwizards/scaffolding/stryker";

export default {
  ...base,
  mutate: ["src/index.js", "scripts/{marks,retouch-portrait}.ts"],
  ignoreStatic: false,
  vitest: {
    ...base.vitest,
    configFile: "vitest.mutation.config.mjs",
    related: true,
  },
};
