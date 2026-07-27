import { SplitButtonMenuItem } from '@db-astro-suite/ui';

/**
 * JPEG encoder quality (0–1) used when exporting in JPEG format.
 */
export const DEFAULT_JPEG_QUALITY = 0.92;

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
];
