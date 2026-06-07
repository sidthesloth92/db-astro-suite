/** Pink / cyan brand stops baked into the Starwizz warp-burst mark. */
const PINK = '#ff2a7b';
const CYAN = '#19e6dd';

/**
 * Builds the inline SVG markup for the Starwizz brand mark — a perspective
 * warp burst of pink/cyan streaks around a gradient-ringed core, with an
 * optional `SW` monogram. Ported verbatim from the design prototype's
 * `swWarpInner` / `StarwizzWarpMark`.
 *
 * @param uid Stable prefix for gradient ids (keep constant per page so SSR +
 *            client renders agree).
 * @param size Pixel width & height of the square mark.
 * @param showText When true, renders the `SW` monogram over the core.
 * @returns A complete `<svg>` string ready to inject as trusted HTML.
 */
export function buildStarwizzMark(
  uid: string,
  size: number,
  showText: boolean,
): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 130 130" ` +
    `role="img" aria-label="Starwizz">${swWarpInner(uid, showText)}</svg>`
  );
}

/** Seeded PRNG (deterministic) so the warp streaks render reproducibly. */
function markRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Assembles the warp-burst mark interior for the given id prefix. */
function swWarpInner(uid: string, text: boolean): string {
  const halo = true;
  const n = 46;
  const rnd = markRng(14);
  const vx = 65;
  const vy = 62;
  const rMax = 56;
  const startMin = 6;
  const startMax = 16;
  let defs = `<defs>`;
  let body = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + (rnd() - 0.5) * 0.32;
    const reach = startMax + (rMax - startMax) * (0.25 + 0.75 * rnd());
    const start = startMin + rnd() * (startMax - startMin);
    const x1 = vx + Math.cos(a) * start;
    const y1 = vy + Math.sin(a) * start;
    const x2 = vx + Math.cos(a) * reach;
    const y2 = vy + Math.sin(a) * reach;
    const col = rnd() < 0.42 ? CYAN : PINK;
    const gi = 'sw' + uid + i;
    const w = (0.8 + rnd() * 2.6).toFixed(2);
    const op = (0.4 + rnd() * 0.6).toFixed(2);
    defs +=
      `<linearGradient id="${gi}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
      `gradientUnits="userSpaceOnUse">` +
      `<stop offset="0%" stop-color="${col}" stop-opacity="0"/>` +
      `<stop offset="100%" stop-color="${col}" stop-opacity="${op}"/></linearGradient>`;
    body +=
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
      `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
      `stroke="url(#${gi})" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  defs +=
    `<radialGradient id="${uid}dg" cx="50%" cy="42%">` +
    `<stop offset="0%" stop-color="#3a1330"/>` +
    `<stop offset="100%" stop-color="#140a1e"/></radialGradient>` +
    `<linearGradient id="${uid}rg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${PINK}"/>` +
    `<stop offset="100%" stop-color="${CYAN}"/></linearGradient></defs>`;
  let s = defs + body;
  if (halo) {
    s += `<circle cx="65" cy="62" r="30" fill="${PINK}" opacity="0.16"/>`;
  }
  s +=
    `<circle cx="65" cy="62" r="15" fill="url(#${uid}dg)"/>` +
    `<circle cx="65" cy="62" r="15" fill="none" stroke="url(#${uid}rg)" stroke-width="1.8"/>`;
  if (text) {
    s +=
      `<text x="65" y="66.5" text-anchor="middle" font-family="Orbitron" ` +
      `font-weight="800" font-size="12" letter-spacing="0.5" fill="#fff">SW</text>`;
  }
  return s;
}
