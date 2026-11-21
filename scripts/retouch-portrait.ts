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
import { neutralGains, noiseSigma, toneCurve } from "./portrait-math.ts";
import { parseRetouchArgs } from "./retouch-args.ts";

const MAX_SIZE = 1760;
// Immerkær sigma on 8-bit luminance at master size above which hqdn3d runs; the 14 portraits
// here measured 0.26 to 2.09 on 2026-11-08.
const NOISE_LIMIT = 2.5;

/** ffmpeg's hqdn3d, raw RGB through stdin and stdout, filtered as full-range YUV, since ffmpeg's
 * default limited range drops a seventh of the 256 levels. */
export function denoise(rgb: Uint8Array, width: number, height: number): Buffer {
  const raw = ["-f", "rawvideo", "-pix_fmt", "rgb24"];
  const run = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      ...raw,
      "-s",
      `${width}x${height}`,
      "-i",
      "pipe:0",
      "-vf",
      // On a single frame a temporal strength keeps the input, and 0 selects the default strength.
      "scale=in_range=full:out_range=full,hqdn3d=2:1.5:0.0001:0.0001",
      ...raw,
      "pipe:1",
    ],
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

export async function retouchPortrait(source: string | Buffer, options: RetouchOptions = {}) {
  const image = sharp(source).autoOrient();
  // metadata() reads the stored size; autoOrient holds it after the EXIF rotation.
  const { width, height } = (await image.metadata()).autoOrient;
  const side = Math.min(width, height);
  const crop = options.crop ?? {
    left: Math.floor((width - side) / 2),
    top: Math.floor((height - side) / 2),
    size: side,
  };
  if (crop.left + crop.size > width || crop.top + crop.size > height)
    throw new Error(
      `--crop ${crop.left},${crop.top},${crop.size} reaches past the ${width}×${height} source`,
    );
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
  let args: Pick<RetouchOptions, "crop" | "size">;
  try {
    args = parseRetouchArgs(values);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }
  const result = await retouchPortrait(source, { ...args, sharpen: values.sharpen });
  await Bun.write(out, result.webp);
  console.log(
    `${out}: ${result.size} px, noise ${result.sigma.toFixed(2)}${result.denoised ? " (denoised)" : ""}, gains ${result.gains.map((g) => g.toFixed(3)).join("/")}`,
  );
}
