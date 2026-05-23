import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ConstellationLoaderComponent } from '../constellation-loader/constellation-loader.component';

/**
 * Surface card used by the hub for tool cards and dossier sections.
 * Renders a title (with optional logo), an optional subtitle, and a
 * content projection area. Styled to the Direction B Polished tokens:
 * `--db-color-surface` background, `--db-color-border` outline, no
 * neon glow. `clickable` adds a subtle hover lift + active-accent border.
 */
@Component({
  selector: 'dba-ui-card',
  standalone: true,
  imports: [ConstellationLoaderComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  /** Optional title rendered at the top of the card. */
  title = input<string>('');
  /** Optional subtitle rendered beneath the title. */
  subtitle = input<string>('');
  /** Optional logo image URL rendered next to the title. */
  logoSrc = input<string>('');
  /** When true, the card receives clickable affordances (cursor + hover). */
  clickable = input<boolean>(false);

  /** True once the logo image has loaded (or failed) — controls loader visibility. */
  readonly logoLoaded = signal(false);

  /** Marks the logo as loaded when the `<img>` `load` event fires. */
  onLogoLoad(): void {
    this.logoLoaded.set(true);
  }

  /** Marks the logo as loaded when the `<img>` `error` event fires. */
  onLogoError(): void {
    this.logoLoaded.set(true);
  }
}
