import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  BreakpointService,
  ConstellationFieldComponent,
  SharePromptComponent,
  SharePromptService,
} from '@db-astro-suite/ui';
import { DesktopShellComponent } from './layout/desktop-shell/desktop-shell.component';
import { MobileShellComponent } from './layout/mobile-shell/mobile-shell.component';

/**
 * Root astrogram page. Picks the appropriate shell (desktop or mobile)
 * based on the current viewport width and renders it inside the animated
 * constellation-field background, plus the post-export share prompt.
 * Everything else lives in the shells.
 */
@Component({
  selector: 'dba-ag-root',
  standalone: true,
  imports: [
    ConstellationFieldComponent,
    DesktopShellComponent,
    MobileShellComponent,
    SharePromptComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly breakpoint = inject(BreakpointService);

  /** True when the viewport is below `MOBILE_BREAKPOINT_PX`. */
  readonly isMobile = this.breakpoint.isMobile;

  /** Post-export share prompt state, bound to `dba-ui-share-prompt`. */
  protected readonly sharePrompt = inject(SharePromptService);
}
