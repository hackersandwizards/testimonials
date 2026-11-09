import { expect, test } from "bun:test";
import sharp from "sharp";
import { marks } from "../src/index.js";
import { render, scale } from "./marks";

// Each mark's box ends on its drawn edge, one pixel at 2400 px of rim and an antialiased pixel per
// renderer apart, and some pixel on its edge is transparent, so its ground is too.
test("every mark is tight on a transparent ground and its scale is current", async () => {
  for (const { file, surface, ownTile, scale: stored } of marks) {
    const mark = await render(file);
    expect({ file, scale: stored }).toEqual({ file, scale: expect.closeTo(await scale(mark), 2) });
    // A transparent ground would mean recolouring a client's mark; released, it needs a source.
    if (ownTile && surface === "unreleased") continue;
    const { width, height, channels } = mark.info;
    const { info } = await sharp(mark.data, { raw: mark.info })
      .trim({ threshold: 0 })
      .toBuffer({ resolveWithObject: true });
    const slack = (2 * Math.max(width, height)) / 2400 + 4;
    const alpha = (x: number, y: number) => mark.data[(y * width + x) * channels + 3];
    const edge = [
      ...Array.from({ length: width }, (_, x) => [alpha(x, 0), alpha(x, height - 1)]),
      ...Array.from({ length: height }, (_, y) => [alpha(0, y), alpha(width - 1, y)]),
    ].flat();
    expect({
      file,
      tight: width - info.width <= slack && height - info.height <= slack,
      transparent: edge.includes(0),
    }).toEqual({ file, tight: true, transparent: true });
  }
}, 30_000);
