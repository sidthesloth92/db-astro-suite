import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
} from '@angular/core';
import { fitFontSize } from '../../../../utils/fit-text.util';

/**
 * Keeps a heading on one line by shrinking its font size until it fits the
 * width available, never growing it past its designed size.
 *
 * Card themes lay out on canvases whose width changes with the export format,
 * and object names range from "M31" to "North America Nebula", so a fixed
 * display size either wraps a long name over several lines — eating the space
 * the rest of the card needs — or leaves a short one undersized. Only if the
 * line would have to drop below `fitTextMin` does it fall back to wrapping,
 * so a name is never clipped.
 *
 * The host must be a block-level box whose width is set by its container. The
 * size is written as an inline style, which the card exporter copies into the
 * downloaded image along with every other computed style.
 */
@Directive({
  selector: '[dbaAgFitText]',
  standalone: true,
})
export class FitTextDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Designed font size in px — the size the line keeps whenever it fits. */
  readonly dbaAgFitText = input.required<number>();

  /** Smallest font size in px before the line is allowed to wrap. */
  readonly fitTextMin = input<number>(12);

  /** The text being fitted; changing it re-fits the line. */
  readonly fitTextContent = input<string>('');

  constructor() {
    afterRenderEffect(() => {
      // Read the inputs so any change schedules a re-fit.
      this.dbaAgFitText();
      this.fitTextMin();
      this.fitTextContent();
      this.fit();
    });

    afterNextRender(() => {
      const el = this.host.nativeElement;
      // The canvas width changes with the chosen format, and web fonts can
      // land after the first measurement — both change the answer.
      const resize = new ResizeObserver(() => this.fit());
      resize.observe(el);
      const onFonts = (): void => this.fit();
      document.fonts.addEventListener('loadingdone', onFonts);
      void document.fonts.ready.then(onFonts);
      this.destroyRef.onDestroy(() => {
        resize.disconnect();
        document.fonts.removeEventListener('loadingdone', onFonts);
      });
    });
  }

  /** Measures the line at its designed size and applies the size that fits. */
  private fit(): void {
    const el = this.host.nativeElement;
    const max = this.dbaAgFitText();
    const min = this.fitTextMin();

    el.style.whiteSpace = 'nowrap';
    el.style.fontSize = `${max}px`;

    // `scrollWidth` never reports less than the box, so only an overflowing
    // line gives a real measurement; a line that fits keeps its designed size.
    if (el.scrollWidth <= el.clientWidth) return;

    const size = fitFontSize(max, min, el.clientWidth, el.scrollWidth);
    el.style.fontSize = `${size}px`;

    // At the floor and still too wide: wrap rather than clip the name.
    if (el.scrollWidth > el.clientWidth) {
      el.style.whiteSpace = 'normal';
    }
  }
}
