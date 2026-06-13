import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { buildAstroMark } from './astro-mark.util';

/**
 * Astrogram brand mark — the vector phone-post logo (a phone showing a tagged
 * constellation, an Instagram action bar, an orbit ellipse and sparkles).
 * Presentational only: renders procedurally-built inline SVG sized by `size`.
 */
@Component({
  selector: 'dba-hub-astro-mark',
  standalone: true,
  templateUrl: './astro-mark.component.html',
  styleUrl: './astro-mark.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AstroMarkComponent {
  /** Pixel size (width & height) of the square mark. Defaults to 56. */
  readonly size = input<number>(56);

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Trusted SVG markup for the mark. The string is generated locally from
   * fixed brand geometry (no user input), so bypassing the sanitizer is safe
   * and is required to inject procedurally-built inline SVG. A constant `uid`
   * keeps gradient/clip ids stable across SSR + client renders (the mark is
   * used at most once per page), avoiding hydration id mismatches.
   */
  protected readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(buildAstroMark('agm', this.size())),
  );
}
