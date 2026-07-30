import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  BreakpointService,
  FloatingSheetComponent,
  HeaderComponent,
  IconButtonComponent,
  IconComponent,
  STORAGE_SERVICE_TOKEN,
  TextButtonComponent,
  circleHelpIcon,
  slidersIcon,
} from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import { HOW_TO_DISMISSED_KEY } from './constants/how-to.constants';
import { SLIDER_TARGET_SELECTOR } from './constants/mobile-shell.constants';
import { HowToOverlay } from './components/how-to-overlay/how-to-overlay';
import { ControlPanel } from './components/control-panel/control-panel';
import { SpikeStage } from './components/spike-stage/spike-stage';
import { SpikeEditorService } from './services/spike-editor.service';

/**
 * AstroSpike root shell.
 *
 * On desktop it renders a two-pane studio: the preview stage on the left and
 * the controls pane on the right, mirroring the starwizz layout. Below the
 * mobile breakpoint the stage goes full-bleed and the same controls move into
 * a floating sheet opened from a button, so the canvas is never buried.
 */
@Component({
  selector: 'dba-as-root',
  standalone: true,
  imports: [
    ControlPanel,
    FloatingSheetComponent,
    HeaderComponent,
    HowToOverlay,
    IconButtonComponent,
    IconComponent,
    SpikeStage,
    TextButtonComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Application version pulled from the workspace `package.json`. */
  readonly version = packageJson.version || '1.0.0';

  /** Viewport breakpoint signal — drives the desktop vs. mobile shell. */
  protected readonly breakpoints = inject(BreakpointService);

  /** Shared editor state — drives the title-bar actions and pane visibility. */
  protected readonly editor = inject(SpikeEditorService);

  /** Whether the mobile controls sheet is open. */
  protected readonly sheetExpanded = signal(false);

  /**
   * Effect: opening a star's controls opens the sheet on mobile. The controls
   * are docked in the pane, and the pane lives inside the sheet down here, so
   * without this a double-tap on a star would look like it did nothing.
   */
  private readonly _revealSheetForStar = effect(() => {
    if (this.editor.starControlsId() !== null && this.breakpoints.isMobile()) {
      this.sheetExpanded.set(true);
    }
  });

  /**
   * True while a slider inside the sheet is being dragged, which fades the
   * sheet so the user can watch the canvas update underneath it.
   */
  protected readonly isAdjusting = signal(false);

  /** Glyph for the button that opens the mobile controls sheet. */
  protected readonly slidersIcon = slidersIcon;

  /** Glyph on the mobile how-to button. */
  protected readonly circleHelpIcon = circleHelpIcon;

  /** Browser storage, read once to decide whether to greet a new visitor. */
  private readonly storage = inject(STORAGE_SERVICE_TOKEN);

  /**
   * Whether the how-to overlay is showing. It opens unprompted on a first
   * visit — the canvas interactions are not guessable — and is reachable from
   * the title bar forever after.
   */
  protected readonly isHowToOpen = signal(this.storage.getItem(HOW_TO_DISMISSED_KEY) === null);

  /**
   * True while the inspector has anything to inspect. With no image every
   * control would act on nothing, so the stage takes the whole width instead of
   * sitting beside a pane of dead sliders.
   */
  protected readonly hasInspector = computed(
    () => this.editor.hasImage() || this.editor.isImageLoading() || this.editor.isDetecting(),
  );

  /** Opens or closes the mobile controls sheet. */
  protected toggleSheet(): void {
    this.sheetExpanded.update((expanded) => !expanded);
  }

  /** Fades the sheet when a drag starts on one of its sliders. */
  protected onAdjustStart(event: PointerEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest(SLIDER_TARGET_SELECTOR) !== null) {
      this.isAdjusting.set(true);
    }
  }

  /** Restores the sheet once the slider drag ends. */
  protected onAdjustEnd(): void {
    this.isAdjusting.set(false);
  }

  /** Opens the how-to overlay from the title bar. */
  protected onOpenHowTo(): void {
    this.isHowToOpen.set(true);
  }

  /** Dismisses the how-to overlay. */
  protected onCloseHowTo(): void {
    this.isHowToOpen.set(false);
  }

  /** Returns every control and per-star edit to its default. */
  protected onReset(): void {
    this.editor.resetAll();
  }
}
