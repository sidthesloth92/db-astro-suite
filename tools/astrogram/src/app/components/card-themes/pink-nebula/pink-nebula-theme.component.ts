import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeIconComponent } from '../shared/theme-icon/theme-icon.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeIntegrationBand } from '../../../models/card-theme.model';

/** Ring geometry constants (px) matching the design source's RingProgress. */
const RING_SIZE = 68;
const RING_STROKE = 3.5;

/**
 * Pink Nebula theme — the default card. Deep magenta on a nebula radial
 * background with gold dust, a catalogue-plate header, glowing integration
 * rings, and a two-column equipment / software / Bortle grid.
 */
@Component({
  selector: 'dba-ag-pink-nebula-theme',
  standalone: true,
  imports: [ThemeIconComponent, ThemeStarfieldComponent],
  templateUrl: './pink-nebula-theme.component.html',
  styleUrl: './pink-nebula-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinkNebulaThemeComponent extends CardThemeBaseDirective {
  /** Ring diameter in px. */
  protected readonly ringSize = RING_SIZE;
  /** Ring radius in px. */
  protected readonly ringRadius = (RING_SIZE - RING_STROKE) / 2;
  /** Ring stroke width in px. */
  protected readonly ringStroke = RING_STROKE;
  /** Ring circumference in px. */
  protected readonly ringCircumference = 2 * Math.PI * ((RING_SIZE - RING_STROKE) / 2);

  /** Decorative gold-dust specks (matches the design source's 12-speck field). */
  protected readonly goldDust = Array.from({ length: 12 }, (_unused, i) => ({
    cx: (i * 263) % 540,
    cy: (i * 167) % 720,
  }));

  /** Stroke dash offset that fills the ring to a band's percentage. */
  ringOffset(band: ThemeIntegrationBand): number {
    return this.ringCircumference * (1 - band.pct);
  }
}
