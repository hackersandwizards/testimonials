# Testimonials | hackers&wizards

What clients say about hackers&wizards and whose marks we show: every published client quote with
its person, role, company and portrait, and every company mark we hold. The website, brand's
banners, the onepagers, documents and decks take them from here, so a quote or a logo changes in
one place.

## Use it

Pin the newest tag:

```sh
bun add github:hackersandwizards/testimonials#vX.Y.Z
```

```ts
import { shownMarks, testimonials } from "@hackersandwizards/testimonials";

const file = import.meta.resolve(`@hackersandwizards/testimonials/marks/${shownMarks[0].file}`);
```

The entry is plain JavaScript with types beside it, so Bun, Vite and plain Node import it alike.
The data as JSON: `@hackersandwizards/testimonials/marks.json` and
`@hackersandwizards/testimonials/testimonials.json`, the files `data/marks.json` and
`data/testimonials.json` in the package for a reader without an `exports` resolver, such as
Python. Images: `/marks/<file>` and `/portraits/<file>`.

Each mark carries `scale`, the share of a logo row's height at which it reads as heavy as the
others, and `size`, the file's own width and height in pixels. `shownMarks` comes in display order.

## Rendering

- Set a mark's height to `scale` times the row height and let the width follow. `size` gives the
  aspect ratio and a raster's `<img width height>`; an SVG's `size` is read at 72 dpi and may be
  tiny.
- Some SVG marks fill with `currentColor`: inside `<img>` they render black, and to colour them a
  page inlines the SVG and sets `color`.
- `person.role` holds the role as published, in English only.
- `import.meta.resolve` returns a `file://` URL. A build step reads the file from there; a page
  needs the file copied into its assets or imported through its bundler.

## What a surface may show

Everything here is public, but not everything may appear on a page, a deck or a banner. Each mark
carries `surface`:

| Value        | Meaning                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `allowed`    | Cleared by the company and chosen by h&w: a rendered surface may show it. `shownMarks` holds exactly these. |
| `unreleased` | Not chosen by h&w. No surface shows it.                                                                     |
| `never`      | No surface shows it, whatever else changes.                                                                 |

`neverNamed` lists names that have no mark and that no surface shows either, each with its
`reason` (also `@hackersandwizards/testimonials/never-named.json`). A check that a page or deck
names nothing forbidden takes the `never` marks' names and these.

The clearance itself is recorded in Company OS, not here. `surface` belongs to the entry, not its
file. Where entries of one group share a file, a surface may show it once one of them is `allowed`,
under that entry's `name` only: key by `slug`.

A mark with `ownTile: true` draws on its own opaque tile and stays `unreleased` until a
transparent source replaces it. A mark with `onepager: false` stays off generated onepagers. A
testimonial names its company by `slug`: show a logo beside it only where `shownMarks` holds that
slug. Quote in the locale you render, whole or cut to its first sentences where the space holds no
more: split with `Intl.Segmenter` in that locale, never inside a sentence, never skipping one, and
never where a dropped sentence qualifies a kept one. Never add figures a quote does not carry.

## Layout

```
data/marks.json          one entry per company mark: slug, name, file, surface, scale, size,
                         ownTile, onepager, source
data/never-named.json    names no surface shows that have no mark: name, reason
data/testimonials.json   one entry per quote: person, role, portrait, company, quote EN and DE
marks/                   the mark files
portraits/               one portrait per quoted person
scripts/retouch-portrait.ts  the retouch every portrait goes through: bun run retouch:portrait
scripts/marks.ts         writes each mark's size and scale: bun run marks:measure
src/index.js             the data, shownMarks and neverNamed; src/index.d.ts holds the types
```

`bun install`, then `bun run check` runs the full gate. A release is a version bump and a tag.
