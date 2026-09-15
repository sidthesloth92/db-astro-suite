import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeIconComponent } from '../shared/theme-icon/theme-icon.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Observatory theme — warm copper/amber telemetry on near-black. A bordered
 * "observatory" masthead with a concentric-circle logo, a target designation
 * panel, a tabular exposure-telemetry readout with fill bars, and split
 * hardware / pipeline panels closing on a bordered Bortle meter.
 */
@Component({
  selector: 'dba-ag-observatory-theme',
  standalone: true,
  imports: [ThemeIconComponent, ThemeStarfieldComponent],
  templateUrl: './observatory-theme.component.html',
  styleUrl: './observatory-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservatoryThemeComponent extends CardThemeBaseDirective {
  /** Telemetry fill-bar width as a CSS percentage for an integration band. */
  bandWidth(pct: number): string {
    return `${pct * 100}%`;
  }
}
