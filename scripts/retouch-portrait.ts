// Retouches a portrait into a square master in portraits/, deterministically and without a local
// edit of the face: crop, denoise only where the photo is noisy, white balance by channel gain on
// near-neutral pixels, a tone curve whose highlights roll off softly against skin shine, then with
// --sharpen an unsharp mask on luminance only, then WebP q82 like the website's optimize-media.mjs.
//
//   bun run retouch:portrait <source> <out.webp> [--crop left,top,size] [--size px] [--sharpen]
//
// Without --crop it takes the centred square of the short side; --size defaults to the crop's
// size, capped at 1760 px, the website's largest portrait variant.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const MAX_SIZE = 1760;
// Immerkær sigma on 8-bit luminance above which hqdn3d runs; a clean studio portrait measures
// below 2, a phone photo at high ISO above 3.
const NOISE_LIMIT = 2.5;

/** Tone curve: gamma, contrast around mid-grey, and above 0.75 a soft highlight roll-off. */
export function toneCurve(gamma = 0.97, contrast = 1.04, roll = 0.5): number[] {
  return Array.from({ length: 256 }, (_, i) => {
    let x = 0.5 + ((i / 255) ** gamma - 0.5) * contrast;
    if (x > 0.75) {
      const t = (x - 0.75) / 0.25;
      x = 0.75 + (0.25 * (t - roll * t * t * 0.5)) / (1 - roll * 0.5);
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
  const y = (x: number, row: number) => {
    const i = (row * width + x) * 3;
    return 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
  };
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

function denoise(png: Buffer): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "retouch-portrait-"));
  try {
    const [input, output] = [join(dir, "in.png"), join(dir, "out.png")];
    writeFileSync(input, png);
    const run = spawnSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-i",
      input,
      "-vf",
      "hqdn3d=2:1.5:0:0",
      output,
    ]);
    if (run.status !== 0)
      throw new Error(`ffmpeg hqdn3d failed: ${run.error?.message ?? run.stderr}`);
    return readFileSync(output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export interface RetouchOptions {
  crop?: { left: number; top: number; size: number };
  size?: number;
  sharpen?: boolean;
}

/** Returns the retouched master as WebP and what it measured on the way. */
export async function retouchPortrait(source: string | Buffer, options: RetouchOptions = {}) {
  const image = sharp(source).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const side = Math.min(width, height);
  const crop = options.crop ?? {
    left: Math.floor((width - side) / 2),
    top: Math.floor((height - side) / 2),
    size: side,
  };
  let cropped = image.extract({
    left: crop.left,
    top: crop.top,
    width: crop.size,
    height: crop.size,
  });
  let { data, info } = await cropped.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sigma = noiseSigma(data, info.width, info.height);
  if (sigma > NOISE_LIMIT) {
    const clean = denoise(await sharp(data, { raw: info }).png().toBuffer());
    ({ data, info } = await sharp(clean).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
  }
  const gains = neutralGains(data);
  const tone = toneCurve();
  const luts = gains.map((g) =>
    Array.from({ length: 256 }, (_, i) => tone[Math.min(255, Math.round(i * g))]),
  );
  for (let i = 0; i < data.length; i++) data[i] = luts[i % 3][data[i]];
  const size = options.size ?? Math.min(crop.size, MAX_SIZE);
  cropped = sharp(data, { raw: info }).resize({ width: size, height: size, kernel: "lanczos3" });
  // sharp-2: radius 1.2 px at web size, 1.7 px at full resolution, 70 %, threshold 2, on the L
  // channel only (sharp sharpens L in LAB whenever sigma is set; sigma = 1 + radius / 2).
  if (options.sharpen)
    cropped = cropped.sharpen({ sigma: 1 + (size > 1024 ? 1.7 : 1.2) / 2, m1: 0, m2: 0.7, x1: 2 });
  const webp = await cropped
    .webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  return { webp, size, sigma, denoised: sigma > NOISE_LIMIT, gains };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args.splice(i, 2)[1];
  };
  const cropArg = flag("--crop");
  const sizeArg = flag("--size");
  const sharpen = args.includes("--sharpen");
  const [source, out] = args.filter((a) => a !== "--sharpen");
  if (!source || !out) {
    console.error(
      "usage: bun run retouch:portrait <source> <out.webp> [--crop left,top,size] [--size px] [--sharpen]",
    );
    process.exit(2);
  }
  const [left, top, size] = cropArg?.split(",").map(Number) ?? [];
  const result = await retouchPortrait(source, {
    crop: cropArg ? { left, top, size } : undefined,
    size: sizeArg ? Number(sizeArg) : undefined,
    sharpen,
  });
  await Bun.write(out, result.webp);
  console.log(
    `${out}: ${result.size} px, noise ${result.sigma.toFixed(2)}${result.denoised ? " (denoised)" : ""}, gains ${result.gains.map((g) => g.toFixed(3)).join("/")}`,
  );
}
