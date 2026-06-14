import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MILESTONE_COLOR } from '../../models/heat-milestone.constants';
import type { HeatNode, HeatStripView, PlacedMilestone } from '../../models/portfolio-view.types';
import { formatCount, formatDuration } from '../../utils/format.util';
import { edgeClampLeft } from '../../utils/heat-strip.util';
import { fmtDate } from '../../utils/portfolio.util';

const MONTH_PX = 66;
const TRACK_HEIGHT = 290;
const BASELINE = 188;
const STEM_MIN = 16;
const STEM_RANGE = 78;
const MS_DOT_Y = 126;
const MS_DOT_SIZE = 12;
const CHIP_H = 32;
const CHIP_W = 90;
const MS_MIN_LIFT = 12;
const MS_LANE_STEP = 38;
/** Min gap (px) a centred chip keeps from either track edge before clamping. */
const CHIP_EDGE = CHIP_W / 2 + 9;
/** Min gap (px) the centred hover tooltip keeps from either track edge. */
const TIP_EDGE = 96;

/**
 * Nightly-activity heat strip: a horizontally-scrollable, month-ticked baseline
 * with a thin stem per imaging night (alternating above/below, sized by that
 * night's integration). Notable nights — hours-logged, frame-count, Nth-object,
 * Nth-night and best-night milestones — surface as a dot + labelled chip lifted
 * into a collision-free lane. Hovering an ordinary night reveals its detail.
 */
@Component({
  selector: 'dba-heat-strip',
  standalone: true,
  templateUrl: './heat-strip.component.html',
  styleUrl: './heat-strip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeatStripComponent {
  /** The heat-strip view-model. */
  readonly view = input.required<HeatStripView>();

  /** The horizontally-scrollable track viewport. */
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  /** The currently hovered night, or null. */
  protected readonly hovered = signal<HeatNode | null>(null);

  /**
   * Open on the most recent activity (the densest end) rather than the sparse
   * earliest months, so the strip reads as full at a glance. Browser-only.
   */
  private readonly openAtLatest = afterNextRender(() => {
    const el = this.scroller()?.nativeElement;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  });

  /** Track height + baseline for the template. */
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly baseline = BASELINE;

  /** Dates carrying a milestone — their stems are replaced by the callout. */
  private readonly milestoneDates = computed<Set<string>>(
    () => new Set(this.view().milestones.map((m) => m.date)),
  );

  /** Scrollable track width: one month-slot wide minimum, never below the panel. */
  protected readonly trackWidth = computed<string>(
    () => `max(100%, ${this.view().spanMonths * MONTH_PX}px)`,
  );

  /** Ordinary nights (milestone nights are drawn as callouts instead). */
  protected readonly nodes = computed<HeatNode[]>(() => {
    const skip = this.milestoneDates();
    return this.view()
      .nights.filter((n) => !skip.has(n.date))
      .map((n, i) => {
        const up = i % 2 === 0;
        const stemHeight = STEM_MIN + n.frac * STEM_RANGE;
        return {
          ...n,
          up,
          stemTop: up ? BASELINE - stemHeight : BASELINE,
          stemHeight,
        };
      });
  });

  /** Milestone callouts with lane-resolved chip/connector geometry. */
  protected readonly placed = computed<PlacedMilestone[]>(() => {
    const trackPx = Math.max(1, this.view().spanMonths * MONTH_PX);
    const sorted = [...this.view().milestones].sort((a, b) => a.leftPct - b.leftPct);
    const laneRight: number[] = [];
    return sorted.map((m) => {
      const xPx = (m.leftPct / 100) * trackPx;
      const leftEdge = xPx - CHIP_W / 2;
      let lane = 0;
      while (lane < laneRight.length && laneRight[lane] > leftEdge - 6) {
        lane += 1;
      }
      laneRight[lane] = xPx + CHIP_W / 2;
      const chipBottom = MS_DOT_Y - MS_MIN_LIFT - lane * MS_LANE_STEP;
      return {
        id: `${m.date}-${m.kind}-${m.big}`,
        leftPct: m.leftPct,
        color: MILESTONE_COLOR[m.kind],
        big: m.big,
        small: m.small,
        chipLeft: edgeClampLeft(m.leftPct, CHIP_EDGE),
        chipTop: chipBottom - CHIP_H,
        lineTop: chipBottom,
        lineHeight: Math.max(0, BASELINE - chipBottom),
        dotTop: MS_DOT_Y - MS_DOT_SIZE / 2,
        dotSize: MS_DOT_SIZE,
      };
    });
  });

  /** Long date for the tooltip. */
  protected date(d: string): string {
    return fmtDate(d);
  }
  /** Duration for the tooltip. */
  protected dur(s: number): string {
    return formatDuration(s);
  }
  /** Thousands-separated count for the tooltip. */
  protected count(n: number): string {
    return formatCount(n);
  }
  /** Edge-clamped CSS `left` for the hover tooltip so it never overflows. */
  protected tipLeft(leftPct: number): string {
    return edgeClampLeft(leftPct, TIP_EDGE);
  }
}
