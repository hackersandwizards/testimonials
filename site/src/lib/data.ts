import { marks, testimonials, type Mark, type Testimonial } from "@hackersandwizards/testimonials";

export { marks, testimonials, type Mark, type Testimonial };

const urls = (files: Record<string, string>) =>
  new Map(Object.entries(files).map(([path, url]) => [path.split("/").at(-1)!, url]));
const markUrls = urls(
  import.meta.glob<string>("../../../marks/*", { query: "?url", import: "default", eager: true }),
);
const portraitUrls = urls(
  import.meta.glob<string>("../../../portraits/*", {
    query: "?url",
    import: "default",
    eager: true,
  }),
);
const svgText = import.meta.glob<string>("../../../marks/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});
const inline = new Map(
  Object.entries(svgText)
    .filter(([, text]) => text.includes("currentColor"))
    .map(([path, text]) => [path.split("/").at(-1)!, text]),
);

export const markUrl = (mark: Mark) => markUrls.get(mark.file)!;
export const inlined = (mark: Mark) => inline.has(mark.file);

let drawn = 0;
/** The mark's SVG for one place on a page: the root's own classes dropped, which would meet the
 *  page's Tailwind, and every id prefixed, as a page draws a mark more than once. */
export const markSvg = (mark: Mark) => {
  const prefix = `mark${++drawn}-`;
  return inline
    .get(mark.file)!
    .replace(/(<svg\b[^>]*?)\s+class="[^"]*"/, "$1 ")
    .replaceAll(/\bid=(["'])/g, `id=$1${prefix}`)
    .replaceAll(/url\((["']?)#/g, `url($1#${prefix}`)
    .replaceAll(/href=(["'])#/g, `href=$1#${prefix}`);
};
export const portraitUrl = (t: Testimonial) => portraitUrls.get(t.person.portrait)!;

export const surfaceLabel: Record<Mark["surface"], string> = {
  allowed: "Allowed",
  unreleased: "Unreleased",
  never: "Never",
};

export const sourceLabel: Record<Testimonial["source"], string> = {
  testimonial: "Written for publication",
  "feedback-mail": "From a feedback mail",
};

export const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const markOf = (t: Testimonial) => marks.find((m) => m.slug === t.company.slug);
export const quotesOf = (m: Mark) => testimonials.filter((t) => t.company.slug === m.slug);
export const sharing = (m: Mark) => marks.filter((o) => o.file === m.file && o.slug !== m.slug);

/** Drops the values no row holds, then each facet left with one value, which splits nothing. */
export const splitting = <F extends { param: string; options: { value: string }[] }>(
  facets: F[],
  items: { facets: Record<string, string[]> }[],
) =>
  facets
    .map((f) => ({
      ...f,
      options: f.options.filter((o) => items.some((i) => i.facets[f.param]?.includes(o.value))),
    }))
    .filter((f) => f.options.length > 1);

export const filterCopy = {
  all: "All",
  clear: "Clear all",
  submit: "Search",
  filters: "Filters",
};

export const locales = [
  { key: "en", name: "English" },
  { key: "de", name: "German" },
] as const;

export const missing = (t: Testimonial) => {
  const mark = markOf(t);
  return [
    ...locales.filter((l) => !t.quote[l.key]?.trim()).map((l) => `${l.name} quote`),
    !t.date && "date",
    !mark && "company mark",
    mark && mark.surface !== "allowed" && `a mark a surface may show (it is ${mark.surface})`,
  ].filter((x): x is string => Boolean(x));
};
