import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Presentational browser-chrome frame used to wrap a tool's demo media
 * (preview image / animation / terminal) on the detail pages. Renders a
 * faux window title bar — three dots, an address label, and an optional
 * status indicator — above projected content. No state, no side effects.
 */
@Component({
  selector: 'dba-hub-demo-frame',
  standalone: true,
  templateUrl: './demo-frame.component.html',
  styleUrl: './demo-frame.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoFrameComponent {
  /** Address-bar label shown in the title bar, e.g. `'astrogram.app'`. */
  readonly label = input<string>('');
  /** Optional status text shown on the right of the title bar. */
  readonly status = input<string>('');
  /** When true, the status indicator uses the cyan "live" dot + glow. */
  readonly live = input<boolean>(false);
}
