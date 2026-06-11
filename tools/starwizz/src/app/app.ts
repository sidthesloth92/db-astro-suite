import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  BreakpointService,
  FloatingSheetComponent,
  HeaderComponent,
  IconButtonComponent,
  IconComponent,
  VideoLightboxComponent,
  slidersIcon,
} from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';
import {
  DEFAULT_RECORDING_PRESET,
  MAX_RECORDING_SECONDS,
  RECORDING_PRESETS,
  RECORDING_PRESET_TAB_ORDER,
} from './constants/recording.constant';
import { QualityPickerItem } from './models/quality-picker-item.model';
import { RecordingPreset } from './models/recording.model';
import { SimulationService } from './services/simulation.service';
import {
  computeRecordingBitsPerSecond,
  estimateRecordingSizeMb,
} from './utils/recording-size.util';

/** Selector used to detect whether a pointer gesture started on a slider. */
const SLIDER_TARGET_SELECTOR = 'dba-ui-micro-slider';

/**
 * Starwizz root shell. On desktop it lays out the simulator and the
 * control panel side-by-side. On mobile (≤1079px — covers all common
 * tablet portrait widths) it puts the simulator full-bleed and exposes
 * the control panel through a floating bottom sheet, with a persistent
 * record/stop icon button at the bottom-right so recording can be
 * started or stopped at any time.
 */
@Component({
  selector: 'dba-sw-root',
  standalone: true,
  imports: [
    ControlPanel,
    Simulator,
    HeaderComponent,
    FloatingSheetComponent,
    IconButtonComponent,
    IconComponent,
    VideoLightboxComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** App title (legacy — preserved for any downstream consumer). */
  protected readonly title = signal('starwizz');
  /** Application version pulled from the workspace `package.json`. */
  readonly appVersion = packageJson.version || '1.0.0';

  /** Viewport breakpoint signal — drives the desktop vs. mobile shell. */
  protected readonly breakpoints = inject(BreakpointService);
  /** Recording state machine — used to auto-collapse the sheet on record start. */
  protected readonly simService = inject(SimulationService);

  /** Whether the mobile floating sheet is currently expanded. */
  protected readonly sheetExpanded = signal(false);

  /** Whether the "watch the demo" video lightbox is open. */
  protected readonly isDemoOpen = signal(false);

  /** Whether the user is actively adjusting a control — drives the ghost-opacity state. */
  protected readonly isAdjusting = signal(false);

  /** Sliders glyph rendered inside the mobile "Controls" launcher button. */
  protected readonly slidersIcon = slidersIcon;

  /** Maximum recording length (seconds), shown in the quality popup title. */
  protected readonly maxRecordingSeconds = MAX_RECORDING_SECONDS;

  /** Whether the persistent record/stop button is disabled (no image, or processing). */
  protected readonly isMobileRecordDisabled = computed<boolean>(
    () => this.simService.recordingState() === 'processing' || !this.simService.isImageLoaded(),
  );

  /** Accessible label for the persistent record/stop button — varies with state. */
  protected readonly mobileRecordLabel = computed<string>(() =>
    this.simService.recordingState() === 'recording' ? 'Stop recording' : 'Start recording',
  );

  /**
   * Whether the quality popup (shown above the record button) is open.
   * Tapping the record button while idle opens it; picking a quality records.
   */
  protected readonly isQualityPickerOpen = signal(false);

  /**
   * Quality rows for the record-button popup, with a live file-size estimate
   * for the current format. Order runs low→high so the menu reads as a dial.
   */
  protected readonly qualityPickerItems = computed<readonly QualityPickerItem[]>(() => {
    const { width, height } = this.simService.canvasDimensions();
    return RECORDING_PRESET_TAB_ORDER.map((key) => {
      const preset = RECORDING_PRESETS[key];
      const bitsPerSecond = computeRecordingBitsPerSecond(width, height, preset);
      return {
        preset: key,
        label: preset.shortLabel,
        sizeMb: estimateRecordingSizeMb(bitsPerSecond, MAX_RECORDING_SECONDS),
        isRecommended: key === DEFAULT_RECORDING_PRESET,
      };
    });
  });

  constructor() {
    let previousRecordingState = this.simService.recordingState();
    effect(() => {
      const current = this.simService.recordingState();
      if (previousRecordingState !== 'recording' && current === 'recording') {
        this.sheetExpanded.set(false);
        this.isQualityPickerOpen.set(false);
      }
      previousRecordingState = current;
    });
  }

  /** Toggles the mobile floating sheet open/closed. */
  protected toggleSheet(): void {
    this.sheetExpanded.update((open) => !open);
  }

  /**
   * Record-button press handler. While recording, stops it. While idle,
   * opens (or closes) the quality popup instead of recording immediately —
   * the user picks a quality, which then starts the recording.
   */
  protected onMobileRecordPress(): void {
    if (this.simService.recordingState() === 'recording') {
      this.simService.toggleRecording();
      return;
    }
    this.isQualityPickerOpen.update((open) => !open);
  }

  /** Closes the quality popup without starting a recording. */
  protected closeQualityPicker(): void {
    this.isQualityPickerOpen.set(false);
  }

  /** Applies the chosen quality preset and immediately starts recording. */
  protected chooseQualityAndRecord(preset: RecordingPreset): void {
    this.simService.recordingPreset.set(preset);
    this.isQualityPickerOpen.set(false);
    this.simService.toggleRecording();
  }

  /**
   * Pointer pressed inside the sheet — ghost the panel so the simulation
   * is visible, but only when the gesture started on a slider. Other
   * controls (reset buttons, switches, the format dropdown) should not
   * fade the panel out.
   */
  protected onAdjustStart(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(SLIDER_TARGET_SELECTOR)) {
      return;
    }
    this.isAdjusting.set(true);
  }

  /** Pointer released — restore the panel opacity immediately. */
  protected onAdjustEnd(): void {
    this.isAdjusting.set(false);
  }
}
