import { fc, test } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { neutralGains, noiseSigma, toneCurve } from "./portrait-math.ts";

const byte = fc.integer({ min: 0, max: 255 });
const rgb = fc.tuple(byte, byte, byte);

test.prop([byte, byte], {
  examples: [
    [0, 255],
    [190, 191],
    [191, 192],
    [249, 250],
  ],
})(
  "the tone curve stays within byte range and preserves the order of light levels",
  (first, second) => {
    const tone = toneCurve();
    const low = tone[Math.min(first, second)];
    const high = tone[Math.max(first, second)];
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(255);
    expect(low).toBeLessThanOrEqual(high);
  },
);

test.prop([rgb, fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 })], {
  examples: [
    [[41, 40, 39], 1, 99],
    [[244, 244, 225], 3, 97],
    [[40, 39, 38], 1, 0],
    [[245, 239, 233], 1, 0],
    [[100, 96, 92], 1, 0],
    [[201, 185, 185], 1, 0],
    [[201, 201, 185], 1, 0],
    [[130, 126, 122], 1, 100],
    [[0, 0, 0], 0, 0],
  ],
})(
  "balances a neutral patch when it covers at least one percent of the pixels",
  (patch, patchPixels, saturatedPixels) => {
    const image = new Uint8Array((patchPixels + saturatedPixels) * 3);
    for (let i = 0; i < patchPixels; i++) image.set(patch, i * 3);
    for (let i = patchPixels; i < patchPixels + saturatedPixels; i++)
      image.set([200, 40, 40], i * 3);
    const brightest = Math.max(...patch);
    const dimmest = Math.min(...patch);
    const qualifies =
      brightest >= 41 && brightest <= 244 && (brightest - dimmest) * 100 < 8 * brightest;
    const grey = patch.reduce((sum, value) => sum + value, 0) / 3;
    const expected =
      qualifies && patchPixels > 0 && 99 * patchPixels >= saturatedPixels
        ? patch.map((channel) => Math.min(1.05, Math.max(0.95, grey / channel)))
        : [1, 1, 1];

    const gains = neutralGains(image);
    for (const [channel, gain] of gains.entries()) expect(gain).toBeCloseTo(expected[channel], 12);
  },
);

const dimension = fc.integer({ min: 1, max: 16 });

test.prop([dimension, dimension, rgb], {
  examples: [
    [1, 1, [0, 0, 0]],
    [1, 2, [0, 0, 0]],
    [2, 2, [255, 255, 255]],
    [2, 3, [128, 128, 128]],
    [3, 2, [1, 2, 3]],
    [3, 3, [255, 0, 255]],
  ],
})("a flat field has zero estimated noise at every image size", (width, height, colour) => {
  const image = Uint8Array.from({ length: width * height * 3 }, (_, index) => colour[index % 3]);
  expect(noiseSigma(image, width, height)).toBe(0);
});

test.prop([fc.array(rgb, { minLength: 9, maxLength: 9 })], {
  examples: [
    [
      [
        [19, 37, 0],
        [0, 12, 180],
        [4, 9, 2],
        [90, 10, 200],
        [70, 3, 10],
        [0, 140, 40],
        [25, 5, 31],
        [1, 91, 130],
        [81, 9, 0],
      ],
    ],
  ],
})("a single neighbourhood contributes its weighted luminance response", (pixels) => {
  const weights = [1, -2, 1, -2, 4, -2, 1, -2, 1];
  const response = pixels.reduce((sum, [r, g, b], index) => {
    const luminance = (299 * r + 587 * g + 114 * b) / 1000;
    return sum + weights[index] * luminance;
  }, 0);
  const expected = (Math.abs(response) * Math.sqrt(Math.PI / 2)) / 6;

  expect(noiseSigma(Uint8Array.from(pixels.flat()), 3, 3)).toBeCloseTo(expected, 4);
});
