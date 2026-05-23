import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Accent colour for the leading icon cell of a `DataRowComponent`. */
export type DataRowAccent = 'pink' | 'cyan';

/**
 * Compact icon + label + value row. Mirrors the `DataRow` primitive from
 * the direction-b-polished design — used in the equipment / software
 * columns of the infographic card. The leading icon is projected via
 * `[slot=icon]`; both `label` and `value` are plain string inputs.
 */
@Component({
  selector: 'dba-ui-data-row',
  standalone: true,
  templateUrl: './data-row.component.html',
  styleUrls: ['./data-row.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataRowComponent {
  /** Uppercase caption rendered above the value. */
  label = input<string>('');
  /** Primary value text rendered below the label. */
  value = input<string>('');
  /** Accent colour for the leading icon cell. Defaults to `'pink'`. */
  accent = input<DataRowAccent>('pink');
}
