import { ExportFormat } from '../models/export-result.model';

/**
 * Builds the download file name for an exported image.
 *
 * Strips the extension from the source file name, sanitizes the base (runs of
 * non-alphanumeric characters collapse to a single `_`, lowercased), then
 * appends `_astrospike_<width>_<height>` and the extension for the chosen
 * format (`png` → `.png`, `jpeg` → `.jpg`).
 */
export function buildExportFilename(
  sourceFileName: string,
  width: number,
  height: number,
  format: ExportFormat,
): string {
  const dotIndex = sourceFileName.lastIndexOf('.');
  const stripped = dotIndex > 0 ? sourceFileName.slice(0, dotIndex) : sourceFileName;
  const base = stripped.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return `${base}_astrospike_${width}_${height}.${ext}`;
}
