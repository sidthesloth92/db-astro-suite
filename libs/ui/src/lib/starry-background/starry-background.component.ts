import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Full-bleed CSS-only star-field wrapper. Mirrors the `StarryBg`
 * primitive from the direction-b-polished design — a fixed dark
 * surface with subtle multi-layer radial-gradient "stars" sitting
 * behind the projected children. No JavaScript, no canvas, no DOM
 * thrash; safe for SSR.
 */
@Component({
  selector: 'dba-ui-starry-background',
  standalone: true,
  templateUrl: './starry-background.component.html',
  styleUrls: ['./starry-background.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarryBackgroundComponent {}
