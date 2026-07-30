import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  MicroSliderComponent,
  TextButtonComponent,
  closeIcon,
} from '@db-astro-suite/ui';
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
import { round2, signedDegrees, signedFactor } from '../../utils/star-delta.util';

/**
 * Controls for a single star, opened by double-clicking it on the canvas and
 * laid out as a bar beneath the stage.
 *
 * A bar rather than a pane section, because per-star work is done while looking
 * at the star: under the stage it keeps the global sliders visible beside it and
 * opens no void in the inspector when it appears and disappears. It also cannot
 * cover the spikes being tuned, which a popover pinned to the star always did.
 *
 * Length, Brightness, and Rotation are tweaks layered on the global controls and
 * read as a signed delta with the resulting total spelled out; Diffusion is this
 * star's own absolute amount. Either way an untouched star follows the globals
 * exactly. The stage rings whichever star this bar belongs to.
 */
@Component({
  selector: 'dba-as-star-controls',
  standalone: true,
  imports: [IconButtonComponent, IconComponent, MicroSliderComponent, TextButtonComponent],
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

  /** Glyph on the deselect action. */
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

  /** Where the star sits on the full-resolution image. */
  protected readonly coordsLabel = computed(() => {
    const star = this.editor.allStars().find((candidate) => candidate.id === this.starId());
    return star === undefined ? '' : `x ${Math.round(star.x)} · y ${Math.round(star.y)}`;
  });

  /** Signed length tweak, as the delta a user thinks in. */
  protected readonly lengthDelta = computed(() => signedFactor(this.adjustment().lengthFactor));

  /** Resulting length once the global control is applied. */
  protected readonly lengthTotal = computed(
    () => `→ ${round2(this.editor.controls.length() * this.adjustment().lengthFactor)}× total`,
  );

  /** Signed brightness tweak. */
  protected readonly intensityDelta = computed(() =>
    signedFactor(this.adjustment().intensityFactor),
  );

  /** Resulting brightness once the global control is applied. */
  protected readonly intensityTotal = computed(
    () =>
      `→ ${round2(this.editor.controls.brightness() * this.adjustment().intensityFactor)}× total`,
  );

  /** Signed rotation offset in degrees. */
  protected readonly rotationDelta = computed(() => signedDegrees(this.adjustment().rotationDeg));

  /** Resulting rotation once the global control is applied. */
  protected readonly rotationTotal = computed(
    () => `→ ${Math.round(this.editor.controls.rotation() + this.adjustment().rotationDeg)}° total`,
  );

  /** This star's diffusion amount, or the inherited global one, rounded. */
  protected readonly diffusionLabel = computed(() => `${round2(this.diffusion())}`);

  /**
   * Name shown at the top of the panel. A detected star is identified by its
   * rank in the flux-sorted list; a hand-placed one has no such rank, so
   * claiming one would be a lie.
   */
  protected readonly starLabel = computed(() =>
    this.editor.isManualStar(this.starId()) ? 'Added star' : `Star #${this.starId() + 1}`,
  );

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
