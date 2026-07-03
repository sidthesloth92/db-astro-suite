import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Constellation card theme — plots the target as a star-chart constellation
 * over a faint RA/Dec graticule. The three brightest nodes glow in each
 * filter's colour to encode the integration bands; an object name-plate,
 * caption and a two-column Apparatus / Pipeline legend sit below.
 */
@Component({
  selector: 'dba-ag-constellation-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './constellation-theme.component.html',
  styleUrl: './constellation-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstellationThemeComponent extends CardThemeBaseDirective {
  /** Chart drawing width in design units. */
  protected readonly chartWidth = 540;
  /** Chart drawing height in design units (the SVG band the chart fills). */
  protected readonly chartHeight = 380;
  /** Vertical offset of the chart group within the 720-tall card. */
  protected readonly chartTop = 36;

  /** Constellation node positions as fractions of the chart box. */
  protected readonly nodeFractions: readonly number[][] = [
    [0.16, 0.3],
    [0.3, 0.16],
    [0.46, 0.28],
    [0.6, 0.14],
    [0.74, 0.3],
    [0.84, 0.5],
    [0.68, 0.56],
    [0.52, 0.5],
    [0.4, 0.62],
    [0.24, 0.56],
    [0.3, 0.4],
  ];
  /** Node index pairs joined by constellation edges. */
  protected readonly edgeIndices: readonly number[][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 2],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 0],
  ];
  /** Node indices whose stars are lit to carry the first three bands. */
  protected readonly brightNodeIndices: readonly number[] = [3, 5, 8];

  /** Node centres in chart-space px. */
  protected readonly starNodes = this.nodeFractions.map((n) => ({
    x: n[0] * this.chartWidth,
    y: n[1] * this.chartHeight,
  }));

  /** Edge line segments between joined nodes, in chart-space px. */
  protected readonly edgeLines = this.edgeIndices.map((e) => ({
    x1: this.starNodes[e[0]].x,
    y1: this.starNodes[e[0]].y,
    x2: this.starNodes[e[1]].x,
    y2: this.starNodes[e[1]].y,
  }));

  /** Vertical graticule x positions in chart-space px. */
  protected readonly graticuleX = [0.25, 0.5, 0.75].map((f) => f * this.chartWidth);
  /** Horizontal graticule y positions in chart-space px. */
  protected readonly graticuleY = [0.3, 0.55].map((f) => f * this.chartHeight);
  /** Chart-space y of the graticule's lower edge. */
  protected readonly graticuleBottom = this.chartHeight - 20;
  /** Chart-space x of the graticule's right edge. */
  protected readonly graticuleRight = this.chartWidth - 20;

  /** Lit band stars: node centre, band, and HTML label placement (percent). */
  protected readonly brightStars = computed(() => {
    const bands = this.vm().integration;
    return this.brightNodeIndices.flatMap((nodeIdx, k) => {
      const band = bands[k];
      if (!band) return [];
      const node = this.starNodes[nodeIdx];
      const frac = this.nodeFractions[nodeIdx];
      return [
        {
          band,
          x: node.x,
          y: node.y,
          labelTopPct: ((this.chartTop + frac[1] * this.chartHeight + 12) / 720) * 100,
          labelLeftPct: frac[0] * 100,
        },
      ];
    });
  });
}
