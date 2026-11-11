# Testimonials | hackers&wizards

What clients say about hackers&wizards and whose marks we show: every published client quote with
its person, role, company and portrait, and every company mark we hold. The website, brand's
banners, the onepagers, documents and decks take them from here, so a quote or a logo changes in
one place.

| You want                               | Go to                                                     |
| -------------------------------------- | --------------------------------------------------------- |
| quotes and marks in your repository    | [Install](#install) and [Use it](#use-it)                 |
| to draw a mark at the right size       | [docs/marks.md](docs/marks.md)                            |
| to show a quote or cut it to fit       | [docs/marks.md](docs/marks.md#surfaces-groups-and-quotes) |
| to know which marks a page may show    | [What a surface may show](#what-a-surface-may-show)       |
| every quote and mark on screen         | [Review it](#review-it)                                   |
| to add or change a quote or a mark     | [CLAUDE.md](CLAUDE.md)                                    |
| to release a change                    | [CLAUDE.md](CLAUDE.md#release)                            |
| to reuse a quote, a portrait or a mark | [Licence](#licence)                                       |

## Install

Add the dependency in exactly this form, pinned to the newest tag
(`git ls-remote --tags https://github.com/hackersandwizards/testimonials.git` lists them):

```json
"@hackersandwizards/testimonials":
  "git+https://github.com/hackersandwizards/testimonials.git#v<version>"
```

## Use it

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

## What a surface may show

Everything here is public, but not everything may appear on a page, a deck or a banner. Each mark
carries `surface`:

| Value        | Meaning                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `allowed`    | Cleared by the company and chosen by h&w: a rendered surface may show it. `shownMarks` holds exactly these. |
| `unreleased` | Not chosen by h&w. No surface shows it but the local review page (below).                                   |
| `never`      | No surface shows it, whatever else changes.                                                                 |

A deny check, scaffolding's `check-confidential never`, takes the names h&w never shows from the
never section of the private list `hackersandwizards/confidential-terms`, which Company OS builds
from the companies whose public-reference state is `never` or `declined`.

How to draw a mark, share a file within a group and cut a quote: [docs/marks.md](docs/marks.md).

## Review it

With [Bun](https://bun.sh) installed, in a clone of this repository: `bun install`, then
`bun run dev` and open http://127.0.0.1:4327: every quote in both languages with its person,
portrait, mark and what it lacks at `/`, every mark on a light and a night ground at `/marks/`, the
page's components at `/catalog/`. It runs on your machine only and is never hosted, as it draws
marks no surface may show. With the [shared Caddy setup](https://github.com/hackersandwizards/practitioners/blob/main/docs/local-urls.md),
open http://testimonials.localhost.

## Work on the package

`bun install`, then `bun run check` runs the full gate. A release is a version bump and a tag.
The rules for changing data, marks and portraits are in [CLAUDE.md](CLAUDE.md).

## Licence

The code is under the [PolyForm Strict License 1.0.0](LICENSE). A quote stays its author's, a
portrait its person's and its photographer's, and every company name and mark is a trademark of
its owner. Maintained by hackers&wizards GmbH.
