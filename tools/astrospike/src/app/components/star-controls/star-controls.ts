import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IconButtonComponent, IconComponent, MicroSliderComponent, closeIcon } from '@db-astro-suite/ui';
import {
  STAR_FACTOR_STEP,
  STAR_INTENSITY_MAX,
  STAR_INTENSITY_MIN,
  STAR_LENGTH_MAX,
  STAR_LENGTH_MIN,
  STAR_ROTATION_MAX,
  STAR_ROTATION_MIN,
  STAR_ROTATION_STEP,
} from '../../constants/star-adjustment.constants';
import { SpikeEditorService } from '../../services/spike-editor.service';

/**
 * Floating controls for a single star, opened by double-clicking it on the
 * canvas.
 *
 * Every slider is a tweak layered on top of the global spike controls, so a
 * star that has never been touched here still follows them exactly. The panel
 * is anchored to the star's on-screen position by the stage.
 */
@Component({
  selector: 'dba-as-star-controls',
  standalone: true,
  imports: [IconButtonComponent, IconComponent, MicroSliderComponent],
  templateUrl: './star-controls.html',
  styleUrl: './star-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarControls {
  /** Id of the star being adjusted. */
  readonly starId = input.required<number>();

  /** Emitted when the user dismisses the panel. */
  readonly closed = output<void>();

  /** Shared editor state — the per-star adjustment map lives here. */
  protected readonly editor = inject(SpikeEditorService);

  /** Dismiss glyph. */
  protected readonly closeIcon = closeIcon;

  /** Lower bound of the per-star length multiplier. */
  protected readonly lengthMin = STAR_LENGTH_MIN;

  /** Upper bound of the per-star length multiplier. */
  protected readonly lengthMax = STAR_LENGTH_MAX;

  /** Lower bound of the per-star brightness multiplier. */
  protected readonly intensityMin = STAR_INTENSITY_MIN;

  /** Upper bound of the per-star brightness multiplier. */
  protected readonly intensityMax = STAR_INTENSITY_MAX;

  /** Step shared by both per-star multiplier sliders. */
  protected readonly factorStep = STAR_FACTOR_STEP;

  /** Lower bound of the per-star rotation, in degrees. */
  protected readonly rotationMin = STAR_ROTATION_MIN;

  /** Upper bound of the per-star rotation, in degrees. */
  protected readonly rotationMax = STAR_ROTATION_MAX;

  /** Step of the per-star rotation slider, in degrees. */
  protected readonly rotationStep = STAR_ROTATION_STEP;

  /** The star's current tweaks, or the neutral default. */
  protected readonly adjustment = computed(() => this.editor.adjustmentFor(this.starId()));

  /** True once the star carries any tweak — enables the reset action. */
  protected readonly isAdjusted = computed(() => this.editor.starAdjustments().has(this.starId()));

  /** Human-readable rank of the star within the flux-sorted list. */
  protected readonly starLabel = computed(() => `Star #${this.starId() + 1}`);

  /** Applies a new per-star length multiplier. */
  protected onLengthChange(value: number): void {
    this.editor.adjustStar(this.starId(), { lengthFactor: value });
  }

  /** Applies a new per-star brightness multiplier. */
  protected onIntensityChange(value: number): void {
    this.editor.adjustStar(this.starId(), { intensityFactor: value });
  }

  /** Applies a new per-star rotation offset. */
  protected onRotationChange(value: number): void {
    this.editor.adjustStar(this.starId(), { rotationDeg: value });
  }

  /** Returns this star to the global controls. */
  protected onReset(): void {
    this.editor.resetStarAdjustment(this.starId());
  }

  /** Removes this star's spikes entirely and dismisses the panel. */
  protected onRemoveSpikes(): void {
    this.editor.toggleStar(this.starId());
    this.closed.emit();
  }

  /** Dismisses the panel. */
  protected onClose(): void {
    this.closed.emit();
  }
}
