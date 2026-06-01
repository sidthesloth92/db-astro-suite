import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HeaderComponent } from '@db-astro-suite/ui';
import packageJson from '../../../../../../package.json';
import {
  ASTROGRAM_ABOUT_HREF,
  ASTROGRAM_BRAND_HREF,
  ASTROGRAM_GITHUB_HREF,
  ASTROGRAM_LOGO_SRC,
  ASTROGRAM_TAGLINE,
  ASTROGRAM_TITLE,
  ASTROGRAM_TITLE_ACCENT,
} from '../../constants/branding.constants';

/**
 * Astrogram top bar — a thin composition of the shared `<dba-ui-header>`
 * for brand identity and the GitHub / About links. Mode switching lives
 * inside the preview-context-bar (see `DesktopShellComponent`).
 */
@Component({
  selector: 'dba-ag-top-bar',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './astrogram-top-bar.component.html',
  styleUrl: './astrogram-top-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AstrogramTopBarComponent {
  /** When true, applies the compact paddings expected by the mobile shell. */
  readonly isCompact = input<boolean>(false);

  /** App version surfaced as a small pill next to the brand title. */
  readonly version: string = packageJson.version || '0.0.0';

  /** Brand title (wordmark) forwarded to `<dba-ui-header>`. */
  readonly title = ASTROGRAM_TITLE;
  /** Accent-coloured trailing portion of the wordmark ("gram"). */
  readonly titleAccent = ASTROGRAM_TITLE_ACCENT;
  /** Brand tagline rendered on desktop next to the wordmark. */
  readonly tagline = ASTROGRAM_TAGLINE;
  /** Brand logo image path. */
  readonly logoSrc = ASTROGRAM_LOGO_SRC;
  /** Brand link target (logo + title). */
  readonly logoLink = ASTROGRAM_BRAND_HREF;
  /** External GitHub link rendered as an icon button on the right. */
  readonly githubLink = ASTROGRAM_GITHUB_HREF;
  /** External "About me" link rendered next to the GitHub icon. */
  readonly aboutLink = ASTROGRAM_ABOUT_HREF;
}
