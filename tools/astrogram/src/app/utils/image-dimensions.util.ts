/**
 * Reads decoded pixel dimensions from a `File` using a transient object
 * URL and a hidden `<img>` element. Resolves the URL on both success
 * and failure so blob references are not leaked.
 *
 * @param file - The image file to inspect.
 * @returns A promise resolving to `{ width, height }` in CSS pixels.
 */
export function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to load.'));
    };
    img.src = url;
  });
}
