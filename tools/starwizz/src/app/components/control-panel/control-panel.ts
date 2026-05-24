import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IconComponent,
  MicroSliderComponent,
  SelectComponent,
  SwitchComponent,
  TextButtonComponent,
  circleHelpIcon,
  rotateCcwIcon,
  type SelectItem,
} from '@db-astro-suite/ui';
import {
  CONTROLS,
  FORMATS,
  FORMAT_GROUPS,
  FormatKey,
} from '../../constants/simulation.constant';
import { ControlKey } from '../../models/simulation.model';
import { SimulationService } from '../../services/simulation.service';

/**
 * Starwizz control panel — sliders, format selector, animation
 * controls, and the recording trigger. All recording wiring (state
 * machine in `SimulationService`, including `toggleRecording`) is
 * preserved byte-identical from the previous implementation; only
 * the chrome is migrated to the Direction B Polished primitive family.
 */
@Component({
  selector: 'dba-sw-control-panel',
  standalone: true,
  imports: [
    MicroSliderComponent,
    SelectComponent,
    SwitchComponent,
    TextButtonComponent,
    IconComponent,
  ],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel {
  /** Shared simulation state + recording state machine. */
  protected readonly simService = inject(SimulationService);

  /** Rotate-ccw glyph rendered as leading icon on the reset buttons. */
  protected readonly rotateCcwIcon = rotateCcwIcon;
  /** Circle-help glyph rendered next to each control as the tooltip affordance. */
  protected readonly circleHelpIcon = circleHelpIcon;

  /** Tooltip text shown on the help icon next to the format selector. */
  protected readonly formatHelp =
    'Output dimensions for the recorded video. 9:16 vertical is best for stories and reels; 16:9 horizontal is best for YouTube.';
  /** Tooltip text shown on the help icon next to the "From beginning" switch. */
  protected readonly fromBeginningHelp =
    'When enabled, the animation resets to its initial position (zoom = 1.0, rotation = 0) before recording starts.';

  /** Slider control metadata (label, min/max/step/precision, etc.). */
  readonly controlConfig = CONTROLS;
  /** Stable list of control keys in render order. */
  readonly controlNames = Object.keys(CONTROLS) as ControlKey[];
  /** Format descriptors keyed by FormatKey. */
  readonly formats = FORMATS;
  /** Format groups mapped to <dba-ui-select> optgroups. */
  readonly formatOptions: readonly SelectItem[] = FORMAT_GROUPS.map((group) => ({
    label: group.label,
    options: group.keys.map((key) => ({ label: FORMATS[key].label, value: key })),
  }));

  /** Label rendered inside the record button — varies with recording state. */
  readonly buttonText = computed<string>(() => {
    const state = this.simService.recordingState();
    const duration = this.simService.recordingDuration();
    if (state === 'recording') return `Recording... (${duration}s)`;
    if (state === 'processing') return 'Processing...';
    return 'Start Recording (Max 30s)';
  });

  /** True when the record button is disabled (no image, mid-processing). */
  readonly isRecordDisabled = computed<boolean>(
    () => this.simService.recordingState() === 'processing' || !this.simService.isImageLoaded(),
  );

  /** Current recording state mirrored as a data-attribute-friendly signal. */
  readonly recordingState = computed(() => this.simService.recordingState());

  /** Updates the selected format after a select change. */
  updateFormat(value: string | number | boolean): void {
    this.simService.currentFormat.set(value as FormatKey);
  }

  /** Forwards a slider change to the simulation service. */
  updateControlValue(control: ControlKey, value: number): void {
    this.simService.updateControl(control, value);
  }

  /** Reads the current value of a slider control. */
  getControlValue(control: ControlKey): number {
    return this.simService.getControlValue(control);
  }

  /** Formatted value rendered alongside the slider label, respecting per-control precision. */
  formatControlValue(control: ControlKey): string {
    const value = this.simService.getControlValue(control);
    const precision = this.controlConfig[control].precision ?? 0;
    return value.toFixed(precision);
  }

  /** Delegates to {@link SimulationService.toggleRecording}. */
  toggleRecording(): void {
    this.simService.toggleRecording();
  }

  /** Restarts the animation without entering a recording session. */
  restartAnimation(): void {
    this.simService.restartAnimationRequested.set(true);
  }

  /** Restores all sliders to their default values. */
  resetParams(): void {
    this.simService.resetControlsToDefaults();
  }
}
