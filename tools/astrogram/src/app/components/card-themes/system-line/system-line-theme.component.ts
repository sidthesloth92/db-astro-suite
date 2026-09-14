import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { calculateTotalIntegration } from '../../../models/card-data.model';
import { rectTouchesDiscs } from '../../../utils/disc-overlap.util';
import { separateDiscs } from '../../../utils/disc-spacing.util';
import { hourTicksFor } from '../../../utils/hour-ticks.util';
import { staggerLabels } from '../../../utils/label-spread.util';
import {
  SYSTEM_LINE_AXIS_Y,
  SYSTEM_LINE_LABEL_GAP,
  SYSTEM_LINE_LABEL_MAX_X,
  SYSTEM_LINE_LABEL_MIN_X,
  SYSTEM_LINE_LABEL_ROW_ABOVE,
  SYSTEM_LINE_LABEL_ROW_BELOW,
  SYSTEM_LINE_MIN_PLANET_RADIUS,
  SYSTEM_LINE_PLANET_GAP,
  SYSTEM_LINE_SUN_EDGE_X,
  SYSTEM_LINE_TICK_CHAR_WIDTH,
  SYSTEM_LINE_TICK_LABEL_ASCENT,
  SYSTEM_LINE_TICK_LABEL_Y,
} from './system-line.constants';
import { ThemeGearLineComponent } from '../shared/theme-gear-line/theme-gear-line.component';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * System Line theme — the solar system as a number line. Each filter is a
 * planet placed along an ecliptic axis at its cumulative share of the night,
 * sized by exposure, with the session origin rendered as the Sun. A centred
 * total display and the shared compact footer close the card.
 */
@Component({
  selector: 'dba-ag-system-line-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent, ThemeGearLineComponent],
  templateUrl: './system-line-theme.component.html',
  styleUrl: './system-line-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemLineThemeComponent extends CardThemeBaseDirective {
  /** Planet geometry: one disc per filter, placed by cumulative share. */
  protected readonly planets = computed(() => {
    const span = 400;
    let acc = 0;
    const placed = this.vm().integration.map((band) => {
      const cx = 48 + (acc + band.pct / 2) * span;
      acc += band.pct;
      return { band, cx, r: 7 + band.pct * 30 };
    });
    // Short bands sit close together, and at their designed size the discs of
    // three 30-minute filters overlapped into one blob. Crowded discs shrink
    // just enough to stay apart; well-spaced ones keep their size.
    const radii = separateDiscs(
      placed.map((p) => p.cx),
      placed.map((p) => p.r),
      SYSTEM_LINE_PLANET_GAP,
      SYSTEM_LINE_MIN_PLANET_RADIUS,
      SYSTEM_LINE_SUN_EDGE_X,
    );
    return placed.map(({ band, cx }, i) => {
      const r = radii[i];
      return {
        id: band.id,
        color: band.color,
        time: band.time,
        frames: band.frames,
        cx,
        r,
        glowR: r + 6,
        ringRx: r + 12,
        ringRy: (r + 12) * 0.28,
        tickY1: SYSTEM_LINE_AXIS_Y - r - 12,
        tickY2: SYSTEM_LINE_AXIS_Y - r - 4,
        isFirst: i === 0,
        gradId: `sl-pl-${i}`,
      };
    });
  });

  /**
   * Hour ticks along the axis, scaled to this card's total integration. The
   * design hard-coded ticks for its 10h 20m sample, so any other total put
   * planets and hour labels on different scales — a 14h 30m session still
   * read 0h–10h with its last planet past the "10h" mark.
   *
   * A tick whose label a planet is drawn over keeps its mark but drops the
   * label, which otherwise showed as a stray fragment ("6" poking out from
   * under a large disc).
   */
  protected readonly hourTicks = computed(() => {
    const totalHours = calculateTotalIntegration(this.cardData().filters) / 3600;
    if (totalHours <= 0) return [];
    const discs = this.planets();
    return hourTicksFor(totalHours).map((hh) => {
      const x = 48 + (hh / totalHours) * 400;
      const halfWidth = (`${hh}h`.length * SYSTEM_LINE_TICK_CHAR_WIDTH) / 2 + 1;
      const isLabelHidden = rectTouchesDiscs(
        x - halfWidth,
        x + halfWidth,
        SYSTEM_LINE_TICK_LABEL_Y - SYSTEM_LINE_TICK_LABEL_ASCENT,
        SYSTEM_LINE_TICK_LABEL_Y + 1,
        SYSTEM_LINE_AXIS_Y,
        discs,
      );
      return { hh, x, isLabelHidden };
    });
  });

  /**
   * Position of each band's label. Labels sit directly under their planet
   * unless that would crowd a neighbour: planets are placed by cumulative
   * share, so short bands cluster. Spreading crowded labels along one row then
   * left some ~130 units from their planet, so crowded labels alternate
   * between the row under the axis and a row above it instead, each row
   * spread on its own and kept inside the chart.
   */
  protected readonly labels = computed(() =>
    staggerLabels(
      this.planets().map((p) => p.cx),
      SYSTEM_LINE_LABEL_GAP,
      SYSTEM_LINE_LABEL_MIN_X,
      SYSTEM_LINE_LABEL_MAX_X,
    ).map(({ x, isSecondRow }) => {
      const [idY, timeY, framesY] = isSecondRow ? SYSTEM_LINE_LABEL_ROW_ABOVE : SYSTEM_LINE_LABEL_ROW_BELOW;
      return { x, idY, timeY, framesY, isSecondRow };
    }),
  );

  /** Whether any band label moved to the row above the axis. */
  protected readonly hasLabelsAbove = computed(() => this.labels().some((l) => l.isSecondRow));

  /** Total captured frames across every enabled band. */
  protected totalFrames(): number {
    return this.vm().integration.reduce((sum, band) => sum + (parseInt(band.frames, 10) || 0), 0);
  }
}
