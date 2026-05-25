/**
 * Renderable definition of a single icon glyph.
 *
 * Each icon in `libs/ui/src/lib/icons/{name}.icon.ts` exports one of these
 * consts. The generic `IconComponent` consumes the definition and renders
 * a single `<svg>` with consistent chrome (stroke, linecap, linejoin).
 */
export interface IconDefinition {
  /** Human-readable identifier — used for debug + selectors in tests. */
  readonly name: string;
  /** Raw inner SVG body (paths, circles, rects, lines). Treated as trusted source. */
  readonly body: string;
  /** Custom viewBox if the icon isn't 24×24. Defaults to `'0 0 24 24'`. */
  readonly viewBox?: string;
  /** `'currentColor'` for solid glyphs, `'none'` for stroke-only line icons. Defaults to `'none'`. */
  readonly fill?: 'none' | 'currentColor';
}
