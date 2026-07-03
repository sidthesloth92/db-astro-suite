import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Credits Ivory theme — a movie one-sheet printed on ivory paper. Ink speckle,
 * a dashed constellation and diffraction spikes, a solid/outline two-line
 * title, a band colour strip, a centred billing block, and a big numeric
 * release date.
 */
@Component({
  selector: 'dba-ag-credits-ivory-theme',
  standalone: true,
  templateUrl: './credits-ivory-theme.component.html',
  styleUrl: './credits-ivory-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditsIvoryThemeComponent extends CardThemeBaseDirective {
  /** Ink speckle dots scattered over the paper (design `lSpecks`, seed 7). */
  protected readonly specks = Array.from({ length: 70 }, (_unused, i) => {
    const n = (i + 7) * 9301 + 49297;
    return {
      cx: n % 540,
      cy: (n * 7) % 720,
      r: i % 11 === 0 ? 1.3 : 0.7,
      opacity: ((((i * 13) % 5) + 2) / 10) * 0.22,
    };
  });

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
  protected readonly conLineOpacity = 0.15;
  /** Constellation star opacity (design `op`). */
  protected readonly conDotOpacity = 0.3;
  /** Constellation halo-ring opacity (design `op * 0.45`). */
  protected readonly conHaloOpacity = 0.135;

  /** First word of the object name (rendered solid). */
  protected titleFirst(): string {
    return this.vm().objectName.split(' ')[0] ?? '';
  }

  /** Remaining words of the object name (rendered as an outline). */
  protected titleRest(): string {
    return this.vm().objectName.split(' ').slice(1).join(' ');
  }

  /** "Shot on" credit: telescope × camera. */
  protected shotOn(): string {
    const eq = this.vm().equipment;
    return [eq[0]?.value, eq[1]?.value].filter(Boolean).join(' × ');
  }

  /** "Riding" credit: the mount. */
  protected riding(): string {
    return this.vm().equipment[2]?.value ?? '';
  }

  /** "Filtered through" credit: the filter set. */
  protected filteredThrough(): string {
    return this.vm().equipment[4]?.value ?? '';
  }

  /** "Processed in" credit: first word of each software value, joined. */
  protected processedIn(): string {
    return this.vm()
      .software.map((s) => s.value.split(' ')[0])
      .join(' · ');
  }

  /** Big release date reformatted `MM.DD.YY` from the numeric date. */
  protected releaseDate(): string {
    const parts = this.vm().dateNumeric.split('.');
    if (parts.length !== 3) {
      return this.vm().dateNumeric;
    }
    const [year, month, day] = parts;
    return `${month}.${day}.${year.slice(2)}`;
  }

  /** Total frame count across the enabled bands (design `lFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
