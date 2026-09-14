import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Daylight theme — a light ink share card on near-white paper with a magenta
 * accent. A brand row, an object hero, a 2×2 giant-stat grid, a band bar with
 * legend, gear chips, and an author / location footer, over a graticule +
 * constellation decoration.
 */
@Component({
  selector: 'dba-ag-daylight-theme',
  standalone: true,
  templateUrl: './daylight-theme.component.html',
  styleUrl: './daylight-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaylightThemeComponent extends CardThemeBaseDirective {
  /** RA/Dec graticule arc radii radiating from the top-right corner. */
  protected readonly graticuleArcs: readonly number[] = [60, 120, 180, 240, 298];

  /** Graticule ray end points (design angles 18°, 44°, 70°). */
  protected readonly graticuleRays = [
    { x2: 14.683, y2: 92.705 },
    { x2: 84.198, y2: 208.398 },
    { x2: 197.394, y2: 281.908 },
  ];

  /** Constellation node coordinates (shared `SConstellation` figure). */
  private readonly conNodes: ReadonlyArray<readonly [number, number]> = [
    [8, 82],
    [48, 30],
    [88, 60],
    [128, 18],
    [162, 48],
    [205, 26],
    [150, 92],
    [70, 108],
  ];

  /** Constellation edge index pairs. */
  private readonly conEdgeIndices: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [4, 6],
    [6, 7],
    [7, 0],
  ];

  /** Constellation stars, flagged `major` (every third) for a halo ring. */
  protected readonly conPoints = this.conNodes.map(([x, y], i) => ({ x, y, major: i % 3 === 0 }));

  /** Constellation edges as absolute line coordinates. */
  protected readonly conEdges = this.conEdgeIndices.map(([a, b]) => ({
    x1: this.conNodes[a][0],
    y1: this.conNodes[a][1],
    x2: this.conNodes[b][0],
    y2: this.conNodes[b][1],
  }));

  /** Constellation edge opacity (design `op * 0.5`). */
  protected readonly conLineOpacity = 0.14;
  /** Constellation star opacity (design `op`). */
  protected readonly conDotOpacity = 0.28;
  /** Constellation halo-ring opacity (design `op * 0.45`). */
  protected readonly conHaloOpacity = 0.126;

  /** Gear chip values: every equipment value, in the user's order. */
  protected gearChips(): string[] {
    return this.vm()
      .equipment.map((item) => item.value)
      .filter(Boolean);
  }

  /** Total frame count across the enabled bands (design `lFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
