import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { keepPlaceNamesTogether } from '../../../utils/keep-together.util';
import { ringRadii } from '../../../utils/ring-radii.util';
import {
  STAR_TRAILS_INNER_RADIUS,
  STAR_TRAILS_MIN_INNER_RADIUS,
  STAR_TRAILS_OUTER_RADIUS,
  STAR_TRAILS_RING_STEP,
} from './star-trails.constants';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Star Trails theme — each filter renders as a concentric star-trail arc
 * around Polaris, its swept length proportional to that filter's share of the
 * night. Ambient faint trails, a Polaris crosshair, a band legend and the
 * shared footer complete the card.
 */
@Component({
  selector: 'dba-ag-star-trails-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './star-trails-theme.component.html',
  styleUrl: './star-trails-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarTrailsThemeComponent extends CardThemeBaseDirective {
  /** Polaris centre X in chart coordinates. */
  protected readonly cx = 238;
  /** Polaris centre Y in chart coordinates. */
  protected readonly cy = 196;

  /** Ambient faint trail arcs (deterministic decorative field). */
  protected readonly ambientTrails = Array.from({ length: 16 }, (_unused, i) => {
    const r = 26 + ((i * 37) % 210);
    const frac = 0.5 + ((i * 29) % 40) / 100;
    const circ = 2 * Math.PI * r;
    return { r, dash: `${circ * frac} ${circ}`, rot: (i * 53) % 360 };
  });

  /**
   * Band trail arcs — radius by index, sweep by exposure share. The design
   * stepped each trail 34 units out from the last, which only fits three: a
   * fourth ran past the chart's top edge and later bands were drawn outside
   * the chart entirely. Radii now tighten to fit every band.
   */
  protected readonly bands = computed(() => {
    const integration = this.vm().integration;
    const radii = ringRadii(
      integration.length,
      STAR_TRAILS_INNER_RADIUS,
      STAR_TRAILS_RING_STEP,
      STAR_TRAILS_OUTER_RADIUS,
      STAR_TRAILS_MIN_INNER_RADIUS,
    );
    return integration.map((band, i) => {
      const r = radii[i];
      const circ = 2 * Math.PI * r;
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        r,
        dash: `${circ * band.pct * 0.88} ${circ}`,
      };
    });
  });

  /** Location for the footer meta, wrapping only between its comma-separated parts. */
  protected readonly placeName = computed<string>(() => keepPlaceNamesTogether(this.vm().location));

  /** Total captured frames across every enabled band. */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
