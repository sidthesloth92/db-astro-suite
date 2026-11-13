import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Flight Log theme — a boarding-pass ticket. A mint header, a FROM → TO route
 * between catalogue id and target, a detail field grid, perforated notch
 * dividers, exposure "segments", a gear strip, and a barcode stub footer.
 */
@Component({
  selector: 'dba-ag-flight-log-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './flight-log-theme.component.html',
  styleUrl: './flight-log-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightLogThemeComponent extends CardThemeBaseDirective {

  /** Deterministic barcode bar widths / ink for the ticket stub. */
  protected readonly barcodeBars = Array.from({ length: 56 }, (_unused, i) => ({
    width: ((i * 53) % 4) + 1,
    filled: (i * 29) % 5 >= 2,
  }));
}
