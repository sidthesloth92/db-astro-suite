import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import type { AtlasBandStar } from './atlas-band-star.model';

/**
 * Atlas theme — a vintage star-atlas plate printed on cream paper. Ink
 * speckle, a double-rule plate frame, an engraved constellation chart whose
 * three brightest stars carry the filter bands, a serif exposure ledger, and
 * an instruments / colophon footer.
 */
@Component({
  selector: 'dba-ag-atlas-theme',
  standalone: true,
  templateUrl: './atlas-theme.component.html',
  styleUrl: './atlas-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasThemeComponent extends CardThemeBaseDirective {
  /** Ink speckle dots scattered over the paper (design `lSpecks`, seed 7). */
  protected readonly specks = Array.from({ length: 90 }, (_unused, i) => {
    const n = (i + 7) * 9301 + 49297;
    return {
      cx: n % 540,
      cy: (n * 7) % 720,
      r: i % 11 === 0 ? 1.3 : 0.7,
      opacity: ((((i * 13) % 5) + 2) / 10) * 0.3,
    };
  });

  /** Star-chart figure width in px (design `CW`). */
  protected readonly chartWidth = 440;
  /** Star-chart figure height in px (design `CH`). */
  protected readonly chartHeight = 236;

  /** Chart node coordinates (design `nodes`). */
  private readonly nodes: ReadonlyArray<readonly [number, number]> = [
    [36, 150],
    [96, 66],
    [168, 110],
    [240, 40],
    [302, 94],
    [398, 58],
    [330, 172],
    [182, 198],
    [86, 192],
  ];

  /** Node index pairs joined by the constellation figure (design `edges`). */
  private readonly edges: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [4, 6],
    [6, 7],
    [7, 8],
    [8, 0],
    [7, 2],
  ];

  /** Node indices that carry a band marker (design `brightIdx`). */
  private readonly brightNodeIndices: readonly number[] = [3, 6, 8];

  /** Concentric graticule arc radii. */
  protected readonly graticuleRadii: readonly number[] = [150, 240, 330];
  /** Graticule arc centre x (design `CW * 0.9`). */
  protected readonly graticuleCx = 396;
  /** Graticule arc centre y. */
  protected readonly graticuleCy = -60;

  /** Faint radial meridian lines drawn across the chart. */
  protected readonly meridians = [0.22, 0.5, 0.78].map((f) => ({
    x1: 440 * f,
    y1: 6,
    x2: 440 * f - 18,
    y2: 230,
  }));

  /** Constellation figure edges as absolute line coordinates. */
  protected readonly figureEdges = this.edges.map(([a, b]) => ({
    x1: this.nodes[a][0],
    y1: this.nodes[a][1],
    x2: this.nodes[b][0],
    y2: this.nodes[b][1],
  }));

  /** Minor (unlabelled) chart stars. */
  protected readonly minorStars = this.nodes
    .map(([x, y], i) => ({ x, y, i }))
    .filter((p) => !this.brightNodeIndices.includes(p.i));

  /** Band-marked chart stars paired with their integration band (design `bright`). */
  protected bandStars(): readonly AtlasBandStar[] {
    const bands = this.vm().integration;
    const out: AtlasBandStar[] = [];
    this.brightNodeIndices.forEach((nodeIdx, slot) => {
      const band = bands[slot];
      if (band) {
        out.push({ x: this.nodes[nodeIdx][0], y: this.nodes[nodeIdx][1], band });
      }
    });
    return out;
  }

  /** Instruments byline: every equipment value, in the user's order. */
  protected instrumentsLine(): string {
    return this.vm()
      .equipment.map((item) => item.value)
      .filter(Boolean)
      .join(' · ');
  }

  /** Total frame count across the enabled bands (design `lFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
