import sharp, { type Raw } from "sharp";

export interface Pixels {
  data: Buffer;
  info: Raw;
}

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
