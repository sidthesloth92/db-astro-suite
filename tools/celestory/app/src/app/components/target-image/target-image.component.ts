import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { targetArtSeed, renderTargetArt } from '../../utils/astro-art.util';
import { CelIconComponent, type CelIconName } from '../cel-icon/cel-icon.component';

/**
 * An imaged target's thumbnail. Paints a premium, deterministic vector motif for
 * the target's category (galaxy spiral / nebula shell / globular swarm / …) on a
 * `<canvas>` in the browser; falls back to a faint star field + category glyph on
 * the server / before paint. The parent controls size/aspect.
 */
@Component({
  selector: 'dba-target-image',
  standalone: true,
  imports: [CelIconComponent],
  templateUrl: './target-image.component.html',
  styleUrl: './target-image.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TargetImageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The target's id (seeds deterministic art). */
  readonly targetId = input<string>('');
  /** The target's category (selects the motif). */
  readonly category = input<string>('');
  /** Category glyph shown as the SSR/no-canvas fallback. */
  readonly icon = input<CelIconName>('galaxy');
  /** Optional placeholder caption. */
  readonly label = input<string>('');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('art');
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) {
        return;
      }
      this.paint();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.paint());
        this.resizeObserver.observe(canvas);
      }
    });
    // Re-paint when the target/category changes (browser only — guarded by canvas presence).
    effect(() => {
      this.targetId();
      this.category();
      this.paint();
    });
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  private paint(): void {
    if (!this.isBrowser) {
      return;
    }
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    renderTargetArt(canvas, this.category(), targetArtSeed(this.targetId(), this.category()));
  }
}
