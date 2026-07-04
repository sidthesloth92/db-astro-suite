/**
 * Themed backdrop motifs for each leaderboard board, ported verbatim from the
 * design's render engine. `motifSvg` returns an app-owned static SVG string;
 * `leaderboardBackdrop` returns the radial-gradient CSS for the backdrop layer.
 * Pure presentation — no data, no business logic.
 */
import type { MotifId } from '../models/leaderboard-board.model';

const SVGNS = 'http://www.w3.org/2000/svg';

/** Deterministic 0..1 hash of a string (FNV-1a), for scattered star/heat fields. */
function strHash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function svgWrap(inner: string): string {
  return `<svg class="lb-motif" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="${SVGNS}">${inner}</svg>`;
}

/**
 * Build the themed motif SVG for a board. `swatches` colours the filter wheel
 * (spectrum) — defaults to the accent when not supplied.
 */
export function motifSvg(
  motif: MotifId,
  accent: string,
  accentRgb: string,
  swatches: readonly string[] = [],
): string {
  const a = accent;
  let s = '';

  if (motif === 'clock') {
    const ccx = 812;
    const ccy = 336;
    const cr = 188;
    s += `<g stroke="${a}" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    s += `<circle cx="${ccx}" cy="${ccy}" r="${cr + 70}" stroke-width="1" opacity="0.16" stroke-dasharray="3 26"/>`;
    s += `<circle cx="${ccx}" cy="${ccy}" r="${cr + 122}" stroke-width="1" opacity="0.1" stroke-dasharray="3 34"/>`;
    s += `<circle cx="${ccx}" cy="${ccy}" r="${cr}" stroke-width="2.4" opacity="0.6"/>`;
    s += `<circle cx="${ccx}" cy="${ccy}" r="${cr - 22}" stroke-width="1" opacity="0.28"/>`;
    for (let ti = 0; ti < 60; ti++) {
      const tang = (ti / 60) * Math.PI * 2 - Math.PI / 2;
      const maj = ti % 5 === 0;
      const r1 = cr - 10;
      const r2t = maj ? cr - 34 : cr - 22;
      s += `<line x1="${(ccx + Math.cos(tang) * r1).toFixed(0)}" y1="${(ccy + Math.sin(tang) * r1).toFixed(0)}" x2="${(ccx + Math.cos(tang) * r2t).toFixed(0)}" y2="${(ccy + Math.sin(tang) * r2t).toFixed(0)}" stroke-width="${maj ? 2.4 : 1}" opacity="${maj ? 0.55 : 0.3}"/>`;
    }
    s += `<line x1="${ccx}" y1="${ccy}" x2="${(ccx + Math.cos(-Math.PI * 0.72) * 98).toFixed(0)}" y2="${(ccy + Math.sin(-Math.PI * 0.72) * 98).toFixed(0)}" stroke-width="5" opacity="0.7"/>`;
    s += `<line x1="${ccx}" y1="${ccy}" x2="${(ccx + Math.cos(-Math.PI * 0.18) * 148).toFixed(0)}" y2="${(ccy + Math.sin(-Math.PI * 0.18) * 148).toFixed(0)}" stroke-width="3.4" opacity="0.7"/>`;
    s += `<circle cx="${ccx}" cy="${ccy}" r="9" fill="${a}" stroke="none" opacity="0.85"/>`;
    s += `</g>`;
  } else if (motif === 'galaxy') {
    const gx0 = 806;
    const gy0 = 348;
    s += `<g stroke="${a}" fill="none" stroke-linecap="round">`;
    s += `<circle cx="${gx0}" cy="${gy0}" r="232" stroke-width="1.4" opacity="0.4"/>`;
    [0, 90, 180, 270].forEach((d) => {
      const aa = (d * Math.PI) / 180;
      s += `<line x1="${(gx0 + Math.cos(aa) * 200).toFixed(0)}" y1="${(gy0 + Math.sin(aa) * 200).toFixed(0)}" x2="${(gx0 + Math.cos(aa) * 258).toFixed(0)}" y2="${(gy0 + Math.sin(aa) * 258).toFixed(0)}" stroke-width="1.4" opacity="0.45"/>`;
    });
    s += `<g transform="translate(${gx0} ${gy0}) rotate(-24)" opacity="0.6">`;
    s += `<ellipse cx="0" cy="0" rx="150" ry="60" stroke-width="2"/>`;
    s += `<ellipse cx="0" cy="0" rx="34" ry="21" stroke-width="2.4"/>`;
    s += `<path d="M28 -14 C92 -42 152 -18 170 30" stroke-width="1.6" opacity="0.7"/>`;
    s += `<path d="M-28 14 C-92 42 -152 18 -170 -30" stroke-width="1.6" opacity="0.7"/>`;
    s += `</g>`;
    for (let n = 0; n < 24; n++) {
      const rx = strHash('gal' + n) * 1200;
      const ry = strHash('galY' + n) * 800;
      const rr = 0.6 + strHash('galR' + n) * 1.8;
      s += `<circle cx="${rx.toFixed(0)}" cy="${ry.toFixed(0)}" r="${rr.toFixed(1)}" fill="#fff" stroke="none" opacity="${(0.2 + strHash('galO' + n) * 0.5).toFixed(2)}"/>`;
    }
    s += `</g>`;
  } else if (motif === 'blueprint') {
    s += `<g opacity="0.07" stroke="${a}" stroke-width="0.7">`;
    for (let bgx = 0; bgx <= 1200; bgx += 60) {
      s += `<line x1="${bgx}" y1="0" x2="${bgx}" y2="800"/>`;
    }
    s += `</g>`;
    s += `<g transform="translate(840 300) rotate(-19)" stroke="${a}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">`;
    s += `<ellipse cx="-292" cy="0" rx="15" ry="70"/>`;
    s += `<path d="M-292 -70 H-214 M-292 70 H-214"/>`;
    s += `<rect x="-214" y="-58" width="420" height="116" rx="13"/>`;
    s += `<line x1="-214" y1="-58" x2="-214" y2="58" opacity="0.55"/>`;
    s += `<rect x="206" y="-36" width="62" height="72" rx="8"/>`;
    s += `<rect x="268" y="-22" width="92" height="44" rx="9"/>`;
    s += `<circle cx="238" cy="-58" r="14"/><circle cx="238" cy="58" r="14"/>`;
    [-110, 80].forEach((rx) => {
      s += `<path d="M${rx - 24} -66 v132 M${rx + 24} -66 v132"/>`;
    });
    s += `<rect x="-150" y="66" width="290" height="24" rx="5"/>`;
    s += `<rect x="-40" y="-116" width="160" height="32" rx="10"/>`;
    s += `<path d="M0 -84 v22 M88 -84 v22"/>`;
    s += `</g>`;
  } else if (motif === 'sensor') {
    const bx = 614;
    const by = 252;
    const bw = 372;
    const bh = 250;
    const lcx = 812;
    const lcy = 386;
    s += `<g stroke="${a}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">`;
    s += `<path d="M${lcx - 92} ${by} L${lcx - 58} ${by - 46} H${lcx + 58} L${lcx + 92} ${by}"/>`;
    s += `<rect x="${lcx - 24}" y="${by - 58}" width="48" height="14" rx="2"/>`;
    s += `<path d="M${bx} ${by + 24} h-46 a22 22 0 0 0 -22 22 v150 a22 22 0 0 0 22 22 h46"/>`;
    s += `<ellipse cx="${bx - 36}" cy="${by + 18}" rx="20" ry="11"/>`;
    s += `<circle cx="${bx + bw - 40}" cy="${by - 14}" r="22"/>`;
    s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="22"/>`;
    s += `<circle cx="${lcx}" cy="${lcy}" r="112"/>`;
    s += `<circle cx="${lcx}" cy="${lcy}" r="88" stroke-width="3" opacity="0.7"/>`;
    s += `<circle cx="${lcx}" cy="${lcy}" r="58"/>`;
    s += `<circle cx="${lcx}" cy="${lcy}" r="30" opacity="0.5"/>`;
    for (let ab = 0; ab < 6; ab++) {
      const aa2 = (ab / 6) * Math.PI * 2;
      s += `<line x1="${(lcx + Math.cos(aa2) * 30).toFixed(0)}" y1="${(lcy + Math.sin(aa2) * 30).toFixed(0)}" x2="${(lcx + Math.cos(aa2) * 58).toFixed(0)}" y2="${(lcy + Math.sin(aa2) * 58).toFixed(0)}" stroke-width="1.2" opacity="0.45"/>`;
    }
    s += `<circle cx="${bx + 34}" cy="${by + 40}" r="9" opacity="0.6"/>`;
    s += `<line x1="${bx + bw - 96}" y1="${by + bh - 30}" x2="${bx + bw - 30}" y2="${by + bh - 30}" stroke-width="1.4" opacity="0.5"/>`;
    s += `</g>`;
  } else if (motif === 'equatorial') {
    const ax = 800;
    const ay = 432;
    s += `<g stroke="${a}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">`;
    s += `<path d="M${ax} ${ay} L676 716 M${ax} ${ay} L946 716 M${ax + 6} ${ay + 6} L820 736"/>`;
    s += `<path d="M658 716 h36 M928 716 h36 M804 736 h32"/>`;
    s += `<path d="M722 604 L811 626 L900 604" opacity="0.4"/>`;
    s += `<rect x="${ax - 30}" y="${ay - 46}" width="60" height="50" rx="8"/>`;
    s += `<g transform="translate(${ax} ${ay - 46}) rotate(-42)">`;
    s += `<rect x="-30" y="-150" width="60" height="150" rx="22"/>`;
    s += `<rect x="-120" y="-180" width="240" height="58" rx="24"/>`;
    s += `<line x1="-120" y1="-151" x2="-238" y2="-151" stroke-width="6"/>`;
    s += `<circle cx="-252" cy="-151" r="30" fill="${a}" stroke="none" opacity="0.6"/>`;
    s += `<rect x="112" y="-178" width="74" height="54" rx="8"/>`;
    s += `<path d="M120 -184 h58"/>`;
    s += `</g>`;
    s += `<path d="M${ax + 44} ${ay - 38} A 66 66 0 0 1 ${ax + 16} ${ay - 76}" stroke-width="1.4" opacity="0.5"/>`;
    s += `</g>`;
  } else if (motif === 'calendar') {
    const calX = 612;
    const calY = 188;
    const calW = 400;
    const calH = 380;
    const hd = 64;
    s += `<g stroke="${a}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">`;
    s += `<line x1="${calX + 78}" y1="${calY - 32}" x2="${calX + 78}" y2="${calY + 16}" stroke-width="6"/>`;
    s += `<line x1="${calX + calW - 78}" y1="${calY - 32}" x2="${calX + calW - 78}" y2="${calY + 16}" stroke-width="6"/>`;
    s += `<rect x="${calX}" y="${calY}" width="${calW}" height="${calH}" rx="18" stroke-width="2.4"/>`;
    s += `<line x1="${calX}" y1="${calY + hd}" x2="${calX + calW}" y2="${calY + hd}" stroke-width="2"/>`;
    s += `</g>`;
    const cgx = 7;
    const cgy = 5;
    const pad = 18;
    const gw = (calW - pad * 2) / cgx;
    const gh = (calH - hd - pad * 2) / cgy;
    for (let dy = 0; dy < cgy; dy++) {
      for (let dx = 0; dx < cgx; dx++) {
        const dvx = calX + pad + dx * gw + 3;
        const dvy = calY + hd + pad + dy * gh + 3;
        const hv = strHash('cal' + dx + '_' + dy);
        if (hv > 0.48) {
          s += `<rect x="${dvx.toFixed(0)}" y="${dvy.toFixed(0)}" width="${(gw - 6).toFixed(0)}" height="${(gh - 6).toFixed(0)}" rx="5" fill="${a}" stroke="none" opacity="${(0.12 + (hv - 0.48) * 0.9).toFixed(2)}"/>`;
        } else {
          s += `<rect x="${dvx.toFixed(0)}" y="${dvy.toFixed(0)}" width="${(gw - 6).toFixed(0)}" height="${(gh - 6).toFixed(0)}" rx="5" fill="none" stroke="${a}" stroke-width="1" opacity="0.22"/>`;
        }
      }
    }
  } else if (motif === 'stack') {
    s += `<g stroke="${a}" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    for (let f = 7; f >= 1; f--) {
      const ox = 612 + f * 22;
      const oy = 250 - f * 20;
      s += `<rect x="${ox}" y="${oy}" width="300" height="208" rx="12" stroke-width="2" opacity="${(0.12 + (7 - f) * 0.05).toFixed(2)}"/>`;
    }
    const ff = 626;
    const ft = 250;
    s += `<rect x="${ff}" y="${ft}" width="300" height="208" rx="12" stroke-width="2.6" opacity="0.65"/>`;
    [
      [58, 56],
      [142, 118],
      [232, 70],
      [186, 158],
      [98, 150],
      [250, 150],
    ].forEach((p) => {
      s += `<circle cx="${ff + p[0]}" cy="${ft + p[1]}" r="2.4" fill="#fff" stroke="none" opacity="0.7"/>`;
    });
    s += `<ellipse cx="${ff + 150}" cy="${ft + 104}" rx="40" ry="17" stroke="${a}" stroke-width="1.6" fill="none" opacity="0.5" transform="rotate(-18 ${ff + 150} ${ft + 104})"/>`;
    s += `</g>`;
  } else if (motif === 'spectrum') {
    const palette = (swatches.length > 0 ? swatches : [a]).slice(0, 7);
    const wx = 812;
    const wy = 344;
    const wr = 196;
    const hubr = 50;
    const slotr = 46;
    const ring = wr - 62;
    s += `<g stroke="${a}" fill="none" stroke-linecap="round">`;
    s += `<circle cx="${wx}" cy="${wy}" r="${wr}" stroke-width="2.4" opacity="0.6"/>`;
    s += `<circle cx="${wx}" cy="${wy}" r="${wr - 14}" stroke-width="1" opacity="0.3"/>`;
    palette.forEach((col, i) => {
      const aa = (i / palette.length) * Math.PI * 2 - Math.PI / 2;
      const px = wx + Math.cos(aa) * ring;
      const py = wy + Math.sin(aa) * ring;
      s += `<circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${slotr}" fill="${col}" stroke="none" opacity="0.5"/><circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${slotr}" stroke="${a}" stroke-width="1.6" opacity="0.6"/>`;
    });
    s += `<circle cx="${wx}" cy="${wy}" r="${hubr}" stroke-width="2" opacity="0.5"/><circle cx="${wx}" cy="${wy}" r="6" fill="${a}" stroke="none" opacity="0.75"/>`;
    s += `</g>`;
  } else if (motif === 'timeline') {
    const bx0 = 470;
    const bw0 = 560;
    const by0 = 252;
    const bh = 30;
    const bgap = 22;
    const lens = [1.0, 0.86, 0.72, 0.6, 0.5, 0.4];
    s += `<g stroke="${a}" stroke-linecap="round">`;
    for (let gi = 0; gi <= 6; gi++) {
      const glx = bx0 + (bw0 * gi) / 6;
      s += `<line x1="${glx.toFixed(0)}" y1="${by0 - 20}" x2="${glx.toFixed(0)}" y2="${by0 + lens.length * (bh + bgap)}" stroke-width="1" fill="none" opacity="0.16"/>`;
    }
    lens.forEach((L, i) => {
      const yy = by0 + i * (bh + bgap);
      s += `<rect x="${bx0}" y="${yy}" width="${(bw0 * L).toFixed(0)}" height="${bh}" rx="${bh / 2}" fill="${a}" stroke="none" opacity="${(0.5 - i * 0.05).toFixed(2)}"/><circle cx="${(bx0 + bw0 * L).toFixed(0)}" cy="${yy + bh / 2}" r="6" fill="${a}" stroke="none" opacity="0.7"/>`;
    });
    s += `</g>`;
  }

  return svgWrap(s);
}

/** Radial-gradient backdrop CSS for a board's accent (bold under the active board). */
export function leaderboardBackdrop(accentRgb: string, bold: boolean): string {
  const g1 = bold ? 0.26 : 0.14;
  const g2 = bold ? 0.16 : 0.08;
  const cyan = bold ? 0.1 : 0.06;
  return (
    `radial-gradient(1000px 720px at 84% -8%, rgba(${accentRgb},${g1}), transparent 60%),` +
    `radial-gradient(900px 680px at 4% 110%, rgba(25,230,221,${cyan}), transparent 62%),` +
    `radial-gradient(1100px 840px at 50% 120%, rgba(${accentRgb},${g2}), transparent 60%)`
  );
}
