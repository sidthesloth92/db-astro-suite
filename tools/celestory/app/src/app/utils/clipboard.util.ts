/**
 * Copies text to the clipboard when running in a browser that exposes the
 * Clipboard API. Returns `true` if the write succeeded, `false` otherwise
 * (SSR, unsupported browser, or a rejected permission) — never throws.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
