import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { catalog } from "@hackersandwizards/scaffolding/catalog";

// A review surface only, never hosted (CLAUDE.md, Site): it draws the marks no surface may show.
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
      // The site's own links, so the catalog's header stays in the site.
      nav: {
        items: [
          { name: "Quotes", href: "/" },
          { name: "Marks", href: "/marks/" },
          { name: "Catalog", href: "/catalog/" },
        ],
        current: "Catalog",
      },
    }),
  ],
  vite: { plugins: [tailwindcss() as never] },
});
