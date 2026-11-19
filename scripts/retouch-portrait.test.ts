import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import sharp from "sharp";
import {
  denoise,
  neutralGains,
  noiseSigma,
  parseRetouchArgs,
  retouchPortrait,
  toneCurve,
} from "./retouch-portrait.ts";

const solid = (rgb: [number, number, number], pixels: number) =>
  Uint8Array.from({ length: pixels * 3 }, (_, i) => rgb[i % 3]);
const ffmpegError = spawnSync("ffmpeg", ["-version"]).error;
const ffmpegMissing = ffmpegError && "code" in ffmpegError && ffmpegError.code === "ENOENT";

describe("retouch-portrait", () => {
  test("the tone curve rises and flattens towards white", () => {
    const tone = toneCurve();
    expect(tone.every((v, i) => i === 0 || v >= tone[i - 1])).toBe(true);
    expect(tone[255] - tone[245]).toBeLessThan(tone[135] - tone[125]);
    expect(tone[255]).toBe(255);
  });

  test("the portrait tone curve preserves its shadow, midtone and highlight values", () => {
    const tone = toneCurve();
    expect([0, 32, 128, 192, 224, 245, 255].map((level) => tone[level])).toEqual([
      0, 30, 131, 198, 234, 252, 255,
    ]);
  });

  test("a warm grey wall gets cooled, held within 5 %", () => {
    const [r, g, b] = neutralGains(solid([130, 126, 122], 1000));
    expect(r).toBeLessThan(1);
    expect(b).toBeGreaterThan(1);
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(0.95);
    expect(neutralGains(solid([200, 40, 40], 1000))).toEqual([1, 1, 1]);
  });

  test("a one-percent neutral patch sets the balance without picking up saturated or extreme tones", () => {
    const warmGrey: [number, number, number] = [130, 126, 122];
    const pixels = solid([200, 40, 40], 100);
    pixels.set(warmGrey);
    expect(neutralGains(pixels)).toEqual(neutralGains(solid(warmGrey, 100)));
    expect(neutralGains(pixels)[0]).toBeCloseTo(0.9692, 4);
    for (const rgb of [
      [100, 96, 92],
      [40, 39, 38],
      [245, 239, 233],
    ] as const)
      expect(neutralGains(Uint8Array.from(rgb))).toEqual([1, 1, 1]);
  });

  test("white balance caps the correction in both directions", () => {
    expect(neutralGains(solid([201, 185, 185], 9))[0]).toBe(0.95);
    expect(neutralGains(solid([201, 201, 185], 9))[2]).toBe(1.05);
  });

  test("noise reads near zero on a flat image and high on random pixels", () => {
    expect(noiseSigma(solid([128, 128, 128], 64 * 64), 64, 64)).toBe(0);
    const noisy = Uint8Array.from({ length: 64 * 64 * 3 }, (_, i) => (i * 7919) % 256);
    expect(noiseSigma(noisy, 64, 64)).toBeGreaterThan(20);
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

  test("crops to a square master and caps it at 1760 px", async () => {
    const source = await sharp({
      create: { width: 2400, height: 1900, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();
    const { webp, size } = await retouchPortrait(source, { sharpen: true });
    const meta = await sharp(webp).metadata();
    expect([size, meta.width, meta.height, meta.format]).toEqual([1760, 1760, 1760, "webp"]);
    expect(await rejection(retouchPortrait(source, { size: 1761 }))).toContain("limit");
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
    expect(
      await rejection(retouchPortrait(source, { crop: { left: 1, top: 18, size: 24 } })),
    ).toContain("reaches past the 24×60 source");
  });

  test("the CLI takes exactly three whole numbers for --crop and a positive one for --size", () => {
    expect(parseRetouchArgs({ crop: "10,20,300", size: "200" })).toEqual({
      crop: { left: 10, top: 20, size: 300 },
      size: 200,
    });
    expect(parseRetouchArgs({})).toEqual({ crop: undefined, size: undefined });
    for (const crop of ["10,,300", "1,2,3,4", "1,2", "1,-2,3", "1.5,2,3", "0,0,0"])
      expect(() => parseRetouchArgs({ crop })).toThrow("--crop");
    for (const size of ["0", "-5", "1.5", "x"])
      expect(() => parseRetouchArgs({ size })).toThrow("--size");
  });
});
