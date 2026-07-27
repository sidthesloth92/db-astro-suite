import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  BreakpointService,
  FloatingSheetComponent,
  HeaderComponent,
  IconButtonComponent,
  IconComponent,
  slidersIcon,
} from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import { SLIDER_TARGET_SELECTOR } from './constants/mobile-shell.constants';
import { ControlPanel } from './components/control-panel/control-panel';
import { SpikeStage } from './components/spike-stage/spike-stage';

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
    IconButtonComponent,
    IconComponent,
    SpikeStage,
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

  /** Whether the mobile controls sheet is open. */
  protected readonly sheetExpanded = signal(false);

  /**
   * True while a slider inside the sheet is being dragged, which fades the
   * sheet so the user can watch the canvas update underneath it.
   */
  protected readonly isAdjusting = signal(false);

  /** Glyph for the button that opens the mobile controls sheet. */
  protected readonly slidersIcon = slidersIcon;

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
}
