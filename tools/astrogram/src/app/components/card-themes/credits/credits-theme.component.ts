import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Credits theme — a cinema one-sheet. "Astrogram presents", a stacked title
 * with an outline-stroke second line, a band colour strip, a centred billing
 * block (captured by / shot on / processed in / total exposure) and a big
 * release date. Decorated with the shared astro kit's constellation and spikes.
 */
@Component({
  selector: 'dba-ag-credits-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './credits-theme.component.html',
  styleUrl: './credits-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditsThemeComponent extends CardThemeBaseDirective {
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

  /** First word of the object name (solid title line). */
  protected objectNameFirst(): string {
    return this.vm().objectName.split(' ')[0] ?? '';
  }

  /** Remaining words of the object name (outline title line), default `Nebula`. */
  protected objectNameRest(): string {
    return this.vm().objectName.split(' ').slice(1).join(' ') || 'Nebula';
  }

  /** Equipment value at a row index, or an empty string when absent. */
  protected equipmentValue(index: number): string {
    return this.vm().equipment[index]?.value ?? '';
  }

  /** Software billing: the first word of every software name, dot-joined. */
  protected softwareShort(): string {
    return this.vm()
      .software.map((item) => item.value.split(' ')[0])
      .join(' · ');
  }

  /** Total light frames across the enabled bands (design `sFrames`). */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }

  /** Release date in cinema `MM.DD.YY` form, derived from the numeric date. */
  protected releaseDate(): string {
    const parts = this.vm().dateNumeric.split('.');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts;
    return `${month}.${day}.${year.slice(2)}`;
  }
}
