import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { FitTextDirective } from '../shared/fit-text/fit-text.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import { bandRowBreak } from '../../../utils/band-rows.util';
import { keepPlaceNamesTogether } from '../../../utils/keep-together.util';

/**
 * Credits theme — a cinema one-sheet. A one-line title fitted to the card
 * width, its first word solid and the rest outline-stroked, a band colour strip, a centred billing
 * block (captured by / shot on / processed in / total exposure) and a big
 * release date. Decorated with the shared astro kit's constellation and spikes.
 */
@Component({
  selector: 'dba-ag-credits-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, FitTextDirective, ThemeGearLineComponent],
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

  /** Remaining words of the object name (outline title line), if any. */
  protected objectNameRest(): string {
    return this.vm().objectName.split(' ').slice(1).join(' ');
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

  /** Bands on the first row when the band credits split in two (0 = one row). */
  protected bandBreak(): number {
    return bandRowBreak(this.vm().integration.length);
  }

  /** Location for the release line, wrapping only between its comma-separated parts. */
  protected releaseLocation(): string {
    return keepPlaceNamesTogether(this.vm().location);
  }
}
