import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';

/**
 * Star Trails theme — each filter renders as a concentric star-trail arc
 * around Polaris, its swept length proportional to that filter's share of the
 * night. Ambient faint trails, a Polaris crosshair, a band legend and the
 * shared footer complete the card.
 */
@Component({
  selector: 'dba-ag-star-trails-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
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

  /** Band trail arcs — radius by index, sweep by exposure share. */
  protected readonly bands = computed(() =>
    this.vm().integration.map((band, i) => {
      const r = 96 + i * 34;
      const circ = 2 * Math.PI * r;
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        r,
        dash: `${circ * band.pct * 0.88} ${circ}`,
      };
    }),
  );

  /** Total captured frames across every enabled band. */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }

  /** Compact footer gear line: telescope · camera · filter values. */
  protected footerLine(): string {
    const eq = this.vm().equipment;
    return [eq[0], eq[1], eq[4]]
      .filter((item): item is ThemeGearItem => item != null)
      .map((item) => item.value)
      .join(' · ');
  }
}
