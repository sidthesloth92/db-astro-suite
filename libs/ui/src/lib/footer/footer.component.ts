import { ChangeDetectionStrategy, Component } from '@angular/core';
import packageJson from '../../../../../package.json';
import { SUITE_HOME_URL, SUITE_LICENSE_URL } from '../constants/suite-links.constants';

/**
 * Hub footer for the Direction B Polished theme. Renders the brand line
 * (linked to the suite home page), coordinates strip, external links, and the
 * copyright and AGPL-3.0 license line.
 */
@Component({
  selector: 'dba-ui-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  /** Application version rendered next to the brand line. */
  readonly footerVersion: string = packageJson.version || '1.0.0';

  /** Destination of the "DB ASTRO SUITE" brand link (the suite hub). */
  protected readonly suiteHomeUrl = SUITE_HOME_URL;

  /** Destination of the "AGPL-3.0" license link. */
  protected readonly licenseUrl = SUITE_LICENSE_URL;
}
