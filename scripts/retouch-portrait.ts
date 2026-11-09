// Retouches a portrait into a square master in portraits/, deterministically and without a local
// edit of the face: crop, scale to the master size, denoise only where the result is noisy, white
// balance by channel gain on near-neutral pixels, the tone curve of the earlier hand runs, then
// with --sharpen an unsharp mask on luminance only, then WebP q82 like the website's
// optimize-media.mjs.
//
// Without --crop it takes the centred square of the short side. The master is the crop's size,
// capped at 1760 px, the website's largest portrait variant; --size may set it smaller.
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import sharp from "sharp";

const MAX_SIZE = 1760;
// Immerkær sigma on 8-bit luminance at master size above which hqdn3d runs; the 14 portraits
// here measured 0.26 to 2.09 on 2026-11-08.
const NOISE_LIMIT = 2.5;
const [GAMMA, CONTRAST, ROLL] = [0.97, 1.04, 0.5];

/**
 * Tone curve of the earlier hand runs: gamma, contrast around mid-grey, and above 0.75 a quadratic
 * segment that starts at slope 1.33 and flattens to 0.67 at white. It lifts those tones by up to 5
 * levels (input 203) and clips inputs from 250 up to white.
 */
export function toneCurve(): number[] {
  return Array.from({ length: 256 }, (_, i) => {
    let x = 0.5 + ((i / 255) ** GAMMA - 0.5) * CONTRAST;
    if (x > 0.75) {
      const t = (x - 0.75) / 0.25;
      x = 0.75 + (0.25 * (t - ROLL * t * t * 0.5)) / (1 - ROLL * 0.5);
    }
    return Math.max(0, Math.min(255, Math.round(x * 255)));
  });
}

/** Channel gains that turn the near-neutral pixels grey, each held within 5 % of 1. */
export function neutralGains(rgb: Uint8Array): [number, number, number] {
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const [r, g, b] = [rgb[i], rgb[i + 1], rgb[i + 2]];
    const hi = Math.max(r, g, b);
    if (hi - Math.min(r, g, b) < 0.08 * hi && hi > 40 && hi < 245) {
      sum[0] += r;
      sum[1] += g;
      sum[2] += b;
      n++;
    }
  }
  if (n < rgb.length / 3 / 100) return [1, 1, 1];
  const grey = (sum[0] + sum[1] + sum[2]) / 3;
  return sum.map((s) => Math.max(0.95, Math.min(1.05, grey / s))) as [number, number, number];
}

/** Immerkær's fast noise estimate (1996) on the luminance of an RGB buffer. */
export function noiseSigma(rgb: Uint8Array, width: number, height: number): number {
  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    luma[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  }
  const y = (x: number, row: number) => luma[row * width + x];
  let sum = 0;
  for (let row = 1; row < height - 1; row++) {
    for (let x = 1; x < width - 1; x++) {
      sum += Math.abs(
        y(x - 1, row - 1) -
          2 * y(x, row - 1) +
          y(x + 1, row - 1) -
          2 * (y(x - 1, row) - 2 * y(x, row) + y(x + 1, row)) +
          y(x - 1, row + 1) -
          2 * y(x, row + 1) +
          y(x + 1, row + 1),
      );
    }
  }
  return (Math.sqrt(Math.PI / 2) * sum) / (6 * (width - 2) * (height - 2));
}

/** ffmpeg's hqdn3d on raw RGB through stdin and stdout; ffmpeg must be on the PATH. */
export function denoise(rgb: Uint8Array, width: number, height: number): Buffer {
  const raw = ["-f", "rawvideo", "-pix_fmt", "rgb24"];
  const run = spawnSync(
    "ffmpeg",
    ["-loglevel", "error", ...raw, "-s", `${width}x${height}`, "-i", "pipe:0"].concat([
      "-vf",
      // On a single frame a temporal strength keeps the input, and 0 selects the default strength.
      "hqdn3d=2:1.5:0.0001:0.0001",
      ...raw,
      "pipe:1",
    ]),
    { input: rgb, maxBuffer: rgb.length * 2 },
  );
  if (run.status !== 0)
    throw new Error(`ffmpeg hqdn3d failed: ${run.error?.message ?? run.stderr}`);
  return run.stdout;
}

export interface RetouchOptions {
  crop?: { left: number; top: number; size: number };
  size?: number;
  sharpen?: boolean;
}

/** Returns the retouched master as WebP and what it measured on the way. */
export async function retouchPortrait(source: string | Buffer, options: RetouchOptions = {}) {
  const image = sharp(source).rotate();
  // autoOrient: the size after the EXIF rotation that rotate() applies.
  const { width, height } = (await image.metadata()).autoOrient;
  const side = Math.min(width, height);
  const crop = options.crop ?? {
    left: Math.floor((width - side) / 2),
    top: Math.floor((height - side) / 2),
    size: side,
  };
  const limit = Math.min(crop.size, MAX_SIZE);
  const size = options.size ?? limit;
  if (size > limit) throw new Error(`--size ${size} is above the ${limit} px limit of this crop`);
  const { data: pixels, info } = await image
    .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
    .resize({ width: size, height: size, kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let data: Uint8Array = pixels;
  const sigma = noiseSigma(data, info.width, info.height);
  const denoised = sigma > NOISE_LIMIT;
  if (denoised) data = denoise(data, info.width, info.height);
  const gains = neutralGains(data);
  const tone = toneCurve();
  const luts = gains.map((g) =>
    Array.from({ length: 256 }, (_, i) => tone[Math.min(255, Math.round(i * g))]),
  );
  for (let i = 0; i < data.length; i++) data[i] = luts[i % 3][data[i]];
  let master = sharp(data, { raw: info });
  // sharp-2: radius 1.2 px at web size, 1.7 px at full resolution, 70 %, threshold 2, on the L
  // channel only (sharp sharpens L in LAB whenever sigma is set; sigma = 1 + radius / 2).
  if (options.sharpen)
    master = master.sharpen({ sigma: 1 + (size > 1024 ? 1.7 : 1.2) / 2, m1: 0, m2: 0.7, x1: 2 });
  const webp = await master.webp({ quality: 82, effort: 6, smartSubsample: true }).toBuffer();
  return { webp, size, sigma, denoised, gains };
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { crop: { type: "string" }, size: { type: "string" }, sharpen: { type: "boolean" } },
  });
  const [source, out] = positionals;
  if (!source || !out) {
    console.error(
      "usage: bun run retouch:portrait <source> <out.webp> [--crop left,top,size] [--size px] [--sharpen]",
    );
    process.exit(2);
  }
  const [left, top, size] = values.crop?.split(",").map(Number) ?? [];
  if (values.crop && ![left, top, size].every(Number.isInteger)) {
    console.error("--crop takes three whole numbers: left,top,size");
    process.exit(2);
  }
  if (values.size && !Number.isInteger(Number(values.size))) {
    console.error("--size takes a whole number of pixels");
    process.exit(2);
  }
  const result = await retouchPortrait(source, {
    crop: values.crop ? { left, top, size } : undefined,
    size: values.size ? Number(values.size) : undefined,
    sharpen: values.sharpen,
  });
  await Bun.write(out, result.webp);
  console.log(
    `${out}: ${result.size} px, noise ${result.sigma.toFixed(2)}${result.denoised ? " (denoised)" : ""}, gains ${result.gains.map((g) => g.toFixed(3)).join("/")}`,
  );
}
