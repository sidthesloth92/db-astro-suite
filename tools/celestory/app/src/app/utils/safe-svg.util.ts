/**
 * Wrap an app-owned static SVG string as trusted HTML for [innerHTML]. The
 * content is never user-controlled (board icons + themed motifs are generated
 * from our own catalog), so bypassing sanitization is safe here.
 */
import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** Trust an app-owned SVG string for binding via [innerHTML]. */
export function safeSvg(sanitizer: DomSanitizer, svg: string): SafeHtml {
  return sanitizer.bypassSecurityTrustHtml(svg);
}
