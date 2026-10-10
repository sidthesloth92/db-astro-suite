import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { moonGlyphFor } from '../../utils/moon-phase.util';

/**
 * Small lunar-phase disk for a single date — the moon that was up that night.
 * Presentational: renders a faint outline plus the lit area (full disk, waxing/
 * waning path, or an empty new-moon outline). Colour follows `currentColor`.
 */
@Component({
  selector: 'dba-moon-glyph',
  standalone: true,
  templateUrl: './moon-glyph.component.html',
  styleUrl: './moon-glyph.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoonGlyphComponent {
  /** The date whose lunar phase is drawn. */
  readonly date = input.required<string>();
  /** Glyph geometry + phase name for the date. */
  protected readonly glyph = computed(() => moonGlyphFor(this.date()));
}
