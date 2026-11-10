// Plain JavaScript, so Node imports it from node_modules; the types are in index.d.ts.
import marksData from "../data/marks.json" with { type: "json" };
import testimonialsData from "../data/testimonials.json" with { type: "json" };

export const marks = marksData;
export const testimonials = testimonialsData;
export const shownMarks = marks.filter((mark) => mark.surface === "allowed");
