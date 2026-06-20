/** Types for the Open Graph card renderer. */

/** A plain Satori vnode (the shape `{ type, props }` Satori consumes). */
export interface OgEl {
  type: string;
  props: {
    style: Record<string, string | number>;
    children?: OgEl | OgEl[] | string;
  };
}

/** A labelled statistic shown in the card's bottom row. */
export interface OgStat {
  value: string;
  label: string;
}

/** The data for a personalised profile card. */
export interface OgProfileModel {
  handle: string;
  hours: string;
  objects: string;
  nights: string;
  frames: string;
}
