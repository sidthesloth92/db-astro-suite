import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  IconComponent,
  chevronLeftIcon,
  chevronRightIcon,
} from '@db-astro-suite/ui';
import {
  COMPARE_ARIA_LABEL,
  COMPARE_ARIA_MAX,
  COMPARE_ARIA_MIN,
  COMPARE_NUDGE_STEP,
} from '../../constants/compare-handle.constants';

/**
 * Dumb draggable divider for the stage's before/after comparison.
 *
 * The host stretches over the whole preview frame and stays click-through, so
 * the host's bounding rect is the drag track: a pointer at `rect.left` means
 * 0, at `rect.right` means 1 — the divider therefore reaches both true edges.
 * Only the round grip takes pointer events, and it captures the pointer on
 * press so a drag keeps tracking after it leaves the grip. The line renders at
 * the exact position (matching the stage's wipe seam) while the grip clamps
 * half its width inside the frame so it is never clipped.
 *
 * It owns no state beyond the transient drag flag — the position is supplied
 * by the parent and every change is emitted back out.
 */
@Component({
  selector: 'dba-as-compare-handle',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './compare-handle.html',
  styleUrl: './compare-handle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareHandle {
  /** Left chevron inside the grip. */
  protected readonly chevronLeftIcon = chevronLeftIcon;

  /** Right chevron inside the grip. */
  protected readonly chevronRightIcon = chevronRightIcon;

  /** Divider position along the stage as a fraction in [0, 1]. */
  readonly position = input.required<number>();

  /** Emits the new clamped position whenever the user moves the divider. */
  readonly positionChange = output<number>();

  /** Host element — its bounding rect is the drag track. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The thin divider element that receives pointer events. */
  private readonly divider = viewChild.required<ElementRef<HTMLElement>>('divider');

  /** True while a pointer drag is in progress — drives the active styling. */
  protected readonly isDragging = signal(false);

  /** Screen-reader label for the divider. */
  protected readonly ariaLabel = COMPARE_ARIA_LABEL;

  /** Lowest reported slider value. */
  protected readonly ariaMin = COMPARE_ARIA_MIN;

  /** Highest reported slider value. */
  protected readonly ariaMax = COMPARE_ARIA_MAX;

  /** Divider position as a clamped [0, 1] fraction, consumed by the stylesheet. */
  protected readonly positionFraction = computed(() => this.clampUnit(this.position()));

  /** Divider offset from the left edge of the stage, in percent. */
  protected readonly positionPercent = computed(() => this.positionFraction() * 100);

  /** Position reported to assistive tech as a whole number of percent. */
  protected readonly ariaValueNow = computed(() => Math.round(this.positionPercent()));

  /** Pointer pressed on the grip — capture it and track from there. */
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.divider().nativeElement.setPointerCapture(event.pointerId);
    this.isDragging.set(true);
    this.emitForClientX(event.clientX);
  }

  /** Pointer moved — track it while a drag is in progress. */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }
    this.emitForClientX(event.clientX);
  }

  /** Pointer released or cancelled — end the drag and release the capture. */
  protected onPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }
    this.isDragging.set(false);
    const divider = this.divider().nativeElement;
    if (divider.hasPointerCapture(event.pointerId)) {
      divider.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * Keyboard control: arrows nudge the divider, Home/End jump to the extremes.
   * Any other key is left to the browser.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    const current = this.clampUnit(this.position());
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = current - COMPARE_NUDGE_STEP;
        break;
      case 'ArrowRight':
        next = current + COMPARE_NUDGE_STEP;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.positionChange.emit(this.clampUnit(next));
  }

  /**
   * Converts a client x position into a track fraction and emits it. A track
   * with no width (never laid out) is ignored rather than emitting NaN.
   */
  private emitForClientX(clientX: number): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    this.positionChange.emit(this.clampUnit((clientX - rect.left) / rect.width));
  }

  /** Clamps a value into the [0, 1] range the divider is defined over. */
  private clampUnit(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
