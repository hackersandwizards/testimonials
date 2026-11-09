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
The data as JSON, for other languages: `@hackersandwizards/testimonials/marks.json` and
`@hackersandwizards/testimonials/testimonials.json`. Images: `/marks/<file>` and
`/portraits/<file>`.

Each mark carries `scale`, the share of a logo row's height at which it reads as heavy as the
others, and `size`, the file's own width and height in pixels for `<img width height>`.

## What a surface may show

Everything here is public, but not everything may appear on a page, a deck or a banner. Each mark
carries `surface`:

| Value        | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `allowed`    | A rendered surface may show it. `shownMarks` holds exactly these.        |
| `unreleased` | Held as company data. No surface shows it until the company releases it. |
| `never`      | No surface shows it, whatever else changes.                              |

A mark with `onepager: false` stays off generated onepagers. A testimonial names its company by
`slug`: show a logo beside it only where `shownMarks` holds that slug. Quote in the locale you
render, whole or cut to its first sentences where the space holds no more: split with
`Intl.Segmenter` in that locale, never inside a sentence, never skipping one, and never where a
dropped sentence qualifies a kept one. Never add figures a quote does not carry.

## Layout

```
data/marks.json          one entry per company mark: slug, name, file, surface, scale, size, source
data/testimonials.json   one entry per quote: person, role, portrait, company, quote EN and DE
marks/                   the mark files
portraits/               one portrait per quoted person
scripts/retouch-portrait.ts  the retouch every portrait goes through: bun run retouch:portrait
src/index.js             the data and shownMarks; src/index.d.ts holds the types
```

`bun install`, then `bun run check` runs the full gate. A release is a version bump and a tag.
