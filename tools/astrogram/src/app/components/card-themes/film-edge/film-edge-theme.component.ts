import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import { rgbTriplet } from '../../../utils/picker-color.util';

/**
 * Film Edge theme — a single frame of astro film. Sprocket holes and amber
 * edge-print data bracket an exposed frame that holds the subject, a big total
 * exposure and the bands as exposure codes over a dense starfield with
 * diffraction spikes.
 */
@Component({
  selector: 'dba-ag-film-edge-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './film-edge-theme.component.html',
  styleUrl: './film-edge-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilmEdgeThemeComponent extends CardThemeBaseDirective {
  /** Secondary picker colour as `"r, g, b"`, for the translucent nebula glow in the frame. */
  protected readonly secondaryRgb = computed<string>(() => rgbTriplet(this.cardData().secondaryAccentColor));

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
}
