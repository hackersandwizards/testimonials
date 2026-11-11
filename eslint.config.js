import base from "@hackersandwizards/scaffolding/eslint/astro";

export default [
  ...base,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
];
