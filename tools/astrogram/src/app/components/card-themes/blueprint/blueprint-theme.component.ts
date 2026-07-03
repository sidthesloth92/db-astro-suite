import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';

/**
 * Blueprint theme — a cyan technical schematic on a navy engineering grid.
 * Renders the card like a drawing titleblock: a framed border with corner
 * cross-marks, a subject heading, a dimensioned exposure schedule, a numbered
 * parts list, and a three-cell footer titleblock.
 */
@Component({
  selector: 'dba-ag-blueprint-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './blueprint-theme.component.html',
  styleUrl: './blueprint-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintThemeComponent extends CardThemeBaseDirective {
  /** Equipment then software rows, capped at the seven parts-list slots. */
  protected readonly partsList = computed<readonly ThemeGearItem[]>(() =>
    [...this.vm().equipment, ...this.vm().software].slice(0, 7),
  );

  /** Zero-padded parts-list row number (`01`, `02`, …) for a row index. */
  protected rowNumber(index: number): string {
    return `${index + 1}`.padStart(2, '0');
  }
}
