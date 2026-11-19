import base from "@hackersandwizards/scaffolding/stryker";

export default {
  ...base,
  mutate: ["src/index.js", "scripts/{marks,retouch-portrait}.ts"],
  vitest: {
    ...base.vitest,
    configFile: "vitest.mutation.config.mjs",
    related: true,
  },
};
