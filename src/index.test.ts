import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import sharp from "sharp";
import * as entry from "./index.js";
import { marks, neverNamed, shownMarks, testimonials, type Surface } from "./index.js";

const root = `${import.meta.dir}/../`;
const surfaces: Surface[] = ["allowed", "unreleased", "never"];
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Dotfiles such as Finder's .DS_Store stay out of git and the package.
const listed = (dir: string) =>
  readdirSync(`${root}${dir}`).filter((file) => !file.startsWith("."));
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
      expect([undefined, true]).toContain(mark.ownTile);
    }
  });

  test("every file in marks/ belongs to an entry", () => {
    const named = new Set(marks.map((mark) => mark.file));
    expect(listed("marks").filter((file) => !named.has(file))).toEqual([]);
  });

  test("the shown marks lead and the rest follows by slug", () => {
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

describe("never named", () => {
  test("each name once, with a reason, and none a mark's name", () => {
    const lower = (name: string) => name.toLowerCase();
    expect(unique(neverNamed.map(({ name }) => lower(name)))).toEqual([]);
    expect(neverNamed.filter(({ name, reason }) => !name.trim() || !reason.trim())).toEqual([]);
    const markNames = new Set(marks.map(({ name }) => lower(name)));
    expect(neverNamed.filter(({ name }) => markNames.has(lower(name)))).toEqual([]);
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

  test("each portrait is a square WebP", async () => {
    const read = await Promise.all(
      testimonials.map(async ({ person: { portrait } }) => {
        const { format, width, height } = await sharp(`${root}portraits/${portrait}`).metadata();
        return { portrait, format, square: width === height };
      }),
    );
    expect(read.filter(({ format, square }) => format !== "webp" || !square)).toEqual([]);
  });

  test("every file in portraits/ belongs to a testimonial", () => {
    const named = new Set(testimonials.map((t) => t.person.portrait));
    expect(listed("portraits").filter((file) => !named.has(file))).toEqual([]);
  });
});

describe("entry", () => {
  // The list came in 2.2.0 beside the marks, so the exports before it keep their output.
  test("exports the data, shownMarks and the never-named list, nothing else", () => {
    expect(Object.keys(entry).sort()).toEqual([
      "marks",
      "neverNamed",
      "shownMarks",
      "testimonials",
    ]);
    expect(shownMarks).toEqual(marks.filter(({ surface }) => surface === "allowed"));
  });

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
    expect({
      status: run.exitCode,
      stdout: run.stdout.toString().trim(),
      stderr: run.stderr.toString(),
    }).toEqual({
      status: 0,
      stdout: String(shownMarks.length),
      stderr: expect.any(String),
    });
  });
});
