import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  CL_EDGES,
  CL_GRADIENT_ID,
  CL_NODES,
  CL_TIMING,
} from './constellation-loader.constants';
import {
  buildConstellationMarkup,
  edgeLength,
} from './constellation-loader.util';

/**
 * Branded loading indicator: the Astrogram constellation mark drawing itself
 * in — edges trace on, nodes pop with an overshoot, the tagged reticles
 * breathe, and twinkle stars settle — then the whole sequence loops. Used as
 * the plate-solving overlay (fill) and the generic card spinner (sized).
 *
 * All DOM work happens browser-side in `afterNextRender`; on the server the
 * `<svg>` stays empty (SSR-safe). Honours `prefers-reduced-motion` by snapping
 * to the finished constellation instead of animating.
 */
@Component({
  selector: 'dba-ui-constellation-loader',
  standalone: true,
  templateUrl: './constellation-loader.component.html',
  styleUrls: ['./constellation-loader.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.fill]': 'fill()' },
})
export class ConstellationLoaderComponent {
  /** Fixed width/height in px. Ignored when `fill` is true. */
  readonly size = input<number>(100);
  /** When true, the loader fills its container instead of using `size`. */
  readonly fill = input<boolean>(false);

  /** Host `<svg>` the constellation is injected into and animated within. */
  private readonly stage =
    viewChild.required<ElementRef<SVGSVGElement>>('stage');

  private readonly platformId = inject(PLATFORM_ID);

  /** Live Web-Animations handles, cancelled on destroy / restart. */
  private animations: Animation[] = [];
  /** Timer that restarts the draw-in loop. */
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Injects the constellation, then animates it (or snaps it, if reduced). */
  private start(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const svg = this.stage().nativeElement;
    svg.innerHTML = buildConstellationMarkup(CL_GRADIENT_ID);
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      this.snapToRest(svg);
      return;
    }
    this.animate(svg);
  }

  /** Cancels every running animation and the loop timer. */
  private stop(): void {
    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations = [];
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /** Runs one full draw-in pass and schedules the next. */
  private animate(svg: SVGSVGElement): void {
    this.stop();
    const t = CL_TIMING;

    const lines = svg.querySelectorAll<SVGLineElement>('.cl-line');
    const lineTotal = lines.length * t.lineStagger + t.lineDuration;
    lines.forEach((line, i) => {
      const [ai, bi] = CL_EDGES[i];
      const len = edgeLength(CL_NODES[ai], CL_NODES[bi]);
      this.animations.push(
        line.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          {
            duration: t.lineDuration,
            delay: i * t.lineStagger,
            easing: 'cubic-bezier(.6,.1,.2,1)',
            fill: 'forwards',
          },
        ),
      );
    });

    const nodes = svg.querySelectorAll<SVGGElement>('.cl-node');
    nodes.forEach((node, i) => {
      this.animations.push(
        node.animate(
          [
            { transform: 'scale(0)' },
            { transform: 'scale(1.18)', offset: 0.7 },
            { transform: 'scale(1)' },
          ],
          {
            duration: t.nodeDuration,
            delay: lineTotal * 0.5 + i * t.nodeStagger,
            easing: 'cubic-bezier(.34,1.56,.64,1)',
            fill: 'forwards',
          },
        ),
      );
    });
    const nodesEnd =
      lineTotal * 0.5 + nodes.length * t.nodeStagger + t.nodeDuration;

    const stars = svg.querySelectorAll<SVGCircleElement>('.cl-star');
    stars.forEach((star, i) => {
      const peak = 0.55 + Math.random() * 0.4;
      star.style.transformBox = 'fill-box';
      star.style.transformOrigin = 'center';
      this.animations.push(
        star.animate(
          [
            { opacity: 0, transform: 'scale(0.4)' },
            { opacity: peak, transform: 'scale(1.25)', offset: 0.6 },
            { opacity: peak * 0.85, transform: 'scale(1)' },
          ],
          {
            duration: t.starDuration,
            delay: nodesEnd + 60 + i * t.starStagger,
            easing: 'ease-out',
            fill: 'forwards',
          },
        ),
      );
    });

    const rings = svg.querySelectorAll<SVGCircleElement>('.cl-ring');
    rings.forEach((ring) => {
      ring.style.transformBox = 'fill-box';
      ring.style.transformOrigin = 'center';
      this.animations.push(
        ring.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0.55, transform: 'scale(1.14)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          {
            duration: t.ringDuration,
            delay: lineTotal + 400,
            iterations: Infinity,
            easing: 'ease-in-out',
          },
        ),
      );
    });

    const total =
      nodesEnd + stars.length * t.starStagger + t.starDuration + t.loopTailPadding;
    this.loopTimer = setTimeout(() => this.animate(svg), total);
  }

  /** Reduced-motion fallback: show the finished constellation, no animation. */
  private snapToRest(svg: SVGSVGElement): void {
    svg
      .querySelectorAll<SVGLineElement>('.cl-line')
      .forEach((line) => line.setAttribute('stroke-dashoffset', '0'));
    svg
      .querySelectorAll<SVGGElement>('.cl-node')
      .forEach((node) => (node.style.transform = 'scale(1)'));
    svg
      .querySelectorAll<SVGCircleElement>('.cl-star')
      .forEach((star) => star.setAttribute('opacity', '0.8'));
  }
}
