# Testimonials | hackers&wizards

What clients say about hackers&wizards and whose marks we show: every published client quote with
its person, role, company and portrait, and every company mark we hold. The website, brand's
banners, the onepagers, documents and decks take them from here, so a quote or a logo changes in
one place.

## Use it

```sh
bun add github:hackersandwizards/testimonials#v1.0.0
```

```ts
import { shownMarks, testimonials } from "@hackersandwizards/testimonials";

const file = import.meta.resolve(`@hackersandwizards/testimonials/marks/${shownMarks[0].file}`);
```

Plain JSON for code that cannot import TypeScript: `@hackersandwizards/testimonials/marks.json` and
`@hackersandwizards/testimonials/testimonials.json`. Images: `/marks/<file>` and
`/portraits/<file>`.

## What a surface may show

Everything here is public, but not everything may appear on a page, a deck or a banner. Each mark
carries `surface`:

| Value        | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `allowed`    | A rendered surface may show it. `shownMarks` holds exactly these.        |
| `unreleased` | Held as company data. No surface shows it until the company releases it. |
| `never`      | No surface shows it, whatever else changes.                              |

A mark with `onepager: false` stays off generated onepagers. A testimonial names its company by
`slug`: show a logo beside it only where `shownMarks` holds that slug. Quotes are published as they stand:
quote them whole, in the locale you render, and never add figures they do not carry.

## Layout

```
data/marks.json          one entry per company mark: slug, name, file, surface, height, source
data/testimonials.json   one entry per quote: person, role, portrait, company, quote EN and DE
marks/                   the mark files
portraits/               one portrait per quoted person
src/index.ts             the types, the data and shownMarks
```

`bun install`, then `bun run check` runs the full gate. A release is a version bump and a tag.
