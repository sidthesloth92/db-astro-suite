import { ChangeDetectionStrategy, Component } from '@angular/core';
import packageJson from '../../../../../package.json';

/**
 * Hub footer for the Direction B Polished theme. Renders the brand line,
 * coordinates strip, and external links. APIs preserved from the previous
 * implementation; only the visual treatment is updated to the new tokens.
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
}
