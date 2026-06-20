import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { StoryObject } from '../../models/story.model';
import { UniverseGlobeRenderer } from '../../utils/universe-globe-renderer.util';

/**
 * "View My Universe" entry portal — a slowly rotating celestial globe with the
 * user's imaged targets glowing where they really sit on the sky, threaded by
 * great-circle arcs. Click (or Enter/Space) to step into the planetarium.
 * Browser-only canvas; SSR renders the caption only.
 */
@Component({
  selector: 'dba-universe-globe',
  standalone: true,
  templateUrl: './universe-globe.component.html',
  styleUrl: './universe-globe.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'button',
    tabindex: '0',
    '(click)': 'enter.emit()',
    '(keydown.enter)': 'enter.emit()',
    '(keydown.space)': 'onSpace($event)',
    '(mouseenter)': 'hovered = true',
    '(mouseleave)': 'hovered = false',
  },
})
export class UniverseGlobeComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** Imaged objects (those carrying RA/Dec are plotted on the globe). */
  readonly objects = input.required<StoryObject[]>();

  /** Enter the planetarium. */
  readonly enter = output<void>();

  /** Hover flag (read by the renderer to spin faster). */
  protected hovered = false;

  private readonly stageRef = viewChild<ElementRef<HTMLDivElement>>('stage');
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const stage = this.stageRef()?.nativeElement;
      if (!canvas || !stage) {
        return;
      }
      const renderer = new UniverseGlobeRenderer(canvas, this.objects(), () => this.hovered);
      const apply = (): void => {
        const r = stage.getBoundingClientRect();
        renderer.resize(r.width, r.height);
      };
      apply();
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(apply);
        ro.observe(stage);
        this.destroyRef.onDestroy(() => ro.disconnect());
      }
      renderer.start();
      this.destroyRef.onDestroy(() => renderer.stop());
    });
  }

  /** Space activates the portal without scrolling the page. */
  protected onSpace(event: Event): void {
    event.preventDefault();
    this.enter.emit();
  }
}
