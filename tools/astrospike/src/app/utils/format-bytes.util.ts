/**
 * Formats a byte count as a short human-readable size, using binary units
 * with one decimal above the byte range (`"512 B"`, `"18.4 KB"`, `"4.2 MB"`).
 *
 * Negative and non-finite inputs are reported as `"0 B"` — a size readout
 * must never render `NaN` to the user.
 *
 * @param bytes Size in bytes.
 * @returns The formatted size string.
 */
export function formatBytes(bytes: number): string {
  const bytesPerKb = 1024;
  const bytesPerMb = bytesPerKb * 1024;

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < bytesPerKb) {
    return `${Math.round(bytes)} B`;
  }
  if (bytes < bytesPerMb) {
    return `${(bytes / bytesPerKb).toFixed(1)} KB`;
  }
  return `${(bytes / bytesPerMb).toFixed(1)} MB`;
}
