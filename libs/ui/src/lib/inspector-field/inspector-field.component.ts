import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Vertical-density preset for an `InspectorFieldComponent` row. */
export type InspectorFieldDensity = 'compact' | 'comfortable';

/**
 * Two-column label + control row inside an inspector panel.
 * Mirrors the `FieldP` primitive from the direction-b-polished design:
 * a fixed 82px label column, a 12px gap, and the control rendered in
 * the right column via the default content slot.
 */
@Component({
  selector: 'dba-ui-inspector-field',
  standalone: true,
  templateUrl: './inspector-field.component.html',
  styleUrls: ['./inspector-field.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorFieldComponent {
  /** Primary label rendered in the left column. */
  label = input<string>('');
  /** Optional supporting caption rendered under the label. */
  sub = input<string | undefined>(undefined);
  /** Vertical density of the row. Defaults to `'comfortable'`. */
  density = input<InspectorFieldDensity>('comfortable');
}
