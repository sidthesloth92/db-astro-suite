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
import {
  BASELINE,
  LEADER_VBW,
  MONTH_PX,
  MS_CORRIDOR,
  MS_CORRIDOR_STEP,
  MS_GAP,
  MS_STEM_MIN,
  PILL_BH,
  PILL_REF_W,
  PILL_TOP,
  STEM_MIN,
  STEM_RANGE,
  TIER_H,
  TIP_EDGE,
  TRACK_HEIGHT,
} from './heat-strip-layout.constants';

/**
 * Nightly-activity heat strip: a month-ticked baseline with one upward stem per
 * imaging night (sized by that night's integration). Notable nights — hours,
 * frames, Nth-object/night and best-night milestones — surface as labelled pills
 * packed into two staggered tiers, each joined to its night's spike by a
 * right-angle "corridor" leader. Hovering a night reveals its detail. The track
 * scrolls horizontally when a long history would otherwise crowd the nights.
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
  /** Leaders SVG viewBox — percent×10 in x, track px in y. */
  protected readonly leadersViewBox = `0 0 ${LEADER_VBW} ${TRACK_HEIGHT}`;

  /** Scrollable track width: one month-slot wide minimum, never below the panel. */
  protected readonly trackWidth = computed<string>(
    () => `max(100%, ${this.view().spanMonths * MONTH_PX}px)`,
  );

  /** A night's intensity (0–1) keyed by ISO date — used to size milestone stems. */
  private readonly fracByDate = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const n of this.view().nights) {
      map.set(n.date, n.frac);
    }
    return map;
  });

  /** Stem length (px) for each milestone night — taller, with a floor for the leader. */
  private readonly milestoneStem = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const m of this.view().milestones) {
      const frac = this.fracByDate().get(m.date) ?? 0.5;
      map.set(m.date, Math.max(MS_STEM_MIN, STEM_MIN + frac * STEM_RANGE));
    }
    return map;
  });

  /** Every night as an upward stem; milestone nights stand taller and brighter. */
  protected readonly nodes = computed<HeatNode[]>(() => {
    const stems = this.milestoneStem();
    return this.view().nights.map((n) => {
      const msStem = stems.get(n.date);
      const stemHeight = msStem ?? STEM_MIN + n.frac * STEM_RANGE;
      const dotTop = BASELINE - stemHeight;
      return {
        ...n,
        up: true,
        isMilestone: msStem != null,
        stemTop: dotTop,
        stemHeight,
        dotTop,
        dotSize: 6 + n.frac * 9,
      };
    });
  });

  /**
   * Milestone pills packed into two staggered tiers (each placed on the tier
   * that least displaces it from its night), with a right-angle corridor leader
   * dropping from the pill to that night's spike tip.
   */
  protected readonly placed = computed<PlacedMilestone[]>(() => {
    const stems = this.milestoneStem();
    const sorted = [...this.view().milestones].sort((a, b) => a.leftPct - b.leftPct);
    const tierRight = [-Infinity, -Infinity];
    return sorted.map((m) => {
      const truePct = Math.min(97, Math.max(3, m.leftPct));
      const halfPct = ((Math.max(m.big.length, m.small.length) * 6.4 + 22) / PILL_REF_W) * 100 / 2;
      let tier = 0;
      let slotPct = truePct;
      let bestDisplace = Infinity;
      for (let t = 0; t < 2; t++) {
        const candidate = Math.min(97 - halfPct, Math.max(truePct, tierRight[t] + MS_GAP + halfPct));
        const displace = Math.abs(candidate - truePct);
        if (displace < bestDisplace - 1e-6) {
          bestDisplace = displace;
          tier = t;
          slotPct = candidate;
        }
      }
      tierRight[tier] = slotPct + halfPct;

      const pillTop = PILL_TOP + tier * TIER_H;
      const tipY = BASELINE - (stems.get(m.date) ?? MS_STEM_MIN);
      const corridorY = MS_CORRIDOR + tier * MS_CORRIDOR_STEP;
      const x1 = (slotPct * LEADER_VBW) / 100;
      const x2 = (truePct * LEADER_VBW) / 100;
      const y1 = pillTop + PILL_BH;
      return {
        id: `${m.date}-${m.kind}-${m.big}`,
        color: MILESTONE_COLOR[m.kind],
        big: m.big,
        small: m.small,
        slotPct,
        truePct,
        pillTop,
        nodeTop: tipY,
        path: `M${x1} ${y1} L ${x1} ${corridorY} L ${x2} ${corridorY} L ${x2} ${tipY}`,
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
