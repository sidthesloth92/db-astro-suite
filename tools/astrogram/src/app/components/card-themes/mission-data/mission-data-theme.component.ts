import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Mission Data theme — a mission-control dashboard of dark tiles with big
 * stats: a title tile with a full Bortle ring gauge, a three-up KPI row, a
 * stacked exposure-by-band breakdown, and rig / pipeline tiles.
 */
@Component({
  selector: 'dba-ag-mission-data-theme',
  standalone: true,
  templateUrl: './mission-data-theme.component.html',
  styleUrl: './mission-data-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDataThemeComponent extends CardThemeBaseDirective {
  /** Bortle ring diameter in px. */
  protected readonly ringSize = 72;
  /** Bortle ring stroke width in px. */
  protected readonly ringStroke = 6;
  /** Bortle ring radius in px. */
  protected readonly ringRadius = (72 - 6) / 2;
  /** Bortle ring circumference in px. */
  protected readonly ringCircumference = 2 * Math.PI * ((72 - 6) / 2);

  /** Total light frames across all enabled bands (Frames KPI tile). */
  protected readonly frameCount = computed<number>(() =>
    this.vm().integration.reduce((sum, band) => sum + (Number.parseInt(band.frames, 10) || 0), 0),
  );

  /** Number of enabled filter bands (Filters KPI tile). */
  protected readonly filterCount = computed<number>(() => this.vm().integration.length);

  /** A band's share of the total integration as a whole-number percentage. */
  protected pctRounded(pct: number): number {
    return Math.round(pct * 100);
  }
}
