import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { GithubIconComponent } from '../icons/github.icon.component';

/** Mobile breakpoint, in px, below which the header switches to its compact layout. */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * Application header bar used by the suite apps (Starwizz, Astrogram, etc.).
 *
 * Renders the brand (logo + title + optional version pill + optional tagline)
 * on the left, a `[slot=center]` content-projection region in the middle
 * (typically for mode tabs), and the actions cluster on the right (About
 * link + optional GitHub icon button). The layout collapses the tagline and
 * shrinks the version pill below the mobile breakpoint.
 */
@Component({
  selector: 'dba-ui-header',
  standalone: true,
  imports: [IconButtonComponent, GithubIconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  /** Brand title text shown next to the logo. */
  title = input<string>('App Name');
  /** Optional version string rendered in the pill next to the title. */
  version = input<string>('');
  /** Optional logo image URL rendered to the left of the title. */
  logoSrc = input<string>('');
  /** Destination for the brand link (logo + title). Defaults to '/'. */
  logoLink = input<string>('');
  /** Optional GitHub URL — renders a GitHub icon button when non-empty. */
  githubLink = input<string>('');
  /** Destination for the "About" text link. Defaults to the author's site. */
  aboutLink = input<string>('https://dineshbalajiv.com');
  /** Optional tagline rendered next to the title on desktop only. */
  tagline = input<string>('');

  /** Whether the viewport is currently below the mobile breakpoint. */
  readonly isMobile = signal<boolean>(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const update = (): void => this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT_PX);
    update();
    window.addEventListener('resize', update);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', update));
  }
}
