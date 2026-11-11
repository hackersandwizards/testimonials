// Stories draw real entries, each picked by the property its state shows rather than by name, so
// a state follows the data and a story file names nobody.
import {
  markOf,
  marks,
  markSvg,
  missing,
  testimonials,
  type Mark,
  type Testimonial,
} from "../../src/lib/data";
import Frame from "./Frame.astro";

const first = <T>(list: T[], what: string, test: (x: T) => boolean) => {
  const found = list.find(test);
  if (!found) throw new Error(`no entry ${what}: drop the story or pick another state`);
  return found;
};

export const quote = (what: string, test: (t: Testimonial) => boolean) =>
  first(testimonials, what, test);
export const mark = (what: string, test: (m: Mark) => boolean) => first(marks, what, test);

export { markOf, markSvg, missing };

/** The story's ground; `list` holds a card in a list as the pages do. */
export const frame = (props: { list?: boolean } = {}) => ({ component: Frame, props });
