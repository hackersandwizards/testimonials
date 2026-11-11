import base from "@hackersandwizards/scaffolding/eslint/astro";

// site/dist/ is the review site's build (package.json, build).
export default [
  ...base,
  { ignores: ["site/dist/**"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
];
