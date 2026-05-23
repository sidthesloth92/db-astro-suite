import { Component, ChangeDetectionStrategy } from '@angular/core';

// TODO: Simulator HUD overlay still uses Tailwind `neon-pink/*` utility
// classes hardcoded in `hud-overlay.html` (border-neon-pink/60,
// text-neon-pink/70, shadow-[0_0_10px_rgba(255,45,149,0.5)], etc.).
// These should migrate to the Direction B Polished `var(--db-color-*)`
// tokens like the rest of the surfaces. Deferred from the wholesale
// restyle PR per the canonical plan — out of scope for that change.

@Component({
  selector: 'dba-sw-hud-overlay',
  imports: [],
  templateUrl: './hud-overlay.html',
  styleUrl: './hud-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HudOverlay {

}
