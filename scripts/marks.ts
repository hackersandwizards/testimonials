// Writes each mark's `scale` into data/marks.json: the share of a row's height at which it reads
// as heavy as the others. Every mark covers row² × 1.1, a wide mark a little more per unit of log
// aspect (aspect^0.1), a light, thin mark more than a dense one (the square root of a typical ink
// share of 0.27 over its own, clamped to 0.8 to 1.6), never taller than the row.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dir, "..");
const FILE = join(ROOT, "data/marks.json");

/** A mark's pixels at print density. */
export const render = (file: string) =>
  sharp(join(ROOT, "marks", file), { density: 600 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
type Pixels = Awaited<ReturnType<typeof render>>;

/** Share of the mark's box covered by ink: opaque and dark counts fully. */
async function ink(mark: Pixels) {
  const { data, info } = await sharp(mark.data, { raw: mark.info })
    .resize({ height: 80 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    sum += (data[i + 3] / 255) * (1 - light);
  }
  return sum / (info.width * info.height);
}

export async function scale(mark: Pixels) {
  const aspect = mark.info.width / mark.info.height;
  const weight = Math.min(1.6, Math.max(0.8, Math.sqrt(0.27 / (await ink(mark)))));
  return Math.round(Math.min(1, Math.sqrt((1.1 * weight * aspect ** 0.1) / aspect)) * 1000) / 1000;
}

if (import.meta.main) {
  const list = JSON.parse(readFileSync(FILE, "utf8"));
  for (const mark of list) mark.scale = await scale(await render(mark.file));
  writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
}
