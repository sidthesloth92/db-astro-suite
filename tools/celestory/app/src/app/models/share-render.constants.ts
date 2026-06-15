/**
 * Render-time constants for the share-card canvas renderer — filter signature
 * colours, category order, per-theme typography and high-contrast ink palettes.
 * Ported verbatim from the Celestory design source so the rendered cards match
 * the reference pixel-for-pixel. These are data-viz colours (true emission /
 * broadband hues), not brand theme tokens, so each filter reads correctly.
 */
import type { ShareFilterKey } from './share-model.model';
import type { ShareThemeId } from './share.types';

/** One filter's signature colour + labels for the share cards. */
export interface ShareFilterMeta {
  /** Canonical key. */
  key: ShareFilterKey;
  /** Short label (e.g. "Hα"). */
  label: string;
  /** Signature colour. */
  color: string;
  /** Translucent tint of the colour. */
  tint: string;
  /** Long description (band / wavelength). */
  long: string;
}

/** Filter metadata keyed by canonical share-card filter key. */
export const SHARE_FILTER_META: Readonly<Record<ShareFilterKey, ShareFilterMeta>> = {
  Ha: { key: 'Ha', label: 'Hα', color: '#ff4d6d', tint: 'rgba(255,77,109,.16)', long: 'Hydrogen-α 656nm' },
  SII: { key: 'SII', label: 'SII', color: '#c01f3a', tint: 'rgba(192,31,58,.16)', long: 'Sulfur-II 672nm' },
  OIII: { key: 'OIII', label: 'OIII', color: '#22d3c5', tint: 'rgba(34,211,197,.16)', long: 'Oxygen-III 500nm' },
  L: { key: 'L', label: 'L', color: '#e9edf4', tint: 'rgba(233,237,244,.14)', long: 'Luminance' },
  R: { key: 'R', label: 'R', color: '#f0533f', tint: 'rgba(240,83,63,.16)', long: 'Red' },
  G: { key: 'G', label: 'G', color: '#46cf7c', tint: 'rgba(70,207,124,.16)', long: 'Green' },
  B: { key: 'B', label: 'B', color: '#4d8df0', tint: 'rgba(77,141,240,.16)', long: 'Blue' },
  RGB: { key: 'RGB', label: 'RGB', color: '#00e5ff', tint: 'rgba(0,229,255,.16)', long: 'One-shot colour' },
};

/** Canonical render order for filters (RGB appended for one-shot-colour rigs). */
export const SHARE_FILTER_ORDER: readonly ShareFilterKey[] = ['Ha', 'SII', 'OIII', 'L', 'R', 'G', 'B', 'RGB'];

/** Canonical object category order for the per-category breakdown. */
export const SHARE_CATEGORIES: readonly string[] = [
  'Galaxy',
  'Nebula',
  'Planetary Nebula',
  'Supernova Remnant',
  'Open Cluster',
  'Globular Cluster',
  'Star',
  'Other',
];

/** Seconds of usable astro-darkness in a "clear night", for the nights readout. */
export const NIGHT_SECONDS = 8 * 3600;

/** Per-theme typography pairing (head / number / label families + weights). */
export interface ShareFont {
  /** Heading / display family. */
  head: string;
  /** Default heading weight. */
  headW: number;
  /** Number family. */
  num: string;
  /** Default number weight. */
  numW: number;
  /** Label / mono family. */
  label: string;
}

/** Shared typography for every theme (Outfit display, Orbitron numbers, IBM Plex Mono labels). */
const BASE_FONT: ShareFont = { head: 'Outfit', headW: 700, num: 'Orbitron', numW: 700, label: 'IBM Plex Mono' };

/** Per-theme typography map. */
export const SHARE_FONTS: Readonly<Record<ShareThemeId, ShareFont>> = {
  dark: BASE_FONT,
  star: BASE_FONT,
  astro: BASE_FONT,
  galaxy: BASE_FONT,
  blackhole: BASE_FONT,
  aurora: BASE_FONT,
  blueprint: BASE_FONT,
  atlas: BASE_FONT,
  eclipse: BASE_FONT,
  milkyway: BASE_FONT,
  comet: BASE_FONT,
  deepfield: BASE_FONT,
  filmneg: BASE_FONT,
  obslog: BASE_FONT,
  patch: BASE_FONT,
  moonlight: BASE_FONT,
};

/** High-contrast ink / sub / label colours per theme (busy skies need bright labels). */
export interface ShareInk {
  /** Primary ink. */
  ink: string;
  /** Secondary ink. */
  sub: string;
  /** Muted label ink. */
  label: string;
}

/** Per-theme ink palette. */
export const SHARE_INK: Readonly<Record<ShareThemeId, ShareInk>> = {
  dark: { ink: '#f3f6fc', sub: '#dbe2ef', label: '#aab6cc' },
  star: { ink: '#f6f9ff', sub: '#dfe8fb', label: '#b3c2e0' },
  astro: { ink: '#fdf3ff', sub: '#ecdffb', label: '#cab9e6' },
  galaxy: { ink: '#f7f2ff', sub: '#e3d6f7', label: '#c3aee0' },
  blackhole: { ink: '#fdf3e8', sub: '#f0dcc6', label: '#d6b48c' },
  aurora: { ink: '#eafff7', sub: '#cdeee0', label: '#9fd9c4' },
  blueprint: { ink: '#eaf4ff', sub: '#cfe2fb', label: '#9bbce6' },
  atlas: { ink: '#fbf3e3', sub: '#e7d9bb', label: '#c9b385' },
  eclipse: { ink: '#f4f4f8', sub: '#d8d8e2', label: '#9d9dad' },
  milkyway: { ink: '#fdf6ec', sub: '#ecdfc8', label: '#c4ad8a' },
  comet: { ink: '#eef8ff', sub: '#cfe6f5', label: '#92b6cc' },
  deepfield: { ink: '#f3efe6', sub: '#d9d2c2', label: '#a39b88' },
  filmneg: { ink: '#221d15', sub: '#463d2f', label: '#6b6357' },
  obslog: { ink: '#2a2118', sub: '#4a3c2c', label: '#7d6a50' },
  patch: { ink: '#f7ecd4', sub: '#e8d6b4', label: '#bda77e' },
  moonlight: { ink: '#f2f6ff', sub: '#d6e0f2', label: '#9fafcc' },
};

/** Font face specs to pre-load before the first paint (avoids fallback flashes). */
export const SHARE_FONT_SPECS: readonly string[] = [
  '600 64px "Outfit"',
  '700 64px "Outfit"',
  '800 64px "Outfit"',
  '500 24px "IBM Plex Mono"',
  '600 24px "IBM Plex Mono"',
  '700 24px "IBM Plex Mono"',
  '700 80px "Orbitron"',
  '800 80px "Orbitron"',
  '900 80px "Orbitron"',
];
