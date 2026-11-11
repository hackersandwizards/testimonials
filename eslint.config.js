import base from "@hackersandwizards/scaffolding/eslint/astro";

export default [
  ...base,
  { ignores: ["site/dist/**"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
];
