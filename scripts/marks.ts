// Writes each mark's `size` and `scale` into data/marks.json. `scale` is the share of a row's
// height at which it reads as heavy as the others. Every mark covers row² × 1.1, a wide mark a
// little more per unit of log aspect (aspect^0.1), a light, thin mark more than a dense one (the
// square root of a typical ink share of 0.27 over its own, clamped to 0.8 to 1.6), never taller
// than the row.
import { join } from "node:path";
import sharp from "sharp";
import { marks } from "../src/index.js";
import { scale } from "./mark-scale.ts";

const ROOT = join(import.meta.dir, "..");

/** The long side, in pixels, an SVG renders at; a raster renders at its own size. */
export const RIM = 2400;

/** A mark's pixels, an SVG at print density capped so its long side stays near RIM, and its own
 * size as sharp reads it. sharp reads an SVG's size at 72 dpi. */
export async function render(file: string) {
  const path = join(ROOT, "marks", file);
  const { width, height } = await sharp(path).metadata();
  const density = Math.min(600, (72 * RIM) / Math.max(width, height));
  const pixels = await sharp(path, { density })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { ...pixels, size: { width, height } };
}
if (import.meta.main) {
  for (const mark of marks) {
    const pixels = await render(mark.file);
    mark.scale = await scale(pixels);
    mark.size = pixels.size;
  }
  await Bun.write(join(ROOT, "data/marks.json"), JSON.stringify(marks, null, 2) + "\n");
}
