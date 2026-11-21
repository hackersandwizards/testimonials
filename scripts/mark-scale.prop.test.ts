import { fc, test } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { scale } from "./mark-scale.ts";

const byte = fc.integer({ min: 0, max: 255 });
const uniformPixel = fc.oneof(
  byte.map((alpha): [number, number, number, number] => [0, 0, 0, alpha]),
  fc.tuple(byte, byte, byte, fc.constant(255)),
);

test.prop([fc.integer({ min: 1, max: 160 }), fc.integer({ min: 1, max: 16 }), uniformPixel], {
  examples: [
    [1, 1, [255, 255, 255, 255]],
    [1, 16, [0, 0, 0, 255]],
    [160, 1, [0, 0, 0, 0]],
    [6, 2, [0, 0, 0, 255]],
    [6, 2, [0, 0, 0, 64]],
    [6, 2, [0, 0, 0, 128]],
    [8, 2, [255, 0, 0, 255]],
    [8, 2, [0, 255, 0, 255]],
    [8, 2, [0, 0, 255, 255]],
  ],
})(
  "a uniform mark reserves row area by aspect and visible ink, capped at row height",
  async (width, height, [red, green, blue, alpha]) => {
    const rowInk =
      ((alpha / 255) * (0.2126 * (255 - red) + 0.7152 * (255 - green) + 0.0722 * (255 - blue))) /
      255;
    const inkWeight =
      rowInk < 0.27 / 1.6 ** 2 ? 1.6 : rowInk > 0.27 / 0.8 ** 2 ? 0.8 : Math.sqrt(0.27 / rowInk);
    const expected = Math.min(1, Math.sqrt(1.1 * inkWeight) * (height / width) ** 0.45);
    const data = Buffer.alloc(width * height * 4, Buffer.from([red, green, blue, alpha]));
    const result = await scale({ data, info: { width, height, channels: 4 } });

    expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.0005 + Number.EPSILON);
    expect(result).toBe(Number(result.toFixed(3)));
  },
);
