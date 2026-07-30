import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IconComponent, MicroSliderComponent, chevronLeftIcon } from '@db-astro-suite/ui';
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
import { CONTROLS } from '../../constants/controls.constants';
import { SpikeEditorService } from '../../services/spike-editor.service';

/**
 * Controls for a single star, opened by double-clicking it on the canvas and
 * docked at the top of the controls pane.
 *
 * Length, Brightness, and Rotation are tweaks layered on top of the global
 * controls; Diffusion is this star's own absolute amount. Either way a star
 * that has never been touched here follows the global controls exactly. The stage
 * rings the star this panel belongs to — the panel deliberately does not float
 * over the canvas, where it would cover the spikes being tuned.
 */
@Component({
  selector: 'dba-as-star-controls',
  standalone: true,
  imports: [IconComponent, MicroSliderComponent],
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

  /** Glyph on the action that returns to the global controls. */
  protected readonly chevronLeftIcon = chevronLeftIcon;

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

  /** True while this star is currently drawn with spikes. */
  protected readonly isSpiked = computed(() =>
    this.editor.renderedStars().some((star) => star.id === this.starId()),
  );

  /** Lower bound of the per-star diffusion amount. */
  protected readonly diffusionMin = CONTROLS['diffusion'].min;

  /** Upper bound of the per-star diffusion amount. */
  protected readonly diffusionMax = CONTROLS['diffusion'].max;

  /** Step of the per-star diffusion slider. */
  protected readonly diffusionStep = CONTROLS['diffusion'].step;

  /**
   * Diffusion for this star: its own amount once it has one, otherwise the
   * global control's, so the slider opens showing what the star is actually
   * doing and moving it pins that star's own value.
   */
  protected readonly diffusion = computed(
    () => this.adjustment().diffusion ?? this.editor.controls.diffusion(),
  );

  /** True once this star's diffusion is pinned rather than following the global. */
  protected readonly hasOwnDiffusion = computed(() => this.adjustment().diffusion !== null);

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

  /**
   * Pins this star's own diffusion, independently of the global control. It is
   * an absolute amount, not a multiplier: with the global control at zero a
   * multiplier could never bloom one star, which is the point of setting it
   * here.
   * @param value The new diffusion amount.
   */
  protected onDiffusionChange(value: number): void {
    this.editor.adjustStar(this.starId(), { diffusion: value });
  }

  /** Returns this star to the global controls. */
  protected onReset(): void {
    this.editor.resetStarAdjustment(this.starId());
  }

  /**
   * Adds or removes this star's spikes — the same toggle a click on the
   * canvas performs. The panel stays open so the user can keep tuning.
   */
  protected onToggleSpikes(): void {
    this.editor.toggleStar(this.starId());
  }

  /** Dismisses the panel. */
  protected onClose(): void {
    this.closed.emit();
  }
}
