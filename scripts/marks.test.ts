import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marks } from "../src/index.js";
import { render, RIM, scale } from "./marks";

// Below this share of transparent edge pixels a mark sits on its own tile: a cut or rounded corner
// of an opaque tile leaves a few percent, a mark on a transparent ground far more.
const GROUND = 0.1;

type Pixels = Pick<Awaited<ReturnType<typeof render>>, "data" | "info">;

/** Whether the box ends on the drawn edge, and the share of transparent pixels on that edge. The
 * bounds come from the pixels, not from sharp's trim: with a transparent background trim lands
 * 1 to 2 px off the pixel bounds on some marks. */
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

// A mark drawing its own tile has no transparent ground, and a surface may show it only from a
// transparent source.
test("every mark is tight on a transparent ground, and its size and scale are current", async () => {
  for (const { file, surface, ownTile, size, scale: stored } of marks) {
    const mark = await render(file);
    const { tight, ground } = frame(mark, file.endsWith(".svg"));
    expect({ file, size, scale: stored, tight, transparent: ground >= GROUND }).toEqual({
      file,
      size: mark.size,
      scale: expect.closeTo(await scale(mark), 2),
      tight: true,
      transparent: !(ownTile && surface === "unreleased"),
    });
  }
}, 30_000);

test("an opaque tile with one cut corner does not count as a transparent ground", () => {
  const [width, height, cut] = [200, 40, 12];
  const data = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < cut; y++) for (let x = 0; x < cut - y; x++) data[(y * width + x) * 4 + 3] = 0;
  const { tight, ground } = frame({ data, info: { width, height, channels: 4 } } as Pixels, true);
  expect({ tight, transparent: ground >= GROUND }).toEqual({ tight: true, transparent: false });
});

// Surfaces inline SVG marks into their pages, and the marks come from third-party sites.
const active =
  /<script|<foreignObject|<image\b|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|@import|\bhref\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i;

test("no SVG mark carries active content or loads anything", () => {
  const svgs = marks.map((mark) => mark.file).filter((file) => file.endsWith(".svg"));
  const hits = svgs.filter((file) =>
    active.test(readFileSync(join(import.meta.dir, "../marks", file), "utf8")),
  );
  expect(hits).toEqual([]);
  const planted = [
    "<script>alert(1)</script>",
    '<g onload="x()">',
    "<foreignObject>",
    '<a href="javascript:x()">',
    '<image href="https://example.com/a.png"/>',
    '<use xlink:href="https://example.com/s.svg#a"/>',
    "<style>@import url(https://example.com/a.css)</style>",
    'fill="url(https://example.com/s.svg#g)"',
  ];
  expect(planted.filter((svg) => !active.test(svg))).toEqual([]);
  expect(active.test('<use href="#a"/><path fill="url(#g)"/>')).toBe(false);
});
