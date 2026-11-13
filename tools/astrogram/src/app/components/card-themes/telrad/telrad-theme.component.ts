import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import { keepPlaceNamesTogether, keepWordsTogether } from '../../../utils/keep-together.util';
import { joinMetaItems } from '../../../utils/meta-join.util';

/**
 * Telrad theme — a red-light finder reticle in night-vision mode. Filters are
 * plotted as dots on the 0.5° / 2° / 4° rings (dot size = exposure share),
 * with a crosshair, per-band readout bars and the red-tinted footer.
 */
@Component({
  selector: 'dba-ag-telrad-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './telrad-theme.component.html',
  styleUrl: './telrad-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelradThemeComponent extends CardThemeBaseDirective {
  /** Reticle centre X in chart coordinates. */
  protected readonly cx = 238;
  /** Reticle centre Y in chart coordinates. */
  protected readonly cy = 214;

  /** The three concentric finder rings with their degree labels. */
  protected readonly reticleRings = ((): {
    r: number;
    strokeWidth: number;
    opacity: number;
    label: string;
    labelX: number;
    labelY: number;
  }[] => {
    const cx = 238;
    const cy = 214;
    const labels = ['0.5°', '2°', '4°'];
    const polar = (r: number, deg: number): [number, number] => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    return [52, 118, 184].map((r, i) => {
      const [lx, ly] = polar(r, 135);
      return {
        r,
        strokeWidth: i === 0 ? 1.6 : 1.1,
        opacity: 0.8 - i * 0.18,
        label: labels[i],
        // Just outside the ring at 135°: sitting on the stroke, the ring ran
        // through the label and "0.5°" read as "0 5°".
        labelX: lx + 7,
        labelY: ly + 13,
      };
    });
  })();

  /** Crosshair ticks beyond the outer ring at the four cardinal points. */
  protected readonly crosshairTicks = ((): { x1: number; y1: number; x2: number; y2: number }[] => {
    const cx = 238;
    const cy = 214;
    const polar = (r: number, deg: number): [number, number] => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    return [0, 90, 180, 270].map((a) => {
      const [x1, y1] = polar(188, a);
      const [x2, y2] = polar(202, a);
      return { x1, y1, x2, y2 };
    });
  })();

  /** Band dots placed on the rings — dot radius scales with exposure share. */
  protected readonly reticleDots = computed(() => {
    const cx = 238;
    const cy = 214;
    const rings = [52, 118, 184];
    // Past the third band the rings repeat, so each band also needs its own
    // angle or its dot lands exactly on an earlier band's.
    const angles = [210, 318, 74, 150, 20, 262, 112];
    const polar = (r: number, deg: number): [number, number] => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    return this.vm().integration.map((band, i) => {
      const r = rings[i % rings.length];
      const [x, y] = polar(r, angles[i % angles.length]);
      const dotR = 4 + band.pct * 9;
      return { x, y, glowR: dotR + 4, dotR, coreR: dotR * 0.45 };
    });
  });

  /** Per-band readout rows for the bars beneath the reticle. */
  protected readonly rows = computed(() =>
    this.vm().integration.map((band, i) => ({
      id: band.id,
      time: band.time,
      frames: band.frames,
      pctWidth: `${band.pct * 100}%`,
      ringLabel: this.ringLabel(i),
    })),
  );

  /**
   * Footer meta line: date, place and Bortle class. Each item stays whole and
   * a wrap breaks only before a dot, with "Bortle 9" held to the place before
   * it. Wrapping between whole items instead left "Sep 13, 2026 ·" alone on a
   * line above a long place, or "Bortle 9" alone below it.
   */
  protected readonly footMeta = computed(() => {
    const data = this.vm();
    return joinMetaItems(
      [keepWordsTogether(data.dateShort), keepPlaceNamesTogether(data.location), keepWordsTogether(`Bortle ${data.bortle}`)],
      true,
    );
  });

  /** Degree label for the ring a band sits on (`0.5°` / `2°` / `4°`). */
  private ringLabel(index: number): string {
    return ['0.5°', '2°', '4°'][index % 3];
  }
}
