import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, globeIcon } from '@db-astro-suite/ui';

/**
 * Blocking alert shown when Starwizz is opened inside an app's embedded
 * browser (e.g. from an Instagram link). Those browsers silently drop the
 * recording download, so the alert has no dismiss: it sends the user to
 * their own browser, by link where the platform offers one and by
 * instruction always.
 */
@Component({
  selector: 'dba-sw-in-app-browser-alert',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './in-app-browser-alert.html',
  styleUrl: './in-app-browser-alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InAppBrowserAlert {
  /** Display name of the app whose embedded browser the page is running in. */
  readonly appName = input.required<string>();
  /** Link that reopens the page in the device's own browser, or null when none exists. */
  readonly externalBrowserUrl = input.required<string | null>();

  /** Globe glyph heading the alert. */
  protected readonly globeIcon = globeIcon;
}
