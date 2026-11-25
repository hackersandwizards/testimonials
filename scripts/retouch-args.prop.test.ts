import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { parseRetouchArgs } from "./retouch-args.ts";

const coordinate = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
const positive = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });
const cropArbitrary = fc.record({ left: coordinate, top: coordinate, size: positive });
const pixelCount = (text: string, allowZero: boolean) => {
  if (
    text.length === 0 ||
    [...text].some((digit) => !"0123456789".includes(digit)) ||
    (!allowZero && text.startsWith("0"))
  )
    return undefined;
  const value = BigInt(text);
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : undefined;
};

test.prop([cropArbitrary, positive, fc.integer({ min: 0, max: 8 })], {
  examples: [[{ left: 0, top: Number.MAX_SAFE_INTEGER, size: 1 }, Number.MAX_SAFE_INTEGER, 3]],
})(
  "losslessly reads decimal pixel counts and allows leading zeros on coordinates",
  (crop, size, padding) => {
    const input = [
      String(crop.left).padStart(padding, "0"),
      String(crop.top).padStart(padding, "0"),
      String(crop.size),
    ].join(",");
    expect(parseRetouchArgs({ crop: input, size: String(size) })).toEqual({
      crop,
      size,
    });
  },
);

test.prop([fc.oneof(unicodeString, positive.map(String)), coordinate], {
  examples: [
    ["", 0],
    ["０", 1],
    ["١", 1],
    ["constructor", 1],
    ["__proto__", 1],
    ["toString", 1],
    ["0", 0],
    ["01", 1],
    ["+1", 1],
    ["-1", 1],
    ["1.5", 1],
    ["1e3", 1],
    ["1\n", 1],
    ["1,2", 1],
    ["1/2", 1],
    ["9007199254740992", 0],
    ["9".repeat(400), 1],
  ],
})(
  "reads each crop field and the output size according to its decimal grammar",
  (token, anchor) => {
    const offset = pixelCount(token, true);
    const count = pixelCount(token, false);
    for (const [crop, expected] of [
      [`${token},${anchor},1`, { left: offset, top: anchor, size: 1 }],
      [`${anchor},${token},1`, { left: anchor, top: offset, size: 1 }],
      [`${anchor},${anchor},${token}`, { left: anchor, top: anchor, size: count }],
    ] as const) {
      if (Object.values(expected).includes(undefined)) {
        expect(() => parseRetouchArgs({ crop })).toThrow(
          "--crop takes three whole numbers: left,top,size",
        );
      } else {
        expect(parseRetouchArgs({ crop }).crop).toEqual(expected);
      }
    }
    if (count === undefined) {
      expect(() => parseRetouchArgs({ size: token })).toThrow(
        "--size takes a whole number of pixels above 0",
      );
    } else {
      expect(parseRetouchArgs({ size: token }).size).toBe(count);
    }
  },
);

test.prop([cropArbitrary, fc.constantFrom(",", "/", ";", "，", " ")], {
  examples: [
    [{ left: 0, top: 0, size: 1 }, ","],
    [{ left: 0, top: 0, size: 1 }, "，"],
  ],
})("requires exactly three comma-separated crop fields", ({ left, top, size }, separator) => {
  for (const crop of [`${left},${top}`, `${left},${top},${size},${size}`, `${left},,${size}`]) {
    expect(() => parseRetouchArgs({ crop })).toThrow("--crop");
  }
  if (separator !== ",") {
    expect(() => parseRetouchArgs({ crop: [left, top, size].join(separator) })).toThrow("--crop");
  }
});
