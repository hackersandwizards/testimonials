import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { neutralGains, noiseSigma, retouchPortrait, toneCurve } from "./retouch-portrait.ts";

const solid = (rgb: [number, number, number], pixels: number) =>
  Uint8Array.from({ length: pixels * 3 }, (_, i) => rgb[i % 3]);

describe("retouch-portrait", () => {
  test("the tone curve rises and flattens towards white", () => {
    const tone = toneCurve();
    expect(tone.every((v, i) => i === 0 || v >= tone[i - 1])).toBe(true);
    expect(tone[255] - tone[245]).toBeLessThan(tone[135] - tone[125]);
    expect(tone[255]).toBe(255);
  });

  test("a warm grey wall gets cooled, held within 5 %", () => {
    const [r, g, b] = neutralGains(solid([130, 126, 122], 1000));
    expect(r).toBeLessThan(1);
    expect(b).toBeGreaterThan(1);
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(0.95);
    expect(neutralGains(solid([200, 40, 40], 1000))).toEqual([1, 1, 1]);
  });

  test("noise reads near zero on a flat image and high on random pixels", () => {
    expect(noiseSigma(solid([128, 128, 128], 64 * 64), 64, 64)).toBe(0);
    const noisy = Uint8Array.from({ length: 64 * 64 * 3 }, (_, i) => (i * 7919) % 256);
    expect(noiseSigma(noisy, 64, 64)).toBeGreaterThan(20);
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
  });
});
