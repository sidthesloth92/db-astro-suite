import { SplitButtonMenuItem } from '@db-astro-suite/ui';
import { ExportFormat } from '../models/export-result.model';

/**
 * JPEG encoder quality (0–1) used when exporting in JPEG format.
 */
export const DEFAULT_JPEG_QUALITY = 0.92;

/** Lowest selectable JPEG quality — below this, artefacts swamp faint spikes. */
export const JPEG_QUALITY_MIN = 0.5;

/** Highest selectable JPEG quality. */
export const JPEG_QUALITY_MAX = 1;

/** Step increment of the JPEG quality slider. */
export const JPEG_QUALITY_STEP = 0.01;

/**
 * Export split-button menu entries; `value` is an `ExportFormat`.
 */
export const EXPORT_MENU_ITEMS: readonly SplitButtonMenuItem[] = [
  {
    value: 'png',
    label: 'Export PNG',
    description: 'Lossless, larger file',
  },
  {
    value: 'jpeg',
    label: 'Export JPEG',
    description: 'Smaller file, adjustable quality',
  },
  {
    value: 'layer',
    label: 'Export layer',
    description: 'Spikes only, transparent — composite over your own master',
  },
];

/**
 * Maps an {@link EXPORT_MENU_ITEMS} entry value back to its export format.
 */
export const EXPORT_FORMAT_BY_MENU_VALUE: Record<string, ExportFormat> = {
  png: 'png',
  jpeg: 'jpeg',
  layer: 'layer',
};
