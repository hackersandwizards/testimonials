import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { catalog } from "@hackersandwizards/scaffolding/catalog";
import { links } from "./src/lib/links";

export default defineConfig({
  server: { host: "127.0.0.1", port: 4327 },
  devToolbar: { enabled: false },
  integrations: [
    catalog({
      product: "Testimonials",
      lead: "Every component of the testimonials review site, each with its states on real entries, then the brand elements the pages use.",
      css: ["./src/styles/global.css"],
      homeCss: ["./src/styles/global.css", "@hackersandwizards/brand/elements.css"],
      head: "./catalog/Head.astro",
      home: "./catalog/Home.astro",
      serverOnly: true,
      htmlClass: ["hw-focus-ring"],
      nav: { items: links, current: "Catalog" },
    }),
  ],
  // Every mark and portrait a file of its own: inlined, the marks page's small marks, each drawn
  // twice, would load uncached and ignore loading="lazy".
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});
