import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MarkVariant } from '../../models/celestory-mark.types';
import { CelestoryMarkComponent } from '../celestory-mark/celestory-mark.component';

/**
 * The Celestory wordmark lockup: the brand mark beside the "Cele**story**"
 * logotype, optionally prefixed (e.g. "Vera C's Celestory" for a profile hero).
 * Purely presentational — wrap it in a link/heading at the call site.
 */
@Component({
  selector: 'dba-celestory-wordmark',
  standalone: true,
  imports: [CelestoryMarkComponent],
  templateUrl: './celestory-wordmark.component.html',
  styleUrl: './celestory-wordmark.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelestoryWordmarkComponent {
  /** Size of the brand mark in CSS pixels. */
  readonly markSize = input<number>(26);
  /** Font size of the logotype in CSS pixels. */
  readonly fontSize = input<number>(21);
  /** Optional possessive prefix shown before "Celestory" (e.g. "Vera C's"). */
  readonly prefix = input<string>('');
  /** Which mark composition to show beside the logotype. */
  readonly markVariant = input<MarkVariant>('icon');
  /** Play the mark's launch animation (browser only). */
  readonly animated = input<boolean>(false);
}
