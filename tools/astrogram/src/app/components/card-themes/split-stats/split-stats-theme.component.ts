import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';

/**
 * Split Stats theme — a fitness-app style share card. A brand row, the object
 * headline with caption, a 2×2 grid of giant stats (integration / frames /
 * filters / bortle), a band bar with legend, and pill gear chips over an author
 * row. Decorated with the shared astro kit's graticule and constellation.
 */
@Component({
  selector: 'dba-ag-split-stats-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './split-stats-theme.component.html',
  styleUrl: './split-stats-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitStatsThemeComponent extends CardThemeBaseDirective {
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

  /** Graticule arc radii radiating from the top-right corner (design `SGraticule`). */
  protected readonly graticuleRadii = [60, 120, 180, 240, 298];

  /** Graticule meridian lines from the top-right corner. */
  protected readonly graticuleLines = [
    { x2: 14.68, y2: 92.71 },
    { x2: 84.2, y2: 208.4 },
    { x2: 197.39, y2: 281.91 },
  ];

  /** Total light frames across the enabled bands (design `sFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }

  /** Caption with the design's rose emoji stripped (design `sClean`). */
  protected cleanCaption(): string {
    return this.vm().caption.replace(/🌹/g, '').trim();
  }

  /** Gear chip rows: every equipment row, in the user's order. */
  protected chipRows(): readonly ThemeGearItem[] {
    return this.vm().equipment;
  }
}
