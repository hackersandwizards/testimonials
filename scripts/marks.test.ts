import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marks, shownMarks } from "../src/index.js";
import { type Pixels, render, RIM, scale } from "./marks";

// Below this share of transparent edge pixels a mark sits on its own tile: a cut or rounded corner
// of an opaque tile leaves a few percent, a mark on a transparent ground far more.
const GROUND = 0.1;

/** The bounds come from the alpha of every pixel, so ink in a corner cannot shift them. */
function frame({ data, info: { width, height, channels } }: Pixels, svg: boolean) {
  const alpha = (x: number, y: number) => data[(y * width + x) * channels + 3];
  let [left, right, top, bottom] = [width, -1, height, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha(x, y)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  // One pixel at RIM px of rim apart, plus the antialiased pixels an SVG's render adds.
  const slack = (2 * Math.max(width, height)) / RIM + (svg ? 4 : 1);
  const edge = [
    ...Array.from({ length: width }, (_, x) => [alpha(x, 0), alpha(x, height - 1)]),
    ...Array.from({ length: height }, (_, y) => [alpha(0, y), alpha(width - 1, y)]),
  ].flat();
  return {
    tight: width - (right - left + 1) <= slack && height - (bottom - top + 1) <= slack,
    ground: edge.filter((a) => a === 0).length / edge.length,
  };
}

test("every mark is tight on a transparent ground, and its size and scale are current", async () => {
  const found: object[] = [];
  const wanted: object[] = [];
  for (const { file, surface, ownTile, size, scale: stored } of marks) {
    const mark = await render(file);
    const { tight, ground } = frame(mark, file.endsWith(".svg"));
    found.push({ file, size, scale: stored, tight, transparent: ground >= GROUND });
    wanted.push({
      file,
      size: mark.size,
      scale: expect.closeTo(await scale(mark), 2),
      tight: true,
      transparent: !(ownTile && surface === "unreleased"),
    });
  }
  expect(found).toEqual(wanted);
}, 30_000);

test("an opaque tile with one cut corner does not count as a transparent ground", () => {
  const [width, height, cut] = [200, 40, 12];
  const data = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < cut; y++) for (let x = 0; x < cut - y; x++) data[(y * width + x) * 4 + 3] = 0;
  const { tight, ground } = frame({ data, info: { width, height, channels: 4 } } as Pixels, true);
  expect({ tight, transparent: ground >= GROUND }).toEqual({ tight: true, transparent: false });
});

// Surfaces inline SVG marks into their pages, and the marks come from third-party sites. The
// elements are the ones the marks use: a new one joins after a look at what it can run or load.
// Comments go first, since one can split a word the patterns look for. Any other declaration
// (DOCTYPE, ATTLIST, CDATA), reference or CSS escape fails: no mark needs one, and each can add or
// spell what the patterns miss.
const ELEMENTS = new Set(
  `svg g path stop rect defs polygon clipPath linearGradient style use title polyline mask circle
  text desc sodipodi:namedview`.split(/\s+/),
);
const loads =
  /<!|[\s/"']on[a-z]+\s*=|javascript:|@import|\bhref\s*=(?!\s*["']?\s*#)|url\((?!\s*["']?\s*#)|image-set\s*\(|&|\\/i;
const unsafe = (file: string) => {
  const svg = file.replace(/<!--[\s\S]*?-->/g, "");
  return loads.test(svg) || [...svg.matchAll(/<([\w.:-]+)/g)].some(([, n]) => !ELEMENTS.has(n));
};
const read = (file: string) => readFileSync(join(import.meta.dir, "../marks", file), "utf8");

test("no SVG mark carries active content or loads anything", () => {
  const svgs = marks.map((mark) => mark.file).filter((file) => file.endsWith(".svg"));
  expect(svgs.filter((file) => unsafe(read(file)))).toEqual([]);
  const planted = [
    "<script>alert(1)</script>",
    '<g onload="x()">',
    '<g id="a"onload="x()">',
    "<svg/onload=x>",
    "<a href=https://example.com>",
    "<foreignObject>",
    '<a><set attributeName="href" to="https://example.com"/></a>',
    '<animate attributeName="href" values="data:text/html,x"/>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "https://example.com/x">]>',
    '<a href="javascript:x()">',
    '<image href="https://example.com/a.png"/>',
    '<use xlink:href="https://example.com/s.svg#a"/>',
    "<style>@import url(https://example.com/a.css)</style>",
    'fill="url(https://example.com/s.svg#g)"',
    "<svg:script>alert(1)</svg:script>",
    "<s:foreignObject>",
    '<s:animate attributeName="href" values="data:text/html,x"/>',
    '<style>path{background-image:image-set("https://example.com/a.png" 1x)}</style>',
    '<style>&#64;import "https://example.com/a.css";</style>',
    "<style>@\\69mport 'https://example.com/a.css';</style>",
    'style="fill:u\\72l(https://example.com/x)"',
    'style="fill:&#117;rl(https://example.com/x)"',
    '<style>&commat;import "https://example.com/a.css";</style>',
    '<!DOCTYPE svg [<!ATTLIST svg onload CDATA "alert(1)">]><svg/>',
    '<!DOCTYPE svg [<!ATTLIST use xlink:href CDATA "https://example.com/s.svg#a">]>',
    '<!DOCTYPE svg SYSTEM "https://example.com/x.dtd"><svg/>',
    '<style>@imp<!---->ort "https://example.com/a.css";</style>',
    '<style>@imp<![CDATA[ort "https://example.com/a.css";]]></style>',
    "<style>path{fill:ur<!---->l(https://example.com/x)}</style>",
    "<style>&lt;script&gt;alert(1)&lt;/script&gt;</style>",
  ];
  expect(planted.filter((svg) => !unsafe(svg))).toEqual([]);
  expect(unsafe(`<use href="#a"/><path fill="url(#g)"/><path fill="url('#g')"/>`)).toBe(false);
  expect(unsafe('<use href = " #a"/><path fill="url( #g)"/>')).toBe(false);
  expect(unsafe("<!-- Generator: x --><title>A</title>")).toBe(false);
});

// A surface inlines the shown marks into one page, where a mark's stylesheet and ids reach the rest.
test("a shown SVG mark carries no stylesheet and no id another shown mark uses", () => {
  const files = [...new Set(shownMarks.map((mark) => mark.file))].filter((f) => f.endsWith(".svg"));
  const ids = files.flatMap((file) => [...new Set(read(file).match(/(?<=\sid=["'])[^"']*/g))]);
  expect({
    styled: files.filter((file) => read(file).includes("<style")),
    shared: ids.filter((id, i) => ids.indexOf(id) !== i),
  }).toEqual({ styled: [], shared: [] });
});
