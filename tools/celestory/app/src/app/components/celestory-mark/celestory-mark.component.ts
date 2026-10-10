import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChildren,
} from '@angular/core';
import { MARK_CYAN, MARK_PINK, MARK_POP_FRAC, MARK_POP_MS } from '../../models/celestory-mark.constants';
import type { MarkGeometry, MarkVariant } from '../../models/celestory-mark.types';
import { buildMarkGeometry } from '../../utils/celestory-mark.util';
import { clamp, easeInOutCubic, easeOutCubic } from '../../utils/ease.util';

let markUid = 0;

/**
 * The Celestory brand mark: a dotted session-log crescent "C" cradling a
 * moon-phase story on a timeline spine. Pure SVG, deterministic, theme-coloured
 * (cyan↔pink scatter). `variant="full"` is the wordmark lockup glyph;
 * `variant="icon"` is the compact square mark for favicons/avatars. When
 * `animated` is set it plays the launch sequence (crescent pops in dot-by-dot,
 * then twinkles, as the phases and timeline arrive) — browser-only, SSR-safe.
 */
@Component({
  selector: 'dba-celestory-mark',
  standalone: true,
  templateUrl: './celestory-mark.component.html',
  styleUrl: './celestory-mark.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelestoryMarkComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** Rendered width in CSS pixels. */
  readonly size = input<number>(40);
  /** Which composition to draw. */
  readonly variant = input<MarkVariant>('full');
  /** Play the launch animation (browser only). */
  readonly animated = input<boolean>(false);

  /** Rendered SVG primitives, in paint order, for the animation to drive. */
  private readonly shapeEls = viewChildren<ElementRef<SVGGraphicsElement>>('shape');

  /** Unique gradient id so multiple marks can coexist on a page. */
  protected readonly uid = `cmk-${markUid++}`;
  /** First/second gradient stop colours for the spine line (logo palette). */
  protected readonly cyan = MARK_CYAN;
  protected readonly pink = MARK_PINK;

  /** Resolved geometry for the current variant. */
  protected readonly geo = computed<MarkGeometry>(() => buildMarkGeometry(this.variant()));

  /** Rendered height derived from width × the variant's aspect ratio. */
  protected readonly height = computed(() => this.size() * this.geo().heightRatio);

  private rafId = 0;
  private startedAt = 0;

  constructor() {
    afterNextRender(() => {
      if (this.animated()) {
        this.play();
      }
    });
    // Guard for SSR: rafId is only set in the browser (afterNextRender), so on
    // the server it stays 0 and cancelAnimationFrame (undefined there) is never called.
    this.destroyRef.onDestroy(() => {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
    });
  }

  /** Restart the launch animation from the beginning. */
  play(): void {
    cancelAnimationFrame(this.rafId);
    this.startedAt = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    const t = now - this.startedAt;
    const els = this.shapeEls();
    const shapes = this.geo().shapes;
    for (let i = 0; i < els.length && i < shapes.length; i++) {
      const el = els[i].nativeElement;
      const sp = shapes[i];
      const base = sp.opacity ?? 1;
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center';
      if (sp.role === 'cell') {
        const rank = sp.rank ?? 0;
        if (t < MARK_POP_MS) {
          const st = rank * (1 - MARK_POP_FRAC);
          const lp = easeOutCubic(clamp((t / MARK_POP_MS - st) / MARK_POP_FRAC, 0, 1));
          el.style.opacity = (base * lp).toFixed(3);
          el.style.transform = `scale(${(0.1 + 0.9 * lp).toFixed(3)})`;
        } else {
          const tw = t - MARK_POP_MS;
          const v = sp.seed ?? 0.5;
          const blend = clamp(tw / 360, 0, 1);
          const k = 0.62 + 0.38 * Math.sin(tw * (0.0014 + v * 0.0016) + v * 44);
          el.style.opacity = (base * (1 - blend + k * blend)).toFixed(3);
          el.style.transform = 'scale(1)';
        }
      } else if (sp.role === 'phase') {
        const lp = easeOutCubic(clamp((t - (sp.delay ?? 0)) / 280, 0, 1));
        el.style.opacity = (base * lp).toFixed(3);
        el.style.transform = `scale(${(0.2 + 0.8 * lp).toFixed(3)})`;
      } else if (sp.role === 'spine') {
        const len = (sp.x2 ?? 0) - (sp.x1 ?? 0);
        const draw = easeInOutCubic(clamp((t - (sp.delay ?? 0)) / 360, 0, 1));
        el.style.strokeDasharray = String(len);
        el.style.strokeDashoffset = (len * (1 - draw)).toFixed(2);
      } else if (sp.role === 'node') {
        const lp = easeOutCubic(clamp((t - (sp.delay ?? 0)) / 240, 0, 1));
        el.style.opacity = (base * lp).toFixed(3);
        el.style.transform = `scale(${(0.3 + 0.7 * lp).toFixed(3)})`;
      }
    }
    this.rafId = requestAnimationFrame(this.frame);
  };
}
