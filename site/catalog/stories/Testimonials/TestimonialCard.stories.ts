import TestimonialCard from "../../../src/components/TestimonialCard.astro";
import { frame, quote } from "../entries";
import { markOf, missing } from "../../../src/lib/data";

export default { component: TestimonialCard };

const list = [frame({ list: true })];
const quoteCard = (what: string, test: Parameters<typeof quote>[1]) => ({
  args: { testimonial: quote(what, test) },
  decorators: list,
});

export const Complete = quoteCard("with nothing missing", (t) => missing(t).length === 0);
export const Translated = quoteCard("with a recorded original", (t) => Boolean(t.original));
export const FeedbackMail = quoteCard("from a feedback mail", (t) => t.source === "feedback-mail");
export const UnreleasedMark = quoteCard(
  "whose mark is unreleased",
  (t) => markOf(t)?.surface === "unreleased",
);
export const NoMark = quoteCard("without a mark", (t) => !markOf(t));
