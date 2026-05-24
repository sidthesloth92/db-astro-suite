import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Section block inside an inspector panel. Mirrors the `SectionP`
 * primitive from the direction-b-polished design — an icon chip,
 * title, optional subtitle, optional action button, and a body slot.
 *
 * Slot map:
 * - `[slot=icon]` — chip glyph (typically a 14px icon)
 * - `[slot=action]` — trailing pill/button (e.g. "Wiki", "10h 20m")
 * - default slot — body content
 */
@Component({
  selector: 'dba-ui-inspector-section',
  standalone: true,
  templateUrl: './inspector-section.component.html',
  styleUrls: ['./inspector-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorSectionComponent {
  /** Primary section title. */
  title = input<string>('');
  /** Optional subtitle rendered below the title. */
  sub = input<string | undefined>(undefined);
  /** When true, reduces vertical padding around the header. */
  compact = input<boolean>(false);
  /** When true, the header (icon chip + title + action) is not rendered. */
  hideHeader = input<boolean>(false);
}
