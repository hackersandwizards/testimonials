import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import sharp from "sharp";
import { neutralGains, noiseSigma, toneCurve } from "./portrait-math.ts";
import { parseRetouchArgs } from "./retouch-args.ts";
import { denoise, masterFrame, retouchPortrait } from "./retouch-portrait.ts";

const solid = (rgb: [number, number, number], pixels: number) =>
  Uint8Array.from({ length: pixels * 3 }, (_, i) => rgb[i % 3]);
const ffmpegError = spawnSync("ffmpeg", ["-version"]).error;
const ffmpegMissing = ffmpegError && "code" in ffmpegError && ffmpegError.code === "ENOENT";

describe("master frame", () => {
  test.each([
    {
      name: "centres the square of a landscape source",
      source: { width: 61, height: 24 },
      options: {},
      expected: { crop: { left: 18, top: 0, size: 24 }, size: 24 },
    },
    {
      name: "centres the square of a tall source",
      source: { width: 24, height: 61 },
      options: {},
      expected: { crop: { left: 0, top: 18, size: 24 }, size: 24 },
    },
    {
      name: "uses the requested crop and size",
      source: { width: 60, height: 24 },
      options: { crop: { left: 2, top: 3, size: 20 }, size: 10 },
      expected: { crop: { left: 2, top: 3, size: 20 }, size: 10 },
    },
    {
      name: "caps the default master at 1760 px",
      source: { width: 2400, height: 1900 },
      options: {},
      expected: { crop: { left: 250, top: 0, size: 1900 }, size: 1760 },
    },
  ])("$name", ({ source, options, expected }) => {
    expect(masterFrame(source, options)).toEqual(expected);
  });

  test.each([
    {
      name: "rejects a crop that reaches past the source",
      source: { width: 24, height: 60 },
      options: { crop: { left: 1, top: 18, size: 24 } },
      error: "--crop 1,18,24 reaches past the 24×60 source",
    },
    {
      name: "rejects a size above the crop’s limit",
      source: { width: 24, height: 60 },
      options: { crop: { left: 0, top: 18, size: 20 }, size: 21 },
      error: "--size 21 is above the 20 px limit of this crop",
    },
    {
      name: "rejects a master above the 1760 px cap",
      source: { width: 2400, height: 1900 },
      options: { size: 1761 },
      error: "--size 1761 is above the 1760 px limit of this crop",
    },
  ])("$name", ({ source, options, error }) => {
    expect(() => masterFrame(source, options)).toThrow(new Error(error));
  });
});

describe("retouch-portrait", () => {
  test("the portrait tone curve preserves its shadow, midtone and highlight values", () => {
    const tone = toneCurve();
    expect([0, 32, 128, 192, 224, 245, 255].map((level) => tone[level])).toEqual([
      0, 30, 131, 198, 234, 252, 255,
    ]);
  });

  test("the portrait tone curve stays in byte range without reversing adjacent levels", () => {
    const tone = toneCurve();
    expect(tone).toHaveLength(256);
    expect(tone).toEqual(tone.toSorted((a, b) => a - b));
    expect(Math.min(...tone)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...tone)).toBeLessThanOrEqual(255);
  });

  test("the portrait tone curve rises more slowly in the highlights than in the midtones", () => {
    const tone = toneCurve();
    expect(tone[255] - tone[245]).toBeLessThan(tone[135] - tone[125]);
  });

  test("an empty RGB buffer needs no white balance", () => {
    expect(neutralGains(new Uint8Array())).toEqual([1, 1, 1]);
  });

  test("a 1×2 RGB image has no neighbourhood from which to estimate noise", () => {
    expect(noiseSigma(new Uint8Array(6), 1, 2)).toBe(0);
  });

  test("noise weights coloured hot pixels by luminance and allows for the frame boundary", () => {
    const width = 5;
    const height = 6;
    const hotPixels = [
      { x: 1, y: 1, channel: 0, sigma: 11.945 },
      { x: 2, y: 1, channel: 1, sigma: 31.267 },
      { x: 1, y: 3, channel: 2, sigma: 6.072 },
    ];
    for (const { x, y, channel, sigma } of hotPixels) {
      const rgb = new Uint8Array(width * height * 3);
      rgb[(y * width + x) * 3 + channel] = 255;
      expect(noiseSigma(rgb, width, height)).toBeCloseTo(sigma, 3);
    }
  });

  test.skipIf(ffmpegMissing)("the denoise filter lowers the noise of one frame", () => {
    const side = 64;
    const noisy = Uint8Array.from({ length: side * side * 3 }, (_, i) => {
      return 123 + ((Math.floor(i / 3) * 7919) % 11);
    });
    expect(noiseSigma(denoise(noisy, side, side), side, side)).toBeLessThan(
      noiseSigma(noisy, side, side) * 0.9,
    );
    const ramp = Uint8Array.from({ length: 256 * 4 * 3 }, (_, i) => Math.floor(i / 3) % 256);
    const smooth = denoise(ramp, 256, 4);
    expect(new Set(smooth).size).toBeGreaterThanOrEqual(250);
    expect(Math.max(...smooth.map((v, i) => Math.abs(v - ramp[i])))).toBeLessThanOrEqual(2);
    expect(() => denoise(ramp, 0, 4)).toThrow("ffmpeg hqdn3d failed");
  });

  test("encodes a 1760 px square WebP master", async () => {
    const source = await sharp({
      create: { width: 2400, height: 1900, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();
    const { webp, size } = await retouchPortrait(source, { sharpen: true });
    const meta = await sharp(webp).metadata();
    expect([size, meta.width, meta.height, meta.format]).toEqual([1760, 1760, 1760, "webp"]);
    expect(await rejection(retouchPortrait(source, { size: 1761 }))).toContain(
      "--size 1761 is above the 1760 px limit of this crop",
    );
  });

  test("crops a photo stored with an EXIF rotation from its upright size", async () => {
    const source = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#888" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect((await retouchPortrait(source, { crop: { left: 0, top: 100, size: 300 } })).size).toBe(
      300,
    );
    expect(
      await rejection(retouchPortrait(source, { crop: { left: 0, top: 101, size: 300 } })),
    ).toContain("reaches past the 300×400 source");
  });

  test("centres a tall portrait and neutralises its warm grey patch without denoising", async () => {
    const width = 24;
    const height = 60;
    const pixels = Buffer.alloc(width * height * 3, 16);
    pixels.set(solid([130, 126, 122], width * width), 18 * width * 3);
    const source = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
    const { webp, size, denoised } = await retouchPortrait(source);
    const rgb = await sharp(webp).raw().toBuffer();
    expect(size).toBe(24);
    expect(denoised).toBe(false);
    expect(Math.min(...rgb)).toBeGreaterThan(124);
    expect(Math.max(...rgb)).toBeLessThan(133);
    expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThanOrEqual(2);
  });

  test("the CLI can omit both crop and output size", () => {
    expect(parseRetouchArgs({})).toEqual({ crop: undefined, size: undefined });
  });

  test("the CLI rejects the first pixel count above the safe integer limit", () => {
    expect(() => parseRetouchArgs({ crop: "9007199254740992,0,1" })).toThrow("--crop");
  });
});
