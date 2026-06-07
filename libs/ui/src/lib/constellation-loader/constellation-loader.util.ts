import {
  CL_BIG,
  CL_EDGES,
  CL_NODES,
  CL_PALETTE,
  CL_STAR_COUNT,
} from './constellation-loader.constants';

/** A point in the loader's 140×140 viewBox. */
type Point = readonly [number, number];

/** Euclidean length of an edge — used to seed the stroke-dash line-draw. */
export function edgeLength(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Four-point sparkle/diamond path centred at (cx, cy) with radius `r`. */
function sparklePath(cx: number, cy: number, r: number): string {
  return (
    `M${cx} ${cy - r} Q${cx + 1} ${cy - 1} ${cx + r} ${cy} ` +
    `Q${cx + 1} ${cy + 1} ${cx} ${cy + r} ` +
    `Q${cx - 1} ${cy + 1} ${cx - r} ${cy} ` +
    `Q${cx - 1} ${cy - 1} ${cx} ${cy - r} Z`
  );
}

/**
 * Builds the loader's inner SVG markup in its pre-animation (hidden) state:
 * a diagonal gradient, scattered twinkle stars (opacity 0), a faint orbit,
 * the edges (fully dash-offset so they read as undrawn) and the nodes
 * (scaled to 0). The component injects this once — in the browser only — then
 * animates the elements in via the Web Animations API.
 *
 * Elements are tagged with `cl-line`, `cl-node`, `cl-ring` and `cl-star`
 * classes so the component can query and drive them.
 *
 * @param gradientId Stable id for the shared diagonal gradient.
 * @returns SVG inner-markup string (no outer `<svg>`).
 */
export function buildConstellationMarkup(gradientId: string): string {
  const p = CL_PALETTE;
  let out =
    `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${p.blue}"/>` +
    `<stop offset="50%" stop-color="${p.purple}"/>` +
    `<stop offset="100%" stop-color="${p.pink}"/></linearGradient></defs>`;

  // Decorative twinkle stars — scattered inside the orbit, revealed at the end.
  for (let i = 0; i < CL_STAR_COUNT; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 18 + Math.random() * 40;
    const x = (70 + Math.cos(ang) * rad).toFixed(1);
    const y = (70 + Math.sin(ang) * rad).toFixed(1);
    const r = (0.5 + Math.random() * 1.1).toFixed(2);
    out += `<circle class="cl-star" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0"/>`;
  }

  // Faint outer orbit.
  out +=
    `<circle cx="70" cy="70" r="58" fill="none" ` +
    `stroke="url(#${gradientId})" stroke-width="1.2" opacity="0.18"/>`;

  // Edges — dash-offset by their own length so they start undrawn.
  CL_EDGES.forEach(([ai, bi]) => {
    const a = CL_NODES[ai];
    const b = CL_NODES[bi];
    const len = edgeLength(a, b).toFixed(2);
    out +=
      `<line class="cl-line" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ` +
      `stroke="url(#${gradientId})" stroke-width="2" stroke-linecap="round" ` +
      `stroke-dasharray="${len}" stroke-dashoffset="${len}"/>`;
  });

  // Nodes — each wrapped in a group scaled to 0 about its own centre.
  CL_NODES.forEach((point, i) => {
    const [x, y] = point;
    const inner = CL_BIG.includes(i)
      ? `<path d="${sparklePath(x, y, 5.4)}" fill="#fff"/>` +
        `<circle class="cl-ring" cx="${x}" cy="${y}" r="8.6" fill="none" ` +
        `stroke="${p.cyan}" stroke-width="2"/>`
      : `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/>` +
        `<circle cx="${x}" cy="${y}" r="6" fill="${p.purple}" opacity="0.22"/>`;
    out +=
      `<g class="cl-node" style="transform-origin:${x}px ${y}px;transform:scale(0)">` +
      `${inner}</g>`;
  });

  return out;
}
