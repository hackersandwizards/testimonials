# CLAUDE.md

The one source of client quotes, the portraits of the people quoted, and every company mark
hackers&wizards holds, published as the package `@hackersandwizards/testimonials`. Public by the
founders' choice. The approval behind each entry lives in Company OS, never here.

## Data

- `data/marks.json`: `slug` is the company's slug in Company OS. `surface` is the founders'
  choice of what a rendered surface may show (`README.md` states the values). A new mark enters
  as `unreleased` and turns `allowed` once the founders choose it and Company OS records the
  company's clearance. OBI stays `never`.
  Array order is display order, so no consumer sorts: the `allowed` marks lead, neighbours from
  different industries, and the rest follows by slug. The marks after SDK keep the order of
  Benedikt's prioritised list of 31.10.2026, as website `fcbe40c1` records it; the order test pins
  it. A mark turning `allowed` moves into the lead between neighbours of other industries.
- `marks/`: each file cropped to its drawn edge on a transparent ground, which
  `scripts/marks.test.ts` gates (`ownTile` entries excepted while `unreleased`). After adding or
  replacing one, `bun run marks:measure` writes every `size` and `scale`.
- `data/never-named.json`: names no surface may show that have no mark, one `name` per entry
  and nothing else. A name with a mark stays in `marks.json` as `never`.
- `data/testimonials.json`: every quote as published, both locales. Change a quote only from its
  author's own words, and keep Moonfare's figures to the ones in the quote.
- `portraits/`: one square WebP per quoted person, cut from the largest real photo of them that
  matches the face. A new or replaced portrait goes through `bun run retouch:portrait` (usage in
  `scripts/retouch-portrait.ts`) from that source at full resolution; a noisy source needs `ffmpeg`
  on the PATH. Add `--sharpen` only where a blind review in page context scores it ahead outside
  the noise. No AI-restored or AI-upscaled file enters here.
- The package depends on no other h&w package at runtime, and on brand not even for its gate:
  brand takes its marks from here.

## Checks

`bun run check` is the full gate. The pre-commit hook runs `bun run check:staged`.
`src/index.test.ts` holds every file to an entry and every entry to a file.

## Release

Consumers pin a tag. Bump `version` in `package.json`, commit, tag `v<version>`, push the tag.
Removing or renaming an entry, a file or an export is a major.
