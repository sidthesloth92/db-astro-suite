import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IconButtonComponent,
  MicroSliderComponent,
  RotateCcwIconComponent,
  SelectComponent,
  SwitchComponent,
  TextButtonComponent,
  UploadIconComponent,
  type SelectOption,
} from '@db-astro-suite/ui';
import { ASPECT_RATIOS, AspectRatioKey, CONTROLS } from '../../constants/simulation.constant';
import { ControlKey } from '../../models/simulation.model';
import { SimulationService } from '../../services/simulation.service';

/**
 * Starwizz control panel — sliders, aspect-ratio selector, animation
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
    IconButtonComponent,
    UploadIconComponent,
    RotateCcwIconComponent,
  ],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel {
  /** Shared simulation state + recording state machine. */
  protected readonly simService = inject(SimulationService);

  /** Slider control metadata (label, min/max/step/precision, etc.). */
  readonly controlConfig = CONTROLS;
  /** Stable list of control keys in render order. */
  readonly controlNames = Object.keys(CONTROLS) as ControlKey[];
  /** Aspect ratio descriptors keyed by AspectRatioKey. */
  readonly aspectRatios = ASPECT_RATIOS;
  /** Aspect ratio keys mapped to <dba-ui-select> options. */
  readonly ratioOptions: readonly SelectOption[] = (
    Object.keys(ASPECT_RATIOS) as AspectRatioKey[]
  ).map((key) => ({ label: ASPECT_RATIOS[key].label, value: key }));

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

  /** Updates the aspect ratio after a select change. */
  updateAspectRatio(value: string | number | boolean): void {
    this.simService.currentAspectRatio.set(value as AspectRatioKey);
  }

  /** Forwards a slider change to the simulation service. */
  updateControlValue(control: ControlKey, value: number): void {
    this.simService.updateControl(control, value);
  }

  /** Reads the current value of a slider control. */
  getControlValue(control: ControlKey): number {
    return this.simService.getControlValue(control);
  }

  /**
   * Toggles the recording state machine. Byte-identical to the previous
   * implementation — do not modify without smoke-testing record + download.
   */
  toggleRecording(): void {
    const currentState = this.simService.recordingState();
    if (currentState === 'idle') {
      if (this.simService.recordFromBeginning()) {
        // Request animation reset before recording starts
        this.simService.resetAndRecordRequested.set(true);
      } else {
        // Start recording from current position
        this.simService.recordingState.set('recording');
      }
    } else if (currentState === 'recording') {
      this.simService.recordingState.set('idle');
    }
  }

  /** Restarts the animation without entering a recording session. */
  restartAnimation(): void {
    this.simService.restartAnimationRequested.set(true);
  }

  /** Restores all sliders to their default values. */
  resetParams(): void {
    this.simService.resetControlsToDefaults();
  }

  /**
   * Forwards a file selection from the upload icon-button to the simulation
   * service. Wired identically to the previous overlay implementation.
   */
  onUploadInput(event: Event): void {
    this.simService.handleImageUpload(event);
  }
}
