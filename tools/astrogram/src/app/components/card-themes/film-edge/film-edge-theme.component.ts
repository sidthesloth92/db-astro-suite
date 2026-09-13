import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Film Edge theme — a single frame of astro film. Sprocket holes and amber
 * edge-print data bracket an exposed frame that holds the subject, a big total
 * exposure and the bands as exposure codes over a dense starfield with
 * diffraction spikes.
 */
@Component({
  selector: 'dba-ag-film-edge-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './film-edge-theme.component.html',
  styleUrl: './film-edge-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilmEdgeThemeComponent extends CardThemeBaseDirective {
  /** Sprocket-hole placeholders per edge strip (design renders 10). */
  protected readonly sprockets = Array.from({ length: 10 });

  /** Total light frames across the enabled bands (design `sFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }

  /** Total exposure with whitespace removed for the edge print, e.g. `10h20m`. */
  protected totalNoSpace(): string {
    return this.vm().total.replace(/\s/g, '');
  }

  /** Footer gear line: every equipment value, in the user's order. */
  protected gearLine(): string {
    return this.vm()
      .equipment.map((item) => item.value)
      .filter(Boolean)
      .join(' · ');
  }
}
