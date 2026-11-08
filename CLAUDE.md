# CLAUDE.md

The one source of client quotes, the portraits of the people quoted, and every company mark
hackers&wizards holds, published as the package `@hackersandwizards/testimonials`. Public by the
founders' choice. The approval behind each entry lives in Company OS, never here.

## Data

- `data/marks.json`: `slug` is the company's slug in Company OS. `surface` decides whether a
  rendered surface may show the mark (`README.md` states the values). A new mark enters as
  `unreleased`; it turns `allowed` once Company OS records the company's release. OBI stays `never`.
- `data/testimonials.json`: every quote as published, both locales. Change a quote only from its
  author's own words, and keep Moonfare's figures to the ones in the quote.
- `portraits/`: one square WebP per quoted person, cut from the largest real photo of them that
  matches the face. A new or replaced portrait goes through `bun run retouch:portrait <source>
portraits/<id>.webp [--crop left,top,size] [--sharpen]` from that source at full resolution.
  Add `--sharpen` only where a blind review in page context scores it ahead outside the noise; no
  AI-restored or AI-upscaled file enters here.
- The package depends on no other h&w package at runtime, and on brand not even for its gate:
  brand takes its marks from here.

## Checks

`bun run check` is the full gate. The pre-commit hook runs `bun run check:staged`.
`src/index.test.ts` holds every file to an entry and every entry to a file.

## Release

Consumers pin a tag. Bump `version` in `package.json`, commit, tag `v<version>`, push the tag.
Removing or renaming an entry, a file or an export is a major.
