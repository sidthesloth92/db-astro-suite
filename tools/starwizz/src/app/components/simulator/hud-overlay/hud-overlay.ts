import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Decorative HUD overlay — corner brackets and scanning line. */
@Component({
  selector: 'dba-sw-hud-overlay',
  imports: [],
  templateUrl: './hud-overlay.html',
  styleUrl: './hud-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudOverlay {}
