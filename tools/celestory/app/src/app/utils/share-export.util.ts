/**
 * Browser-only helpers to export a rendered share-card `<canvas>`: copy to the
 * clipboard as a PNG, or share it via the Web Share API. Both resolve to a
 * boolean so callers can fall back to a direct download when unsupported.
 */

/** Render a canvas to a PNG blob (resolves null on failure). */
function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Copy a canvas to the clipboard as a PNG image. Returns true on success. */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      return false;
    }
    const blob = await toPngBlob(canvas);
    if (!blob) {
      return false;
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Share a canvas via the Web Share API as a PNG file. Returns true if shared. */
export async function shareCanvas(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  try {
    const blob = await toPngBlob(canvas);
    if (!blob) {
      return false;
    }
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'Celestory' });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
