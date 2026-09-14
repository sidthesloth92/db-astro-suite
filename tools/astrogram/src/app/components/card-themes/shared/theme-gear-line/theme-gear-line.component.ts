import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A run of equipment values separated by middle dots, e.g. the one-line gear
 * footer several card themes print along their bottom edge.
 *
 * The values used to be joined into one string, so a line could break inside
 * a single item — "SVBony SV106 60mm+" at the end of one line and
 * "ASI120MM Mini" at the start of the next — which reads as two pieces of
 * kit. Each value is now its own unit: lines break only between items, and an
 * item wider than a whole line wraps within itself rather than overflowing.
 *
 * Typography, colour and alignment come from the host: the parent theme styles
 * this element through its own class, and sets `justify-content` to align it.
 */
@Component({
  selector: 'dba-ag-theme-gear-line',
  standalone: true,
  templateUrl: './theme-gear-line.component.html',
  styleUrl: './theme-gear-line.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGearLineComponent {
  /** Equipment values to print, in the user's order. */
  readonly values = input.required<readonly string[]>();
}
