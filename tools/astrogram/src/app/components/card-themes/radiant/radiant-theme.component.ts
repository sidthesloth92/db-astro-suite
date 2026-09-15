import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { hexToRgbChannels } from '../../../utils/hex-rgb.util';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Radiant theme — a meteor shower where each filter's frames streak outward
 * from the radiant point (count ∝ frames, length ∝ exposure share). Ambient
 * micro-streaks, per-band bars and a feed-style caption chip that highlights
 * the object name complete the card.
 */
@Component({
  selector: 'dba-ag-radiant-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './radiant-theme.component.html',
  styleUrl: './radiant-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadiantThemeComponent extends CardThemeBaseDirective {
  /** Radiant point X in chart coordinates. */
  protected readonly rx = 238;
  /** Radiant point Y in chart coordinates. */
  protected readonly ry = 128;
  /** Meteor-field viewBox width. */
  private readonly chartWidth = 476;
  /** Meteor-field viewBox height. */
  private readonly chartHeight = 300;

  /** The secondary colour's `r, g, b` channels, for the translucent sky glow behind the burst. */
  protected readonly secondaryRgb = computed(() => hexToRgbChannels(this.cardData().secondaryAccentColor));

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
        const w = 1.4 + band.pct * 1.6;
        // Longer rays mean a bigger exposure share, but the chart is only 300
        // units tall with the radiant at 128, so steep rays ran out of the
        // viewBox and their heads were sliced off. Each ray stops just inside.
        const len = Math.min(
          52 + band.pct * 170 + (seed % 38),
          this.rayRoom(rx, ry, rad, w * 1.15 + 3) - r0,
        );
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

  /**
   * Distance from the radiant to the chart edge along a direction, less a
   * margin that keeps a ray's head fully visible.
   */
  private rayRoom(rx: number, ry: number, rad: number, margin: number): number {
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const toX = dx > 0 ? (this.chartWidth - margin - rx) / dx : dx < 0 ? (margin - rx) / dx : Infinity;
    const toY = dy > 0 ? (this.chartHeight - margin - ry) / dy : dy < 0 ? (margin - ry) / dy : Infinity;
    return Math.min(toX, toY);
  }

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
    // The user's own words, emoji included — the design stripped its sample rose.
    const caption = this.vm().caption.trim();
    if (!caption) return [];
    const token = this.vm().objectName.split(' ')[0];
    if (!token) return [{ text: caption, highlight: false }];
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return caption
      .split(new RegExp(`(${escaped})`, 'gi'))
      .filter((part) => part.length > 0)
      .map((part) => ({ text: part, highlight: part.toLowerCase() === token.toLowerCase() }));
  });
}
