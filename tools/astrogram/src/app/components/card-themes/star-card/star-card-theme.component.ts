import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { FitTextDirective } from '../shared/fit-text/fit-text.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';

/**
 * Star Card theme — a collectible gold-foil archive card. A double gold
 * hairline frame holds a filigree ornament, a two-line title, a total-exposure
 * plate, per-band gems, a compact spec grid and a foil "Bortle class" rarity
 * bar. Decorated with the shared astro kit's dashed constellation figure.
 */
@Component({
  selector: 'dba-ag-star-card-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, FitTextDirective],
  templateUrl: './star-card-theme.component.html',
  styleUrl: './star-card-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarCardThemeComponent extends CardThemeBaseDirective {
  /** Shared constellation figure edges (astro kit, 220×150 design space). */
  protected readonly constellationEdges = [
    { x1: 8, y1: 82, x2: 48, y2: 30 },
    { x1: 48, y1: 30, x2: 88, y2: 60 },
    { x1: 88, y1: 60, x2: 128, y2: 18 },
    { x1: 128, y1: 18, x2: 162, y2: 48 },
    { x1: 162, y1: 48, x2: 205, y2: 26 },
    { x1: 162, y1: 48, x2: 150, y2: 92 },
    { x1: 150, y1: 92, x2: 70, y2: 108 },
    { x1: 70, y1: 108, x2: 8, y2: 82 },
  ];

  /** Shared constellation figure nodes; `halo` marks the ringed bright stars. */
  protected readonly constellationNodes = [
    { x: 8, y: 82, r: 2.3, halo: true },
    { x: 48, y: 30, r: 1.4, halo: false },
    { x: 88, y: 60, r: 1.4, halo: false },
    { x: 128, y: 18, r: 2.3, halo: true },
    { x: 162, y: 48, r: 1.4, halo: false },
    { x: 205, y: 26, r: 1.4, halo: false },
    { x: 150, y: 92, r: 2.3, halo: true },
    { x: 70, y: 108, r: 1.4, halo: false },
  ];

  /** First word of the object name (top title line). */
  protected objectNameFirst(): string {
    return this.vm().objectName.split(' ')[0] ?? '';
  }

  /** Remaining words of the object name, if any. */
  protected objectNameRest(): string {
    return this.vm().objectName.split(' ').slice(1).join(' ');
  }

  /** Total light frames across the enabled bands (design `sFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }

  /** Spec rows: every equipment row, in the user's order. */
  protected specRows(): readonly ThemeGearItem[] {
    return this.vm().equipment;
  }
}
