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
import { SimulationService } from './services/simulation.service';

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

  /** Whether the persistent record/stop button is disabled (no image, or processing). */
  protected readonly isMobileRecordDisabled = computed<boolean>(
    () => this.simService.recordingState() === 'processing' || !this.simService.isImageLoaded(),
  );

  /** Accessible label for the persistent record/stop button — varies with state. */
  protected readonly mobileRecordLabel = computed<string>(() =>
    this.simService.recordingState() === 'recording' ? 'Stop recording' : 'Start recording',
  );

  constructor() {
    let previousRecordingState = this.simService.recordingState();
    effect(() => {
      const current = this.simService.recordingState();
      if (previousRecordingState !== 'recording' && current === 'recording') {
        this.sheetExpanded.set(false);
      }
      previousRecordingState = current;
    });
  }

  /** Toggles the mobile floating sheet open/closed. */
  protected toggleSheet(): void {
    this.sheetExpanded.update((open) => !open);
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
