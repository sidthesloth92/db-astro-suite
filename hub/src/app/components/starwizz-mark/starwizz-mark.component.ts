import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { buildStarwizzMark } from './starwizz-mark.util';

/**
 * Starwizz brand mark — the vector warp-burst logo (pink/cyan streaks bursting
 * from a gradient-ringed core), with an optional `SW` monogram. Presentational
 * only: renders procedurally-built inline SVG sized by `size`.
 */
@Component({
  selector: 'dba-hub-starwizz-mark',
  standalone: true,
  templateUrl: './starwizz-mark.component.html',
  styleUrl: './starwizz-mark.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarwizzMarkComponent {
  /** Pixel size (width & height) of the square mark. Defaults to 64. */
  readonly size = input<number>(64);
  /** When true, renders the `SW` monogram over the core. Defaults to true. */
  readonly showText = input<boolean>(true);

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Trusted SVG markup for the mark. The string is generated locally from a
   * seeded, deterministic burst (no user input), so bypassing the sanitizer is
   * safe and is required to inject procedurally-built inline SVG. A constant
   * `uid` keeps gradient ids stable across SSR + client renders (the mark is
   * used at most once per page), avoiding hydration id mismatches.
   */
  protected readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      buildStarwizzMark('swm', this.size(), this.showText()),
    ),
  );
}
