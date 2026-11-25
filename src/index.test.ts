import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import sharp from "sharp";
import { marks, shownMarks, testimonials, type Surface } from "./index.js";

const root = `${import.meta.dir}/../`;
const surfaces: Surface[] = ["allowed", "unreleased", "never"];
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const listed = (dir: string) =>
  readdirSync(`${root}${dir}`).filter((file) => !file.startsWith("."));
const duplicates = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i);

describe("marks", () => {
  test("each slug once, in the slug form", () => {
    expect(duplicates(marks.map((mark) => mark.slug))).toEqual([]);
    expect(marks.filter((mark) => !slug.test(mark.slug))).toEqual([]);
  });

  test("each mark has a name, a known surface and a file in marks/", () => {
    expect(marks.filter((mark) => mark.name.trim() === "")).toEqual([]);
    expect(marks.filter((mark) => !surfaces.includes(mark.surface))).toEqual([]);
    expect(marks.filter((mark) => !existsSync(`${root}marks/${mark.file}`))).toEqual([]);
  });

  test("each mark scale is above zero and at most one", () => {
    expect(marks.filter((mark) => !Number.isFinite(mark.scale))).toEqual([]);
    expect(marks.filter((mark) => mark.scale <= 0)).toEqual([]);
    expect(marks.filter((mark) => mark.scale > 1)).toEqual([]);
  });

  test("each optional mark flag only stores its non-default value", () => {
    expect(marks.filter((mark) => ![undefined, false].includes(mark.onepager))).toEqual([]);
    expect(marks.filter((mark) => ![undefined, false].includes(mark.strip))).toEqual([]);
    expect(marks.filter((mark) => ![undefined, true].includes(mark.ownTile))).toEqual([]);
  });

  test("marks with their own tile stay unreleased", () => {
    const ownTiles = marks.filter((mark) => mark.ownTile);
    expect(ownTiles.filter((mark) => mark.surface !== "unreleased")).toEqual([]);
  });

  test("every file in marks/ belongs to an entry", () => {
    const named = new Set(marks.map((mark) => mark.file));
    expect(listed("marks").filter((file) => !named.has(file))).toEqual([]);
  });

  test("the shown marks lead and the rest follows by slug", () => {
    expect(shownMarks).toEqual(marks.slice(0, shownMarks.length));
    expect(shownMarks.every((mark) => mark.surface === "allowed")).toBe(true);
    const rest = marks.slice(shownMarks.length);
    expect(rest.filter((mark) => mark.surface === "allowed")).toEqual([]);
    expect(rest.map((mark) => mark.slug)).toEqual(rest.map((mark) => mark.slug).sort());
  });

  test("Beta Systems, momox, saas.group and Temedica follow SDK directly, as in website fcbe40c1", () => {
    const pinned = ["sdk", "beta-systems", "momox", "saas-group", "temedica"];
    const shown = shownMarks.map((mark) => mark.slug);
    const sdk = shown.indexOf("sdk");
    expect(shown.slice(sdk, sdk + pinned.length)).toEqual(pinned);
  });

  test("OBI is never shown", () => {
    expect(marks.find((mark) => mark.slug === "obi")?.surface).toBe("never");
  });
});

describe("testimonials", () => {
  test("testimonial IDs are unique and IDs and company slugs use the slug form", () => {
    expect(duplicates(testimonials.map((t) => t.id))).toEqual([]);
    expect(testimonials.filter((t) => !slug.test(t.id))).toEqual([]);
    expect(testimonials.filter((t) => !slug.test(t.company.slug))).toEqual([]);
  });

  test("each quote is present in both languages", () => {
    expect(testimonials.filter((t) => t.quote.en.trim() === "")).toEqual([]);
    expect(testimonials.filter((t) => t.quote.de.trim() === "")).toEqual([]);
  });

  test("each quoted person has a name, a role, an HTTPS URL and a portrait file", () => {
    expect(testimonials.filter((t) => t.person.name.trim() === "")).toEqual([]);
    expect(testimonials.filter((t) => t.person.role.trim() === "")).toEqual([]);
    expect(testimonials.filter((t) => !t.person.url.startsWith("https://"))).toEqual([]);
    expect(
      testimonials.filter((t) => !existsSync(`${root}portraits/${t.person.portrait}`)),
    ).toEqual([]);
  });

  test("each testimonial has a known source and any original language is known", () => {
    expect(
      testimonials.filter((t) => !["testimonial", "feedback-mail"].includes(t.source)),
    ).toEqual([]);
    expect(testimonials.filter((t) => ![undefined, "en", "de"].includes(t.original))).toEqual([]);
  });

  test("at least one testimonial has a date and all dates use YYYY-MM or YYYY-MM-DD", () => {
    const dates = testimonials.map((t) => t.date).filter((date) => date !== undefined);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.filter((date) => !/^\d{4}-\d{2}(-\d{2})?$/.test(date))).toEqual([]);
  });

  test("each portrait is a square WebP", async () => {
    const read = await Promise.all(
      testimonials.map(async ({ person: { portrait } }) => {
        const { format, width, height } = await sharp(`${root}portraits/${portrait}`).metadata();
        const extension = portrait.match(/\.[^./]*$/)?.[0];
        return { portrait, format, extension, square: width === height };
      }),
    );
    expect(read).toEqual(
      testimonials.map(({ person: { portrait } }) => ({
        portrait,
        format: "webp",
        extension: ".webp",
        square: true,
      })),
    );
  });

  test("every file in portraits/ belongs to a testimonial", () => {
    const named = new Set(testimonials.map((t) => t.person.portrait));
    expect(listed("portraits").filter((file) => !named.has(file))).toEqual([]);
  });
});

describe("entry", () => {
  test("exports the data and shownMarks, nothing else", async () => {
    expect(Object.keys(await import("./index.js")).sort()).toEqual([
      "marks",
      "shownMarks",
      "testimonials",
    ]);
  });

  // Node refuses TypeScript under node_modules; with stripping off, it refuses it here too.
  test("plain Node imports the package by name", () => {
    const run = spawnSync(
      "node",
      [
        "--no-experimental-strip-types",
        "--input-type=module",
        "-e",
        'const m = await import("@hackersandwizards/testimonials"); console.log(m.shownMarks.length)',
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect({
      status: run.status,
      stdout: run.stdout.trim(),
    }).toEqual({
      status: 0,
      stdout: String(shownMarks.length),
    });
    expect(typeof run.stderr).toBe("string");
  });
});
