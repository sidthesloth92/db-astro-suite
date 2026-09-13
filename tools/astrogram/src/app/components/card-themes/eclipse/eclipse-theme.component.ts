import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Eclipse theme — totality, where the data is the corona. Filters become ring
 * segments swept around the occulting Moon disc (arc length = exposure share),
 * wrapped by a glowing corona, streamers and a diamond-ring glint, with the
 * total integration set inside the disc.
 */
@Component({
  selector: 'dba-ag-eclipse-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './eclipse-theme.component.html',
  styleUrl: './eclipse-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EclipseThemeComponent extends CardThemeBaseDirective {
  /** Disc centre X in chart coordinates. */
  protected readonly cx = 238;
  /** Disc centre Y in chart coordinates. */
  protected readonly cy = 190;
  /** Moon disc radius. */
  protected readonly discR = 104;
  /** Corona glow radius (`discR * 2.1`). */
  protected readonly glowR = 104 * 2.1;

  /** Corona streamer rays around the disc (deterministic positions). */
  protected readonly streamers = ((): { x1: number; y1: number; x2: number; y2: number }[] => {
    const cx = 238;
    const cy = 190;
    const R = 104;
    const polar = (r: number, deg: number): [number, number] => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    return [14, 62, 118, 156, 204, 248, 296, 334].map((a, i) => {
      const [x1, y1] = polar(R + 8, a);
      const [x2, y2] = polar(R + 34 + (i % 3) * 18, a);
      return { x1, y1, x2, y2 };
    });
  })();

  /** Diamond-ring glint position on the disc rim. */
  protected readonly glint = ((): { x: number; y: number } => {
    const rad = ((318 - 90) * Math.PI) / 180;
    return { x: 238 + 104 * Math.cos(rad), y: 190 + 104 * Math.sin(rad) };
  })();

  /** Band ring segments — arc length proportional to exposure share. */
  protected readonly segments = computed(() => {
    let acc = 0;
    return this.vm().integration.map((band) => {
      const start = acc * 360;
      acc += band.pct;
      const sweep = band.pct * 360 - 5;
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        d: this.segPath(120, start, sweep),
      };
    });
  });

  /** Compact footer gear line: every equipment value, in the user's order. */
  protected footerLine(): string {
    return this.vm()
      .equipment.map((item) => item.value)
      .filter(Boolean)
      .join(' · ');
  }

  /** Polar → cartesian around the disc centre. */
  private polar(r: number, deg: number): [number, number] {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [this.cx + r * Math.cos(rad), this.cy + r * Math.sin(rad)];
  }

  /** Arc path for a ring segment starting at `start`, sweeping `sweep` degrees. */
  private segPath(r: number, start: number, sweep: number): string {
    const [x1, y1] = this.polar(r, start);
    const [x2, y2] = this.polar(r, start + sweep);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  }
}
