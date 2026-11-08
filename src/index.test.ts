import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import sharp from "sharp";
import { marks, shownMarks, testimonials, type Surface } from "./index.js";

const root = `${import.meta.dir}/../`;
const surfaces: Surface[] = ["allowed", "unreleased", "never"];
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const unique = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i);

describe("marks", () => {
  test("each slug once, in the slug form", () => {
    expect(unique(marks.map((mark) => mark.slug))).toEqual([]);
    expect(marks.filter((mark) => !slug.test(mark.slug))).toEqual([]);
  });

  test("each entry names a file, a name and a known surface", () => {
    for (const mark of marks) {
      expect(mark.name.trim()).not.toBe("");
      expect(surfaces).toContain(mark.surface);
      expect(existsSync(`${root}marks/${mark.file}`)).toBe(true);
      expect(mark.scale).toBeGreaterThan(0);
      expect(mark.scale).toBeLessThanOrEqual(1);
      expect([undefined, false]).toContain(mark.onepager);
    }
  });

  test("every file in marks/ belongs to an entry", () => {
    const named = new Set(marks.map((mark) => mark.file));
    expect(readdirSync(`${root}marks`).filter((file) => !named.has(file))).toEqual([]);
  });

  test("size is the file's own, as sharp reads it", async () => {
    const read = await Promise.all(
      marks.map(async ({ file }) => {
        const { width, height } = await sharp(`${root}marks/${file}`).metadata();
        return { file, width, height };
      }),
    );
    expect(marks.map(({ file, size }) => ({ file, ...size }))).toEqual(read);
  });

  test("OBI is never shown", () => {
    expect(marks.find((mark) => mark.slug === "obi")?.surface).toBe("never");
  });
});

describe("testimonials", () => {
  test("each id once", () => {
    expect(unique(testimonials.map((t) => t.id))).toEqual([]);
    expect(testimonials.filter((t) => !slug.test(t.id) || !slug.test(t.company.slug))).toEqual([]);
  });

  test("each quote in both languages, with person, role and portrait", () => {
    for (const t of testimonials) {
      expect(t.quote.en.trim()).not.toBe("");
      expect(t.quote.de.trim()).not.toBe("");
      expect(t.person.name.trim()).not.toBe("");
      expect(t.person.role.trim()).not.toBe("");
      expect(t.person.url).toStartWith("https://");
      expect(existsSync(`${root}portraits/${t.person.portrait}`)).toBe(true);
      expect(["testimonial", "feedback-mail"]).toContain(t.source);
      expect([undefined, "en", "de"]).toContain(t.original);
      if (t.date !== undefined) expect(t.date).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
    }
  });

  test("every file in portraits/ belongs to a testimonial", () => {
    const named = new Set(testimonials.map((t) => t.person.portrait));
    expect(readdirSync(`${root}portraits`).filter((file) => !named.has(file))).toEqual([]);
  });
});

describe("entry", () => {
  // Node refuses TypeScript under node_modules; with stripping off, it refuses it here too.
  test("plain Node imports the package by name", () => {
    const run = Bun.spawnSync(
      [
        "node",
        "--no-experimental-strip-types",
        "--input-type=module",
        "-e",
        'const m = await import("@hackersandwizards/testimonials"); console.log(m.shownMarks.length)',
      ],
      { cwd: root },
    );
    expect(run.stdout.toString().trim()).toBe(String(shownMarks.length));
  });
});
