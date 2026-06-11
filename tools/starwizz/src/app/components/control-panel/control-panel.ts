import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import {
  IconComponent,
  MicroSliderComponent,
  SegmentedTabsComponent,
  SelectComponent,
  SplitButtonComponent,
  SwitchComponent,
  TextButtonComponent,
  TooltipDirective,
  circleHelpIcon,
  playCircleIcon,
  rotateCcwIcon,
  type SegmentedTabOption,
  type SelectItem,
  type SplitButtonMenuItem,
} from '@db-astro-suite/ui';
import {
  MAX_RECORDING_SECONDS,
  RECORDING_PRESETS,
  RECORDING_PRESET_ORDER,
  RECORDING_PRESET_TAB_ORDER,
} from '../../constants/recording.constant';
import {
  CONTROLS,
  DIRECTION_OPTIONS,
  FORMATS,
  FORMAT_GROUPS,
  FormatKey,
  MAX_ZOOM,
  MIN_SCALE,
  PATH_DURATION_MAX,
  PATH_DURATION_MIN,
  PATH_SPEED_MAX,
  PATH_SPEED_MIN,
  PATH_SPEED_STEP,
  STAR_ANGLE_MAX,
  STAR_ANGLE_MIN,
  STAR_ANGLE_STEP,
} from '../../constants/simulation.constant';
import { RecordingPreset } from '../../models/recording.model';
import { ControlKey, TravelDirection } from '../../models/simulation.model';
import { SimulationService } from '../../services/simulation.service';
import {
  computeRecordingBitsPerSecond,
  estimateRecordingSizeMb,
} from '../../utils/recording-size.util';

/** Generic slider controls hidden while the cinematic Custom Path mode is active. */
const PATH_HIDDEN_CONTROLS: ReadonlySet<ControlKey> = new Set<ControlKey>([
  'zoomRate',
  'rotationRate',
  'shootingStarSpeed',
]);

/**
 * Starwizz control panel — sliders, format selector, travel-direction /
 * Custom Path controls, and the recording trigger. Recording wiring (the
 * state machine in `SimulationService`, including `toggleRecording`) is
 * preserved; the Custom Path section is shown only when the `path` direction
 * is selected.
 */
