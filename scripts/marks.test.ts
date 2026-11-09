import { expect, test } from "bun:test";
import { marks } from "../src/index.js";
import { render, scale } from "./marks";

// Each mark's box ends on its drawn edge, one pixel at 2400 px of rim apart, plus the antialiased
// pixels an SVG's render adds. Some pixel on its edge is transparent, so its ground is too, except
// on a mark drawing its own tile, which a surface may show only from a transparent source. The
// bounds come from the pixels: sharp's trim takes its background from the top-left pixel, so it
// never measures a mark with ink there.
test("every mark is tight on a transparent ground and its scale is current", async () => {
  for (const { file, surface, ownTile, scale: stored } of marks) {
    const mark = await render(file);
    expect({ file, scale: stored }).toEqual({ file, scale: expect.closeTo(await scale(mark), 2) });
    const { width, height, channels } = mark.info;
    const alpha = (x: number, y: number) => mark.data[(y * width + x) * channels + 3];
    let [left, right, top, bottom] = [width, -1, height, -1];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (alpha(x, y)) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
    const slack = (2 * Math.max(width, height)) / 2400 + (file.endsWith(".svg") ? 4 : 1);
    const edge = [
      ...Array.from({ length: width }, (_, x) => [alpha(x, 0), alpha(x, height - 1)]),
      ...Array.from({ length: height }, (_, y) => [alpha(0, y), alpha(width - 1, y)]),
    ].flat();
    expect({
      file,
      tight: width - (right - left + 1) <= slack && height - (bottom - top + 1) <= slack,
      transparent: edge.includes(0),
    }).toEqual({ file, tight: true, transparent: !(ownTile && surface === "unreleased") });
  }
}, 30_000);
