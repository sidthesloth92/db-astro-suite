import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';
import type { ThemeGearItem } from '../../../models/card-theme.model';

/**
 * Radiant theme — a meteor shower where each filter's frames streak outward
 * from the radiant point (count ∝ frames, length ∝ exposure share). Ambient
 * micro-streaks, per-band bars and a feed-style caption chip that highlights
 * the object name complete the card.
 */
@Component({
  selector: 'dba-ag-radiant-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './radiant-theme.component.html',
  styleUrl: './radiant-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadiantThemeComponent extends CardThemeBaseDirective {
  /** Radiant point X in chart coordinates. */
  protected readonly rx = 238;
  /** Radiant point Y in chart coordinates. */
  protected readonly ry = 128;

  /** Ambient decorative micro-streaks around the radiant. */
  protected readonly ambientStreaks = ((): { x1: number; y1: number; x2: number; y2: number }[] => {
    const rx = 238;
    const ry = 128;
    return Array.from({ length: 22 }, (_unused, i) => {
      const a = (i * 61) % 360;
      const rad = (a * Math.PI) / 180;
      const r0 = 26 + ((i * 17) % 30);
      const len = 20 + ((i * 23) % 44);
      return {
        x1: rx + r0 * Math.cos(rad),
        y1: ry + r0 * Math.sin(rad),
        x2: rx + (r0 + len) * Math.cos(rad),
        y2: ry + (r0 + len) * Math.sin(rad),
      };
    });
  })();

  /** Band meteor streaks — one line + head per contributing frame group. */
  protected readonly streaks = computed(() => {
    const rx = 238;
    const ry = 128;
    const out: {
      color: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      w: number;
      headR: number;
    }[] = [];
    this.vm().integration.forEach((band, bi) => {
      const n = Math.max(2, Math.round((parseInt(band.frames, 10) || 0) / 12));
      for (let i = 0; i < n; i++) {
        const seed = (bi * 97 + i * 31) % 360;
        const a = (seed * 1.7 + bi * 40) % 360;
        const rad = (a * Math.PI) / 180;
        const r0 = 30 + (seed % 26);
        const len = 52 + band.pct * 170 + (seed % 38);
        const w = 1.4 + band.pct * 1.6;
        out.push({
          color: band.color,
          x1: rx + r0 * Math.cos(rad),
          y1: ry + r0 * Math.sin(rad),
          x2: rx + (r0 + len) * Math.cos(rad),
          y2: ry + (r0 + len) * Math.sin(rad),
          w,
          headR: w * 1.15,
        });
      }
    });
    return out;
  });

  /** Per-band bar rows beneath the meteor field. */
  protected readonly rows = computed(() =>
    this.vm().integration.map((band) => ({
      id: band.id,
      color: band.color,
      time: band.time,
      frames: band.frames,
      pctWidth: `${band.pct * 100}%`,
    })),
  );

  /** Caption split into runs, flagging the object-name word for highlight. */
  protected readonly captionParts = computed(() => {
    const caption = this.vm().caption.replace(/🌹/g, '').trim();
    if (!caption) return [];
    const token = this.vm().objectName.split(' ')[0];
    if (!token) return [{ text: caption, highlight: false }];
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return caption
      .split(new RegExp(`(${escaped})`, 'gi'))
      .filter((part) => part.length > 0)
      .map((part) => ({ text: part, highlight: part.toLowerCase() === token.toLowerCase() }));
  });

  /** Compact footer gear line: telescope · camera · filter values. */
  protected footerLine(): string {
    const eq = this.vm().equipment;
    return [eq[0], eq[1], eq[4]]
      .filter((item): item is ThemeGearItem => item != null)
      .map((item) => item.value)
      .join(' · ');
  }
}
