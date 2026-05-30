import type { SelectItem } from '@db-astro-suite/ui';
import type { AspectRatio } from '../models/card-data.model';

/**
 * Metadata for a single preview-size preset. `ratio` drives the CSS
 * aspect-ratio applied to the preview surface; `width` / `height` are
 * the pixel dimensions surfaced in the toolbar dimensions readout and
 * used by the exporter. `label` is what the user sees in the dropdown.
 */
export interface PreviewSizeMeta {
  readonly ratio: AspectRatio;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  /** Short friendly name shown inside the grouped format picker. */
  readonly name: string;
}

/** Key identifying a preset entry in `PREVIEW_SIZES`. */
export type PreviewSizeKey =
  | 'ig-square'
  | 'ig-portrait'
  | 'ig-tall'
  | 'ig-landscape'
  | 'ig-story'
  | 'tiktok-post'
  | 'snap-post'
  | 'auto';

/**
 * Canonical preview-size presets, keyed for stable lookup. Keys are the
 * source of truth used by the toolbar dropdown and `CardDataService`.
 */
export const PREVIEW_SIZES: Record<PreviewSizeKey, PreviewSizeMeta> = {
  'ig-square': { ratio: '1:1', width: 1080, height: 1080, label: '1:1 · Square · 1080×1080', name: 'Square' },
  'ig-portrait': { ratio: '4:5', width: 1080, height: 1350, label: '4:5 · Portrait · 1080×1350', name: 'Portrait' },
  'ig-tall': { ratio: '3:4', width: 1080, height: 1440, label: '3:4 · Tall · 1080×1440', name: 'Tall' },
  'ig-landscape': { ratio: '1.91:1', width: 1080, height: 566, label: '1.91:1 · Landscape · 1080×566', name: 'Landscape' },
  'ig-story': { ratio: '9:16', width: 1080, height: 1920, label: '9:16 · Story · 1080×1920', name: 'Story' },
  'tiktok-post': { ratio: '9:16', width: 1080, height: 1920, label: '9:16 · TikTok · 1080×1920', name: 'Video Post' },
  'snap-post': { ratio: '9:16', width: 1080, height: 1920, label: '9:16 · Snapchat · 1080×1920', name: 'Story' },
  auto: { ratio: 'auto', width: 0, height: 0, label: 'Auto · Source size', name: 'Source size' },
};

/**
 * Dropdown render order — each entry becomes an `<optgroup>` header
 * wrapping its nested options. Lookups go through `PREVIEW_SIZES` so
 * label drift between this list and the metadata is impossible.
 */
export const PREVIEW_SIZE_GROUPS: readonly { label: string; keys: readonly PreviewSizeKey[] }[] = [
  {
    label: 'Instagram',
    keys: ['ig-square', 'ig-portrait', 'ig-tall', 'ig-story'],
  },
  { label: 'TikTok', keys: ['tiktok-post'] },
  { label: 'Snapchat', keys: ['snap-post'] },
  { label: 'Original', keys: ['auto'] },
];

/** Default preset selected when the app boots — preserves the historical `3:4` card. */
export const DEFAULT_PREVIEW_SIZE_KEY: PreviewSizeKey = 'ig-tall';

/**
 * Canonical export-target pixel dimensions per aspect ratio. Used by the
 * card exporter to upscale the DOM capture to a social-media-ready size.
 * `'auto'` falls back to the natural source-image dimensions at the call site.
 */
export const EXPORT_DIMENSIONS_BY_RATIO: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '3:4': { width: 1080, height: 1440 },
  '1.91:1': { width: 1080, height: 566 },
  '9:16': { width: 1080, height: 1920 },
  auto: { width: 1080, height: 1080 },
};

/**
 * Builds the `SelectItem[]` shape consumed by `<dba-ui-select>` from the
 * `PREVIEW_SIZE_GROUPS` ordering. Each group becomes a `SelectOptionGroup`
 * whose nested options carry `{ value: key, label: meta.label }`.
 */
export function buildPreviewSizeSelectItems(): readonly SelectItem[] {
  return PREVIEW_SIZE_GROUPS.map((group) => ({
    label: group.label,
    options: group.keys.map((key) => ({
      value: key,
      label: PREVIEW_SIZES[key].label,
    })),
  }));
}
