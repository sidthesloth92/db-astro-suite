import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Named stroke-icon used across the Celestory portfolio (ported from the design's Icon). */
export type CelIconName =
  | 'galaxy'
  | 'camera'
  | 'optic'
  | 'mount'
  | 'chart'
  | 'star'
  | 'back'
  | 'arrow'
  | 'close'
  | 'share'
  | 'globe'
  | 'lock'
  | 'eye'
  | 'link'
  | 'check'
  | 'upload'
  | 'image'
  | 'download'
  | 'rocket'
  | 'key'
  | 'trash'
  | 'copy'
  | 'terminal'
  | 'edit';

/** A small, theme-coloured (currentColor) stroke icon. */
@Component({
  selector: 'dba-cel-icon',
  standalone: true,
  templateUrl: './cel-icon.component.html',
  styleUrl: './cel-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelIconComponent {
  /** Which icon to draw. */
  readonly name = input.required<CelIconName>();
  /** Size in CSS pixels. */
  readonly size = input<number>(16);
}
