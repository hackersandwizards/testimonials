import MarkCard from "../../../src/components/MarkCard.astro";
import { frame, mark } from "../entries";
import { inlined } from "../../../src/lib/data";

export default { component: MarkCard };

const list = [frame({ list: true })];
const markCard = (what: string, test: Parameters<typeof mark>[1]) => ({
  args: { mark: mark(what, test) },
  decorators: list,
});

export const Allowed = markCard("allowed", (m) => m.surface === "allowed");
export const Unreleased = markCard("unreleased", (m) => m.surface === "unreleased");
export const Never = markCard("never shown", (m) => m.surface === "never");
export const OwnTile = markCard("on its own tile", (m) => Boolean(m.ownTile));
export const CurrentColor = markCard("filling with currentColor", (m) => Boolean(inlined(m)));
