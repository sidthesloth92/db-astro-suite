import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { githubIcon } from '../icons/github.icon';
import { MOBILE_BREAKPOINT_PX } from '../services/breakpoint.service';
import { PillBadgeComponent } from '../pill-badge/pill-badge.component';

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
  imports: [IconComponent, PillBadgeComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  /** Brand title text shown next to the logo. */
  title = input<string>('App Name');
  /**
   * Optional trailing portion of the title to render in the accent colour
   * (e.g. `'GRAM'` for `'ASTROGRAM'`, `'WIZZ'` for `'STARWIZZ'`), with the
   * leading portion shown in white. When empty or not a suffix of the title,
   * the whole title renders in the accent colour as before.
   */
  titleAccent = input<string>('');
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

  /**
   * Title split into a white `base` and an accent-coloured `accent` suffix.
   * `accent` is empty unless {@link titleAccent} is a non-empty suffix of the
   * title — in which case the whole title falls back to the accent colour.
   */
  readonly titleParts = computed<{ base: string; accent: string }>(() => {
    const title = this.title();
    const accent = this.titleAccent();
    if (accent && title.endsWith(accent)) {
      return { base: title.slice(0, title.length - accent.length), accent };
    }
    return { base: title, accent: '' };
  });

  /** GitHub glyph used by the optional GitHub icon button. */
  protected readonly githubIcon = githubIcon;

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // `afterNextRender` only runs in the browser, so no platform guard is
    // needed. The listener is torn down via `DestroyRef.onDestroy` to keep
    // the component leak-free.
    afterNextRender(() => {
      const update = (): void =>
        this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT_PX);
      update();
      window.addEventListener('resize', update);
      this.destroyRef.onDestroy(() =>
        window.removeEventListener('resize', update),
      );
    });
  }
}
