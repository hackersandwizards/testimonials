# Marks and quotes on a page

## Rendering

- Set a mark's height to `scale` times the row height and let the width follow. `size` gives the
  aspect ratio and a raster's `<img width height>`; an SVG's `size` is read at 72 dpi and may be
  tiny.
- Some SVG marks fill with `currentColor`: inside `<img>` they render black, and to colour them a
  page inlines the SVG and sets `color`. A page inlining one mark more than once prefixes its ids.
- `person.role` holds the role as published, in English only.
- `import.meta.resolve` returns a `file://` URL. A build step reads the file from there; a page
  needs the file copied into its assets or imported through its bundler.

## Surfaces, groups and quotes

The clearance itself is recorded in Company OS, not here. `surface` belongs to the entry, not its
file. Where entries of one group share a file, a surface may show it once one of them is `allowed`,
under that entry's `name` only: key by `slug`.

A mark with `ownTile: true` draws on its own opaque tile and stays `unreleased` until a
transparent source replaces it. A mark with `onepager: false` stays off generated onepagers, and
one with `strip: false` off the website's client logo strip, which shows every other `allowed` mark
in array order. A testimonial names its company by `slug`: show a logo beside it only where
`shownMarks` holds that slug. Quote in the locale you render, whole or cut to its first sentences
where the space holds no more: split with `Intl.Segmenter` in that locale, never inside a sentence,
never skipping one, and never where a dropped sentence qualifies a kept one. Never add figures a
quote does not carry.