@Component({
  selector: 'dba-sw-control-panel',
  standalone: true,
  imports: [
    MicroSliderComponent,
    SegmentedTabsComponent,
    SelectComponent,
    SplitButtonComponent,
    SwitchComponent,
    TextButtonComponent,
    IconComponent,
    TooltipDirective,
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
  /** Play glyph for the "watch the demo" button in the panel header. */
  protected readonly playCircleIcon = playCircleIcon;

  /** Emitted when the user clicks the panel-header "watch the demo" button. */
  readonly demoRequested = output<void>();

  /** Tooltip text shown on the help icon next to the format selector. */
  protected readonly formatHelp =
    'Output dimensions for the recorded video. 9:16 vertical is best for stories and reels; 16:9 horizontal is best for YouTube.';
  /** Tooltip text shown on the help icon next to the direction selector. */
  protected readonly directionHelp =
    'How the camera moves. Forward/Backward fly into or away from the scene; Left/Right/Up/Down drift sideways with parallax; Custom Path (A→B) glides between two framings you set.';
  /** Tooltip text shown on the help icon next to the Custom Path section. */
  protected readonly pathHelp =
    'Build a camera move between two framings:\n' +
    '• Frame the start view — drag to pan, scroll/Zoom slider to zoom\n' +
    '• Click "Set Start A" to save it\n' +
    '• Reframe (pan/zoom) for the end view\n' +
    '• Click "Set End B" to save it\n' +
    '• Click "Set Path" — the camera glides A→B and loops\n' +
    '• Tune Camera Speed or Duration to change the pace\n' +
    '• "Reset Points" clears A & B; "Edit Path" re-opens them';
  /** Tooltip for the Custom Path Camera Speed slider. */
  protected readonly cameraSpeedHelp =
    'How fast the camera travels from A to B. Linked to Duration — this is the cinematic move, separate from how fast the stars move (Star Speed).';
  /** Tooltip for the Custom Path Duration slider. */
  protected readonly durationHelp =
    'Total time for the A→B camera move. Linked to Camera Speed.';
  /** Tooltip text shown on the help icon next to the Sideways-drift control. */
  protected readonly starDriftHelp =
    'Stars normally fly in/out when the path zooms, or drift along the path when it pans. Turn this on to make the stars drift sideways at a custom angle instead.';

  /**
   * Whether the Sideways-drift control (toggle + angle slider) is shown. The
   * feature stays fully wired; lateral drift is still derived from the A→B path
   * regardless. Flip to `true` to expose the manual control again.
   */
  protected readonly showSidewaysDrift = false;
  /** Tooltip text shown on the help icon next to the "From beginning" switch. */
  protected readonly fromBeginningHelp =
    'When enabled, the animation resets to its initial position before recording starts.';
  /** Tooltip text shown on the help icon next to the "Shooting Stars" switch. */
  protected readonly shootingStarsHelp =
    'Turn the occasional shooting-star streaks on or off. When off, the Shooting Star Speed slider is hidden.';

  /** Maximum recording length (seconds), shown next to the mobile quality pills. */
  readonly maxRecordingSeconds = MAX_RECORDING_SECONDS;

  /** Slider control metadata (label, min/max/step/precision, etc.). */
  readonly controlConfig = CONTROLS;
  /** Stable list of all control keys in render order. */
  readonly controlNames = Object.keys(CONTROLS) as ControlKey[];
  /** Format descriptors keyed by FormatKey. */
  readonly formats = FORMATS;
  /** Format groups mapped to <dba-ui-select> optgroups. */
  readonly formatOptions: readonly SelectItem[] = FORMAT_GROUPS.map((group) => ({
    label: group.label,
    options: group.keys.map((key) => ({ label: FORMATS[key].label, value: key })),
  }));
  /** Travel-direction options for the <dba-ui-select>. */
  readonly directionOptions: readonly SelectItem[] = DIRECTION_OPTIONS;

  // Custom Path slider bounds (exposed for template binding).
  /** Zoom slider lower bound (image just covers the frame). */
  readonly zoomMin = MIN_SCALE;
  /** Zoom slider upper bound. */
  readonly zoomMax = MAX_ZOOM;
  /** Zoom slider step. */
  readonly zoomStep = 0.05;
  /** Travel-speed slider bounds/step (world px per second). */
  readonly speedMin = PATH_SPEED_MIN;
  readonly speedMax = PATH_SPEED_MAX;
  readonly speedStep = PATH_SPEED_STEP;
  /** Duration slider bounds/step (seconds). */
  readonly durationMin = PATH_DURATION_MIN;
  readonly durationMax = PATH_DURATION_MAX;
  readonly durationStep = 0.5;
  /** Sideways-drift angle slider bounds/step (degrees). */
  readonly angleMin = STAR_ANGLE_MIN;
  readonly angleMax = STAR_ANGLE_MAX;
  readonly angleStep = STAR_ANGLE_STEP;

  /** Control keys to render as sliders, filtered for the active mode and toggles. */
  readonly visibleControlNames = computed<ControlKey[]>(() => {
    const pathMode = this.simService.isPathMode();
    const shootingStarsOn = this.simService.shootingStarsEnabled();
    return this.controlNames.filter((key) => {
      if (pathMode && PATH_HIDDEN_CONTROLS.has(key)) {
        return false;
      }
      // The Shooting Star Speed slider is meaningless while shooting stars are off.
      if (key === 'shootingStarSpeed' && !shootingStarsOn) {
        return false;
      }
      return true;
    });
  });

  /** Label rendered inside the record button — varies with recording state. */
  readonly buttonText = computed<string>(() => {
    const state = this.simService.recordingState();
    const duration = this.simService.recordingDuration();
    if (state === 'recording') return `Recording... (${duration}s)`;
    if (state === 'processing') return 'Processing...';
    const preset = RECORDING_PRESETS[this.simService.recordingPreset()];
    return `Start Recording · ${MAX_RECORDING_SECONDS}s · ${preset.label}`;
  });

  /** True when the record button is disabled (no image, mid-processing). */
  readonly isRecordDisabled = computed<boolean>(
    () => this.simService.recordingState() === 'processing' || !this.simService.isImageLoaded(),
  );

  /** True while a recording session is running or finalising. */
  readonly isRecordingActive = computed<boolean>(
    () => this.simService.recordingState() !== 'idle',
  );

  /**
   * Quality-preset rows for the record split-button menu, with a live file
   * size estimate (full-length clip) for the currently selected format.
   */
  readonly presetMenuItems = computed<readonly SplitButtonMenuItem[]>(() => {
    const { width, height } = this.simService.canvasDimensions();
    return RECORDING_PRESET_ORDER.map((key) => {
      const preset = RECORDING_PRESETS[key];
      const bitsPerSecond = computeRecordingBitsPerSecond(width, height, preset);
      const sizeMb = estimateRecordingSizeMb(bitsPerSecond, MAX_RECORDING_SECONDS);
      return {
        value: key,
        label: preset.label,
        description: preset.description,
        detail: `~${sizeMb} MB`,
      };
    });
  });

  /**
   * Quality-preset pills for the compact mobile selector (the split-button
   * menu is hidden in the mobile sheet). Low→high quality order; the tooltip
   * carries the full preset description.
   */
  readonly presetTabs: readonly SegmentedTabOption[] = RECORDING_PRESET_TAB_ORDER.map((key) => ({
    id: key,
    label: RECORDING_PRESETS[key].shortLabel,
    tooltip: RECORDING_PRESETS[key].description,
  }));

  /** Estimated file size (MB) of a full-length clip at the selected preset/format. */
  readonly selectedPresetSizeMb = computed<number>(() => {
    const { width, height } = this.simService.canvasDimensions();
    const preset = RECORDING_PRESETS[this.simService.recordingPreset()];
    const bitsPerSecond = computeRecordingBitsPerSecond(width, height, preset);
    return estimateRecordingSizeMb(bitsPerSecond, MAX_RECORDING_SECONDS);
  });

  /** Current recording state mirrored as a data-attribute-friendly signal. */
  readonly recordingState = computed(() => this.simService.recordingState());

  /** Live zoom of the framing the user is composing. */
  readonly liveZoom = computed<number>(() => this.simService.liveCamera().scale);

  /** Current travel speed (world px/sec), rounded for display. */
  readonly speedValue = computed<number>(() => Math.round(this.simService.pathSpeed()));

  /** Current A→B duration (seconds), derived from speed + distance, for display. */
  readonly durationValue = computed<number>(
    () => Math.round(this.simService.pathDurationSeconds() * 10) / 10,
  );

  /** Updates the selected format after a select change. */
  updateFormat(value: string | number | boolean): void {
    this.simService.currentFormat.set(value as FormatKey);
  }

  /** Updates the camera travel direction after a select change. */
  updateDirection(value: string | number | boolean): void {
    this.simService.updateDirection(value as TravelDirection);
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

  // ==================== Custom Path controls ====================

  /** Zooms the live framing (path mode). */
  updateZoom(value: number): void {
    this.simService.updateLiveCamera({ scale: value });
  }

  /** Sets the travel speed; the displayed duration recomputes from it. */
  updateSpeed(value: number): void {
    this.simService.pathSpeed.set(value);
  }

  /** Sets the duration; speed is derived (the linked side of the pair). */
  updateDuration(value: number): void {
    this.simService.setPathDuration(value);
  }

  /** Captures the current framing as Start (A). */
  setStart(): void {
    this.simService.setCameraStart();
  }

  /** Captures the current framing as End (B). */
  setEnd(): void {
    this.simService.setCameraEnd();
  }

  /** Fixes the path (locks A & B) and starts the continuous A↔B loop. */
  fixPath(): void {
    this.simService.finalizePath();
  }

  /** Unlocks the path so Start/End can be recaptured. */
  editPath(): void {
    this.simService.editPath();
  }

  /** Clears the path points (A & B) so the user can start over. */
  resetPoints(): void {
    this.simService.resetPath();
  }

  /** Toggles the optional sideways star drift. */
  setStarLateral(on: boolean): void {
    this.simService.setStarLateral(on);
  }

  /** Sets the sideways-drift angle (degrees). */
  updateStarDirection(value: number): void {
    this.simService.updateStarDirection(value);
  }

  /** Delegates to {@link SimulationService.toggleRecording}. */
  toggleRecording(): void {
    this.simService.toggleRecording();
  }

  /** Applies a quality preset chosen from the record split-button menu. */
  selectPreset(value: string): void {
    if (value in RECORDING_PRESETS) {
      // Narrowing is safe: membership in RECORDING_PRESETS proves the key.
      this.simService.recordingPreset.set(value as RecordingPreset);
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
}
