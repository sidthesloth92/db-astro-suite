import { AG_BIG, AG_L, AG_P, AG_PAL } from './astro-mark.constants';

/**
 * Builds the inline SVG markup for the Astrogram brand mark — a phone showing
 * a tagged constellation, an Instagram action bar, an orbit ellipse and a pair
 * of sparkles. Ported verbatim from the design prototype's `agPhoneInner`.
 *
 * @param uid Stable prefix for gradient / clip-path ids (keep constant per
 *            page so SSR + client renders agree).
 * @param size Pixel width & height of the square mark.
 * @returns A complete `<svg>` string ready to inject as trusted HTML.
 */
export function buildAstroMark(uid: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 140 140" ` +
    `role="img" aria-label="Astrogram">${agPhoneInner(uid)}</svg>`
  );
}

/** Seeded PRNG (deterministic) so scattered stars render reproducibly. */
function markRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Four-point bézier sparkle/diamond glyph centred at (cx, cy). */
function agSparkle(cx: number, cy: number, r: number, fill?: string): string {
  return (
    `<path d="M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} ` +
    `Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} ` +
    `Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} ` +
    `Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r} Z" fill="${fill || '#fff'}"/>`
  );
}

/** Scatters `n` faint white stars inside the (cx, cy, w, h) box. */
function agStars(
  seed: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  n: number,
  maxR?: number,
): string {
  const r = markRng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = (cx - w / 2 + r() * w).toFixed(1);
    const y = (cy - h / 2 + r() * h).toFixed(1);
    const rad = (0.5 + r() * (maxR || 1.6)).toFixed(2);
    const op = (0.4 + r() * 0.55).toFixed(2);
    s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" opacity="${op}"/>`;
  }
  return s;
}

/** Draws the constellation (lines + nodes) mapped into the given box. */
function agConstellation(
  uid: string,
  box: { x: number; y: number; w: number; h: number },
  sc: number,
): string {
  const P = AG_PAL;
  const map = (p: readonly [number, number]): [number, number] => [
    box.x + (p[0] / 140) * box.w,
    box.y + (p[1] / 140) * box.h,
  ];
  let lines = '';
  AG_L.forEach(([a, b]) => {
    const A = map(AG_P[a]);
    const B = map(AG_P[b]);
    lines +=
      `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" ` +
      `x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" ` +
      `stroke="url(#${uid}g)" stroke-width="${(2 * sc).toFixed(2)}" opacity="0.65"/>`;
  });
  let nodes = '';
  AG_P.forEach((p, i) => {
    const M = map(p);
    const isBig = AG_BIG.includes(i);
    nodes += isBig
      ? agSparkle(M[0], M[1], 5.4 * sc) +
        `<circle cx="${M[0].toFixed(1)}" cy="${M[1].toFixed(1)}" ` +
          `r="${(8.6 * sc).toFixed(2)}" fill="none" stroke="${P.tag}" ` +
          `stroke-width="${(2 * sc).toFixed(2)}"/>`
      : `<circle cx="${M[0].toFixed(1)}" cy="${M[1].toFixed(1)}" ` +
          `r="${(3 * sc).toFixed(2)}" fill="#fff"/>` +
        `<circle cx="${M[0].toFixed(1)}" cy="${M[1].toFixed(1)}" ` +
          `r="${(6 * sc).toFixed(2)}" fill="${P.spark}" opacity="0.22"/>`;
  });
  return lines + nodes;
}

/** Assembles the full phone-post mark interior for the given id prefix. */
function agPhoneInner(uid: string): string {
  const P = AG_PAL;
  const defs =
    `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${P.g[0]}"/>` +
    `<stop offset="50%" stop-color="${P.g[1]}"/>` +
    `<stop offset="100%" stop-color="${P.g[2]}"/></linearGradient>` +
    `<linearGradient id="${uid}gv" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${P.gv[0]}"/>` +
    `<stop offset="55%" stop-color="${P.gv[1]}"/>` +
    `<stop offset="100%" stop-color="${P.gv[2]}"/></linearGradient></defs>`;
  return (
    defs +
    `<ellipse cx="70" cy="74" rx="56" ry="22" fill="none" stroke="url(#${uid}g)" ` +
      `stroke-width="2.2" opacity="0.5" transform="rotate(-18 70 74)"/>` +
    agSparkle(120, 52, 4, P.g[2]) +
    agSparkle(20, 98, 3.4, P.spark) +
    `<rect x="46" y="18" width="48" height="104" rx="13" fill="#0c0a16" ` +
      `stroke="url(#${uid}gv)" stroke-width="3"/>` +
    `<rect x="53" y="29" width="34" height="58" rx="6" fill="#0a0713"/>` +
    `<clipPath id="${uid}c"><rect x="53" y="29" width="34" height="58" rx="6"/></clipPath>` +
    `<g clip-path="url(#${uid}c)">` +
      agStars(11, 70, 57, 32, 52, 12, 0.8) +
      agConstellation(uid, { x: 56, y: 40, w: 28, h: 36 }, 0.6) +
    `</g>` +
    `<path d="M57 98.8 C 52.8 95.6 53.1 92.2 55.4 92.2 C 56.4 92.2 57 93.1 57 93.1 ` +
      `C 57 93.1 57.6 92.2 58.6 92.2 C 60.9 92.2 61.2 95.6 57 98.8 Z" fill="${P.heart}"/>` +
    `<path d="M65.0 95.1 L70.8 92.8 L68.6 98.3 L67.6 96.0 Z" fill="none" ` +
      `stroke="#d4d4e0" stroke-width="1.05" stroke-linejoin="round"/>` +
    `<line x1="67.6" y1="96.0" x2="70.8" y2="92.8" stroke="#d4d4e0" stroke-width="1.05"/>` +
    `<path d="M85.4 92.8 h3.2 v5.2 l-1.6 -1.25 -1.6 1.25 Z" fill="none" ` +
      `stroke="#d4d4e0" stroke-width="1.05" stroke-linejoin="round"/>` +
    `<rect x="54" y="103.6" width="22" height="2.1" rx="1.05" fill="url(#${uid}g)" opacity="0.6"/>` +
    `<rect x="54" y="108.2" width="14" height="2.1" rx="1.05" fill="#2a2540"/>`
  );
}
