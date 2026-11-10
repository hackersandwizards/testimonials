/**
 * Whether a rendered surface may show the entry: `allowed` it may (the company cleared it and h&w
 * chose it), `unreleased` it may not (h&w has not chosen it), `never` it may not at all. The data
 * itself is public either way.
 */
export type Surface = "allowed" | "unreleased" | "never";

export interface Mark {
  /** The company's slug in Company OS, where it has a record there. */
  slug: string;
  /** The name a logo wall shows. */
  name: string;
  /** File name in `marks/`, reached as `@hackersandwizards/testimonials/marks/<file>`; two
   * companies of one group may share a file, so key by `slug`. */
  file: string;
  surface: Surface;
  /** Share of a logo row's height at which the mark reads as heavy as the others. */
  scale: number;
  /** The file's own size in pixels, as sharp reads it, an SVG's at 72 dpi: the mark's aspect
   * ratio, and a raster's `<img width height>`. */
  size: { width: number; height: number };
  /** `true` where the mark draws its glyph on its own full-bleed tile, so no transparent ground
   * exists; such a mark stays `unreleased` until a transparent source replaces it. */
  ownTile?: boolean;
  /** `false` keeps the mark off generated onepagers. */
  onepager?: boolean;
  /** Where the file came from. */
  source?: string;
}

export interface Testimonial {
  id: string;
  person: {
    name: string;
    role: string;
    /** File name in `portraits/`, reached as `@hackersandwizards/testimonials/portraits/<file>`. */
    portrait: string;
    url: string;
  };
  /** As published with the quote; `slug` is the company's slug in Company OS. */
  company: { slug: string; name: string };
  /** As published. Where `original` is set, the other locale is a translation. */
  quote: { en: string; de: string };
  original?: "en" | "de";
  /** `testimonial`: written for publication; `feedback-mail`: taken from a feedback mail. */
  source: "testimonial" | "feedback-mail";
  /** When it was approved or written, as precise as known. */
  date?: string;
}

export declare const marks: Mark[];
export declare const testimonials: Testimonial[];
/** The marks a rendered surface may show, in display order. */
export declare const shownMarks: Mark[];
