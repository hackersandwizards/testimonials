import MarkImage from "../../../src/components/MarkImage.astro";
import { frame, mark } from "../entries";
import { inlined } from "../../../src/lib/data";

export default { component: MarkImage };

const ground = [frame()];
const markImage = (what: string, test: Parameters<typeof mark>[1]) => ({
  args: { mark: mark(what, test), row: 48 },
  decorators: ground,
});

export const Svg = markImage("an SVG", (m) => m.file.endsWith(".svg") && !inlined(m));
export const Raster = markImage("a raster", (m) => !m.file.endsWith(".svg"));
export const CurrentColor = markImage("filling with currentColor", (m) => Boolean(inlined(m)));
